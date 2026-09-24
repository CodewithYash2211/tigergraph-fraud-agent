"""Best-effort graph case output using the existing SDK connection and schema.

Never installs queries, creates schema, invents relationship edges, or labels a
pending investigation as closed/confirmed fraud. Identifiers are stored as
references; graph card IDs and case-pack card IDs remain distinct.
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from requests.exceptions import HTTPError, Timeout, ConnectionError
from pyTigerGraph.common.exception import TigerGraphException

from tools.tigergraph_client import TigerGraphClient


def _failure(audit, stage, code, message, status="failed"):
    audit.update(status=status, reason=message,
                 error={"stage": stage, "code": code, "message": message})


def _exception(audit, stage, exc):
    # Never copy exception text, response bodies, URLs, or headers: SDK errors
    # may contain authentication material. Return allowlisted diagnostics only.
    status = "uncertain" if stage in ("vertex_write", "edge_write") else "failed"
    code, message = "sdk_error", "TigerGraph SDK operation failed; inspect server logs for details."
    if isinstance(exc, HTTPError):
        http_status = getattr(exc.response, "status_code", None)
        if isinstance(http_status, int) and 400 <= http_status <= 599:
            code = f"http_{http_status}"
            message = f"TigerGraph returned HTTP {http_status}."
            if http_status in (401, 403):
                message += " Check authentication and graph write permissions."
            if 400 <= http_status < 500:
                status = "failed"
    elif isinstance(exc, Timeout):
        code, message = "timeout", "TigerGraph operation timed out; a submitted write may have completed."
    elif isinstance(exc, ConnectionError):
        code, message = "connection_error", "TigerGraph connection failed; a submitted write may have completed."
    elif isinstance(exc, TigerGraphException):
        server_code = getattr(exc, "code", None)
        if isinstance(server_code, str) and re.fullmatch(r"(?:REST|GSQL|E)-[0-9]{1,8}", server_code):
            code = server_code
            message = f"TigerGraph rejected the operation with application code {server_code}; check graph permissions and attribute compatibility."
            status = "failed"
    _failure(audit, stage, code, message, status)


def write_graph_case(record, *, connection=None):
    audit = {"status": "failed", "case_id": record["case_id"], "graph": "HHGOA_Fraud",
             "operation": "upsertVertex", "vertex_type": "ClosedCase",
             "started_at": datetime.now(timezone.utc).isoformat(), "write_attempted": False,
             "link_mode": "stored_identifiers", "error": None, "edges": []}
    client = None
    stage = "connection"
    try:
        if connection is None:
            client = TigerGraphClient()
            if client.settings.graph != "HHGOA_Fraud":
                _failure(audit, stage, "graph_mismatch", "Case output is restricted to HHGOA_Fraud.")
                return audit
            connection = client._connect()
        # SDK schema retrieval is read-only; absent/unsupported schema fails closed.
        stage = "schema"
        schema = connection.getSchema(udts=False)
        vertex = next((v for v in schema.get("VertexTypes", []) if v.get("Name") == "ClosedCase"), None)
        if vertex is None:
            _failure(audit, stage, "missing_vertex", "Existing ClosedCase vertex type was not found; no schema was changed.")
            return audit
        primary_type = vertex.get("PrimaryId", {}).get("AttributeType", {}).get("Name")
        if primary_type != "STRING":
            _failure(audit, stage, "incompatible_primary_id", "ClosedCase must have an inspected STRING primary ID.")
            return audit
        fields = {a["AttributeName"]: a["AttributeType"].get("Name") for a in vertex.get("Attributes", [])}
        note_field = next((name for name in ("evidence_summary", "analyst_notes", "outcome") if fields.get(name) == "STRING"), None)
        if note_field is None:
            _failure(audit, stage, "missing_record_attribute", "ClosedCase needs an existing STRING evidence_summary, analyst_notes, or outcome attribute; no write attempted.")
            return audit
        audit["record_attribute"] = note_field
        stage = "prepare_record"
        transaction = record["transaction"]
        trigger = record["trigger"]
        payload = {"record_type": "HHGOA_INVESTIGATION", "case_id": record["case_id"],
                   "customer_id": trigger.get("customer_id"), "card_id": trigger.get("card_id"),
                   "graph_card_ids": record["graph_evidence"].get("connected_cards", []),
                   "flagged_txn_id": transaction["transaction_id"], "status": record["case_status"],
                   "verdict": record["verdict"], "risk_score": record["assessment"]["model_risk_score"],
                   "pattern": record["assessment"]["pattern"], "recommended_actions": record["final_actions"],
                   "evidence_summary": record["summary"], "uncertainty": record["uncertainty"],
                   "graph_query_provenance": record["graph_evidence"].get("query_provenance", {}),
                   "prior_case_ids": record["assessment"]["prior_case_ids"],
                   "updated_at": record["updated_at"], "actions_executed": False}
        serialized = json.dumps(payload, sort_keys=True, allow_nan=False)
        attrs = {note_field: serialized}
        # Copy only exact attributes actually present in the inspected schema.
        for name in ("case_id", "customer_id", "card_id", "flagged_txn_id", "status", "verdict", "pattern"):
            if fields.get(name) == "STRING" and payload.get(name) is not None:
                attrs[name] = payload[name]
        if fields.get("risk_score") in ("FLOAT", "DOUBLE"):
            attrs["risk_score"] = payload["risk_score"]
        if fields.get("recommended_action") == "STRING":
            attrs["recommended_action"] = "|".join(a["action"] for a in record["final_actions"])
        if fields.get("opened_at") == "STRING" and record.get("created_at"):
            attrs["opened_at"] = record["created_at"]
        audit.update(attribute_names=sorted(attrs), payload_sha256=hashlib.sha256(serialized.encode()).hexdigest(),
                     write_attempted=True)
        stage = "vertex_write"
        count = connection.upsertVertex("ClosedCase", record["case_id"], attrs)
        audit["accepted_vertices"] = count if type(count) is int else None
        if type(count) is not int or count != 1:
            _failure(audit, stage, "write_not_acknowledged", "TigerGraph did not acknowledge one accepted case vertex.",
                     "failed" if type(count) is int and count == 0 else "uncertain")
            return audit
        audit["vertex_status"] = "success"
        # Use only inspected edges and verified existing targets. Never create
        # placeholder Card/Transaction vertices from case-pack identifiers.
        cards = payload["graph_card_ids"]
        targets = [("INVOLVES", "Transaction", payload["flagged_txn_id"])]
        if len(cards) == 1 and isinstance(cards[0], (str, int)):
            targets.append(("ON_CARD", "Card", str(cards[0])))
        for edge_name, target_type, target_id in targets:
            if not any(e.get("Name") == edge_name and e.get("FromVertexTypeName") == "ClosedCase"
                       and e.get("ToVertexTypeName") == target_type for e in schema.get("EdgeTypes", [])):
                continue
            stage = "edge_target_lookup"
            existing = connection.getVerticesById(target_type, str(target_id))
            edge = {"edge_type": edge_name, "target_type": target_type, "target_id": str(target_id)}
            audit["edges"].append(edge)
            if not any(str(v.get("v_id")) == str(target_id) for v in existing):
                edge.update(status="skipped", reason="Target vertex does not exist.")
                continue
            stage = "edge_write"
            accepted = connection.upsertEdge("ClosedCase", record["case_id"], edge_name,
                                             target_type, str(target_id), vertexMustExist=True)
            edge["status"] = "success" if type(accepted) is int and accepted == 1 else "uncertain"
            if edge["status"] != "success":
                _failure(audit, stage, "edge_not_acknowledged", "Case vertex was saved, but an edge write was not acknowledged.",
                         "failed" if type(accepted) is int and accepted == 0 else "uncertain")
                return audit
        audit["status"] = "success"
        if any(e["status"] == "success" for e in audit["edges"]):
            audit["link_mode"] = "existing_schema_edges"
    except Exception as exc:
        _exception(audit, stage, exc)
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                pass
        audit["completed_at"] = datetime.now(timezone.utc).isoformat()
    return audit
