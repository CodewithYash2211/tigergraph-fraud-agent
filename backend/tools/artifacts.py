"""Local, atomic case snapshots and SAR drafts. No external actions are executed."""
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from tools.graph_persistence import write_graph_case

CASES_DIR = Path(__file__).resolve().parents[2] / "cases"


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         suffix=".tmp", delete=False) as handle:
            name = handle.name
            json.dump(data, handle, indent=2, allow_nan=False)
            handle.write("\n")
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def sar_draft(state):
    if not state.get("file_report"):
        return {}
    return {"status": "DRAFT", "externally_filed": False, "case_id": state["case_id"],
            "customer_id": state.get("customer_id"), "transaction_id": state["flagged_txn_id"],
            "exposure_usd": state["exposure_usd"], "pattern": state.get("pattern", "UNKNOWN"),
            "evidence": state["evidence"], "reason": state.get("final_reason"),
            "recommended_actions": state["final_actions"], "approval_route": "L2",
            "uncertainty": state["uncertainty"], "created_at": now()}


def persist_case(state):
    case_id = state["case_id"]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", case_id):
        raise ValueError("Invalid case artifact ID")
    evidence = {item["type"]: item["data"] for item in state["evidence"]}
    pending = any(route in ("L1", "L2") for route in state["final_approval_routes"].values())
    status = "PENDING_APPROVAL" if pending else "NEEDS_EVIDENCE" if not state["uncertainty"]["sufficient"] else "REVIEW_COMPLETE"
    draft = sar_draft(state)
    directory = Path(state.get("case_output_dir") or CASES_DIR)
    path = directory / f"{case_id}.json"
    created_at = state["started_at"]
    if path.exists():
        created_at = json.loads(path.read_text(encoding="utf-8")).get("created_at", created_at)
    updated_at = now()
    record = {"case_id": case_id, "trigger": state["trigger"],
              "ml_prediction": state.get("ml_prediction"),
              "transaction": evidence["transaction"], "graph_evidence": evidence["graph"],
              "historical_evidence": evidence["historical_cases"], "assessment": state["assessment"],
              "grounded_context": state["grounded_context"], "verdict": state["verdict"],
              "uncertainty": state["uncertainty"], "evidence_requests": state["evidence_requests"],
              "initial_actions": state["initial_actions"], "final_actions": state["final_actions"],
              "approval_routes": state["final_approval_routes"], "case_status": status,
              "actions_executed": False, "sar_required": state["file_report"], "sar": draft,
              "iterations": state["iteration"], "stop_reason": state["stop_reason"],
              "summary": state["case_summary"], "created_at": created_at, "updated_at": updated_at}
    if draft:
        write_json(directory / "sar" / f"{case_id}.json", draft)
    elif (directory / "sar" / f"{case_id}.json").exists():
        # Retain an explicit supersession marker instead of a stale active draft.
        write_json(directory / "sar" / f"{case_id}.json",
                   {"case_id": case_id, "status": "SUPERSEDED", "externally_filed": False, "updated_at": updated_at})
    # Local result is durable before any network write. Never claim a failed
    # graph write destroyed the investigation or turn it into an API failure.
    record["graph_persistence"] = {"status": "pending"}
    write_json(path, record)
    if state.get("graph_mode") == "offline":
        audit = {"status": "not_attempted", "reason": "Offline mode; graph and credentials were not accessed."}
    else:
        audit = write_graph_case(record)
    record["graph_persistence"] = audit
    try:
        write_json(path, record)
    except OSError:
        audit = {**audit, "local_audit_update_failed": True}
    return {"sar": draft, "case_status": status, "case_path": str(path), "updated_at": updated_at,
            "graph_persistence": audit}
