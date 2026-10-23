"""Normalize the four installed queries using responses observed for 3514030.

These field names came from live responses, not GSQL. Raw SDK result lists are
kept verbatim; absent fields never become zeros or invented fraud signals.
"""

import math
import json
from datetime import datetime, timezone
from typing import Any

from config.tigergraph import TigerGraphConfigError
from tools.tigergraph_client import INSTALLED_QUERIES, TigerGraphClient, TigerGraphClientError


MAX_VISUALIZATION_EDGES = 200
EDGE_SOURCE = "pyTigerGraph.getEdges"
EDGE_ENDPOINT_PAIRS = {
    "MADE": frozenset({frozenset({"Card", "Transaction"})}),
    "OWNS": frozenset({frozenset({"Card", "Customer"})}),
    "FROM_DEVICE": frozenset({frozenset({"Transaction", "DeviceProfile"})}),
    "PURCHASER_EMAIL": frozenset({frozenset({"Transaction", "EmailDomain"})}),
    "BILLED_IN": frozenset({frozenset({"Transaction", "BillingRegion"})}),
}


RELATIONSHIPS = {
    "@@customers": "connected_customers",
    "@@cards": "connected_cards",
    "@@devices": "connected_devices",
    "@@emails": "connected_emails",
    "@@regions": "connected_regions",
    "@@related_txns": "related_transactions",
}
SUMMARY = {
    "@@related_count": "related_count",
    "@@high_risk_count": "high_risk_count",
    "@@medium_high_risk_count": "medium_high_risk_count",
    "@@online_count": "online_count",
    "@@small_amount_count": "small_amount_count",
    "@@total_amount": "total_related_amount",
    "@@max_amount": "maximum_related_amount",
}
PATTERNS = {
    "@@small_online": "small_online_count",
    "@@online_total": "online_count",
    "@@small_online_amount": "small_online_amount",
    "@@high_risk": "high_risk_count",
    "@@medium_high_risk": "medium_high_risk_count",
    "@@largest_amount": "largest_related_amount",
}
VELOCITY = {
    "@@within_1h": "within_1h",
    "@@within_6h": "within_6h",
    "@@within_24h": "within_24h",
    "@@amount_1h": "amount_1h",
    "@@amount_6h": "amount_6h",
    "@@amount_24h": "amount_24h",
}
MAPPINGS = {
    "investigate_transaction": (None, RELATIONSHIPS),
    "risk_pattern_summary": ("pattern_assessment", SUMMARY),
    "detect_fraud_patterns": ("fraud_pattern_signals", PATTERNS),
    "transaction_velocity": ("velocity", VELOCITY),
}


def normalize_query(query_name: str, results: list[dict]) -> dict[str, Any]:
    _, mapping = MAPPINGS[query_name]
    values = {}
    if not isinstance(results, list) or not all(isinstance(item, dict) for item in results):
        raise TigerGraphClientError("response_shape", "Expected a list of query output objects.")
    for item in results:
        for key, value in item.items():
            if key in values:
                raise TigerGraphClientError("response_shape", "Duplicate query output field.")
            values[key] = value
    normalized = {}
    for source, target in mapping.items():
        if source not in values:
            raise TigerGraphClientError("response_shape", f"Missing required query output: {source}.")
        value = values[source]
        if query_name == "investigate_transaction":
            if not isinstance(value, list) or not all(isinstance(v, str) and v for v in value):
                raise TigerGraphClientError("response_shape", f"Expected a string ID list for {source}.")
            normalized[target] = list(dict.fromkeys(value))
        else:
            count = target.endswith("count") or target.startswith("within_")
            if (
                isinstance(value, bool) or not isinstance(value, (int, float))
                or not math.isfinite(value) or value < 0
                or (count and int(value) != value)
            ):
                raise TigerGraphClientError("response_shape", f"Invalid numeric output for {source}.")
            normalized[target] = int(value) if count else float(value)
    return normalized


def _now():
    return datetime.now(timezone.utc).isoformat()


def _empty_edge_metadata(status="unavailable", error=None):
    return {
        "limit": MAX_VISUALIZATION_EDGES,
        "returned": 0,
        "truncated": False,
        "status": status,
        "source": EDGE_SOURCE,
        "error": error,
        "invalid_records": 0,
    }


def _normalize_edge(record):
    """Validate one SDK edge record without changing its actual endpoints/direction."""
    if not isinstance(record, dict):
        return None
    required = ("e_type", "from_type", "from_id", "to_type", "to_id")
    if any(not isinstance(record.get(key), str) or not record[key].strip() for key in required):
        return None
    if not isinstance(record.get("directed"), bool):
        return None
    attributes = record.get("attributes", {})
    if not isinstance(attributes, dict):
        return None
    # Ensure attributes can safely be retained and used as part of exact identity.
    try:
        canonical_attributes = json.dumps(attributes, sort_keys=True, separators=(",", ":"), allow_nan=False)
    except (TypeError, ValueError):
        return None
    return {
        "e_type": record["e_type"],
        "directed": record["directed"],
        "from_id": record["from_id"],
        "from_type": record["from_type"],
        "to_id": record["to_id"],
        "to_type": record["to_type"],
        "attributes": attributes,
    }, canonical_attributes


