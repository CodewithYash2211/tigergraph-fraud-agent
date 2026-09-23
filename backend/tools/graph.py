"""Normalize the four installed queries using responses observed for 3514030.

These field names came from live responses, not GSQL. Raw SDK result lists are
kept verbatim; absent fields never become zeros or invented fraud signals.
"""

import math
from datetime import datetime, timezone
from typing import Any

from config.tigergraph import TigerGraphConfigError
from tools.tigergraph_client import INSTALLED_QUERIES, TigerGraphClient, TigerGraphClientError


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
    }
    owns_client = client is None
    try:
        if owns_client:
            client = TigerGraphClient()
    except TigerGraphConfigError as exc:
        evidence["configuration_error"] = str(exc)
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
    finally:
        if owns_client:
            client.close()
    evidence["status"] = (
        "complete" if succeeded == len(INSTALLED_QUERIES)
        else "partial" if succeeded else "unavailable"
    )
    return evidence
