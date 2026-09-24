"""Deterministic GraphRAG context: retrieve, organize, and retain evidence sources."""
import inspect
import json
from pathlib import Path

from tools.policy import evaluate_policy

PATTERN_PATH = Path(__file__).resolve().parents[2] / "docs" / "fraud-patterns.json"


def build_context(state):
    evidence = {item["type"]: item["data"] for item in state.get("evidence", [])}
    graph = evidence.get("graph", {})
    history = evidence.get("historical_cases", {})
    missing = []
    if graph.get("status") != "complete":
        missing.append("Complete TigerGraph evidence")
    if history.get("status") != "complete":
        missing.append("Prior case lookup")
    try:
        pattern_docs = json.loads(PATTERN_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pattern_docs = {"patterns": []}
        missing.append("Known fraud-pattern documentation")
    return {
        "method": "deterministic_graph_grounding", "version": 1,
        "trigger_evidence": {"source": "data/case_pack.csv", "data": state.get("trigger", {}),
                             "customer_response": state.get("customer_response", "UNKNOWN")},
        "transaction_evidence": {"source": "data/transactions.csv", "data": evidence.get("transaction", {})},
        "graph_evidence": {"source": "HHGOA_Fraud installed queries", "status": graph.get("status", "unavailable"),
                           "relationships": {k: graph.get(k, []) for k in (
                               "connected_customers", "connected_cards", "connected_devices", "connected_emails",
                               "connected_regions", "related_transactions")},
                           "risk_pattern_summary": graph.get("pattern_assessment", {}),
                           "fraud_pattern_signals": graph.get("fraud_pattern_signals", {}),
                           "velocity": graph.get("velocity", {}),
                           "provenance": graph.get("query_provenance", {})},
        # Ground in the actual unchanged policy implementation rather than a divergent paraphrase.
        "policy_evidence": {"source": "backend/tools/policy.py:evaluate_policy",
                            "implementation": inspect.getsource(evaluate_policy)},
        "pattern_evidence": {"source": "docs/fraud-patterns.json", "documentation": pattern_docs},
        "historical_case_evidence": {"source": "data/closed_cases_history.csv", "data": history},
        "uncertainty": {"missing_evidence": missing, "conflicting_evidence": [],
                        "limitations": ["Graph aggregates do not prove a timed fraud sequence.",
                                        "Historical outcomes are context, not current-transaction ground truth.",
                                        "Related graph volume is not fraud exposure."]},
    }