def _retrieve_visualization_edges(txn_id, graph, client):
    """Fetch only real query-supported edges, with one global unique-edge cap."""
    metadata = _empty_edge_metadata(status="complete")
    provenance = graph.get("query_provenance", {}).get("investigate_transaction", {})
    if provenance.get("status") != "complete":
        metadata["status"] = "unavailable"
        metadata["error"] = "The relationship ID query did not complete; edge retrieval was not attempted."
        return [], metadata

    related_ids = set(graph.get("related_transactions", []))
    entity_ids = {
        "Transaction": {txn_id, *related_ids},
        "Card": set(graph.get("connected_cards", [])),
        "Customer": set(graph.get("connected_customers", [])),
        "DeviceProfile": set(graph.get("connected_devices", [])),
        "EmailDomain": set(graph.get("connected_emails", [])),
        "BillingRegion": set(graph.get("connected_regions", [])),
    }

    lookups = []
    for edge_type in ("MADE", "FROM_DEVICE", "PURCHASER_EMAIL", "BILLED_IN"):
        lookups.append(("Transaction", txn_id, edge_type))
    for card_id in sorted(entity_ids["Card"]):
        lookups.extend((("Card", card_id, "MADE"), ("Card", card_id, "OWNS")))

    exact_edges = {}
    successful_lookups = 0
    failed_lookups = 0
    first_error = None
    for source_type, source_id, requested_type in lookups:
        # One extra result is a probe to distinguish a full visualization from a
        # response where the global budget actually omitted a unique edge.
        request_limit = MAX_VISUALIZATION_EDGES - len(exact_edges) + 1
        try:
            records = client.get_edges(source_type, source_id, requested_type, limit=request_limit)
            successful_lookups += 1
        except TigerGraphClientError as exc:
            failed_lookups += 1
            first_error = first_error or str(exc)
            continue
        except Exception:
            failed_lookups += 1
            first_error = first_error or "TigerGraph edge retrieval failed."
            continue

        for record in records:
            parsed = _normalize_edge(record)
            if parsed is None:
                metadata["invalid_records"] += 1
                continue
            edge, canonical_attributes = parsed
            allowed_pairs = EDGE_ENDPOINT_PAIRS.get(edge["e_type"])
            endpoint_pair = frozenset((edge["from_type"], edge["to_type"]))
            # The read-only endpoint can include other schema edges; accept only
            # exact paths from investigate_transaction and IDs returned by it.
            if (
                edge["e_type"] != requested_type
                or allowed_pairs is None or endpoint_pair not in allowed_pairs
                or edge["from_id"] not in entity_ids.get(edge["from_type"], set())
                or edge["to_id"] not in entity_ids.get(edge["to_type"], set())
                or (source_type, source_id) not in {
                    (edge["from_type"], edge["from_id"]),
                    (edge["to_type"], edge["to_id"]),
                }
            ):
                continue
            identity = (
                edge["e_type"], edge["directed"], edge["from_type"], edge["from_id"],
                edge["to_type"], edge["to_id"], canonical_attributes,
            )
            if identity in exact_edges:
                continue
            if len(exact_edges) >= MAX_VISUALIZATION_EDGES:
                metadata["truncated"] = True
                break
            exact_edges[identity] = edge
        if metadata["truncated"]:
            break

    metadata["returned"] = len(exact_edges)
    if metadata["invalid_records"]:
        metadata["status"] = "partial"
        first_error = first_error or "Some TigerGraph edge records had invalid endpoint data and were omitted."
    if failed_lookups:
        metadata["status"] = "partial" if successful_lookups else "failed"
        first_error = first_error or "TigerGraph edge retrieval failed."
    if metadata["truncated"]:
        metadata["status"] = "partial"
    metadata["error"] = first_error
    return list(exact_edges.values()), metadata


def get_connected_entities(txn_id: str, *, client: TigerGraphClient | None = None) -> dict[str, Any]:
    evidence = {
        "transaction_id": txn_id,
        **{key: [] for key in RELATIONSHIPS.values()},
        "graph_findings": [],
        "pattern_assessment": {},
        "velocity": {},
        "fraud_pattern_signals": {},
        "query_provenance": {},
        "raw_query_results": {},
        "status": "unavailable",
        "graph_edges": [],
        "edge_metadata": _empty_edge_metadata(),
    }
    owns_client = client is None
    try:
        if owns_client:
            client = TigerGraphClient()
    except TigerGraphConfigError as exc:
        evidence["configuration_error"] = str(exc)
        evidence["edge_metadata"] = _empty_edge_metadata(status="unavailable", error="TigerGraph configuration is unavailable.")
        for query in INSTALLED_QUERIES:
            evidence["query_provenance"][query] = {
                "query": query, "transaction_id": txn_id, "status": "not_run",
                "error": {"kind": "configuration", "message": str(exc)},
            }
        return evidence

    succeeded = 0
    try:
        for query in INSTALLED_QUERIES:
            provenance = {
                "query": query, "graph": client.settings.graph,
                "transaction_id": txn_id, "transport": "pyTigerGraph.runInstalledQuery",
                "started_at": _now(), "status": "error",
                "field_mapping": MAPPINGS[query][1],
            }
            evidence["query_provenance"][query] = provenance
            try:
                raw = client.run_query(query, txn_id)
                # Retain a successful response even when its fields are unexpected.
                evidence["raw_query_results"][query] = raw
                normalized = normalize_query(query, raw)
                section = MAPPINGS[query][0]
                if section is None:
                    evidence.update(normalized)
                else:
                    evidence[section] = normalized
                evidence["graph_findings"].append({"query": query, "data": normalized})
                provenance["status"] = "complete"
                succeeded += 1
            except TigerGraphClientError as exc:
                provenance["error"] = exc.as_dict()
            finally:
                provenance["completed_at"] = _now()
        evidence["status"] = (
            "complete" if succeeded == len(INSTALLED_QUERIES)
            else "partial" if succeeded else "unavailable"
        )
        evidence["graph_edges"], evidence["edge_metadata"] = _retrieve_visualization_edges(txn_id, evidence, client)
    finally:
        if owns_client:
            client.close()
    return evidence
