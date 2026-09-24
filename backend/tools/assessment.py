"""Conservative deterministic assessment; aggregates are not calibrated probabilities."""
import math
from tools.grounding import build_context


def assess(state):
    context = build_context(state)
    txn = context["transaction_evidence"]["data"]
    graph = context["graph_evidence"]
    history = context["historical_case_evidence"]["data"]
    signals, missing, conflicts = [], list(context["uncertainty"]["missing_evidence"]), []
    try:
        score = float(txn.get("risk_score"))
        if not math.isfinite(score) or not 0 <= score <= 1:
            raise ValueError()
        signals.append({"id": "transaction_model", "source": "transaction.risk_score", "value": score})
    except (ValueError, TypeError):
        score = 0.0
        missing.append("Valid transaction model risk score")
    denied = context["trigger_evidence"]["customer_response"] == "DENIED"
    if denied:
        signals.append({"id": "customer_denial", "source": "case_pack.trigger_text"})
    summary = graph.get("risk_pattern_summary", {})
    patterns = graph.get("fraud_pattern_signals", {})
    velocity = graph.get("velocity", {})
    # Count overlapping graph aggregate measures once, not as independent votes.
    if graph["relationships"].get("related_transactions") and summary.get("high_risk_count", 0) > 0:
        signals.append({"id": "related_high_risk", "source": "risk_pattern_summary", "count": summary["high_risk_count"]})
    prior = history.get("similar_cases", [])
    if any(r.get("outcome") == "confirmed_fraud" for r in prior):
        signals.append({"id": "prior_fraud_history", "source": "closed_cases_history", "context_only": True})
    for a, b in (("high_risk_count", "high_risk_count"), ("online_count", "online_count"),
                 ("medium_high_risk_count", "medium_high_risk_count")):
        if a in summary and b in patterns and summary[a] != patterns[b]:
            conflicts.append("Graph queries disagree on " + a)
    if txn.get("customer_id") and state.get("customer_id") and txn["customer_id"] != state["customer_id"]:
        conflicts.append("Transaction customer differs from case trigger")
    if all(k in velocity for k in ("within_1h", "within_6h", "within_24h")):
        if not velocity["within_1h"] <= velocity["within_6h"] <= velocity["within_24h"]:
            conflicts.append("Velocity windows are inconsistent")
    pattern = "UNKNOWN"
    facts = {"customer_denial": denied, "online_channel": txn.get("channel") == "online"}
    for candidate in context["pattern_evidence"]["documentation"]["patterns"]:
        if candidate["requires"] and all(facts.get(fact, False) for fact in candidate["requires"]):
            pattern = candidate["name"]
            break
    # No calibration is available for adding aggregate counts to a probability.
    # Combine sources through sufficiency, pattern support, and conflict detection.
    sufficient = not missing and not conflicts and len(signals) >= 2
    if len(signals) < 2:
        missing.append("Independent corroboration or customer verification")
    reason = ("Available sources support a recommendation; a specific fraud sequence is not established."
              if sufficient else "Evidence remains incomplete or conflicting; retain uncertainty.")
    verdict = "high_risk" if score >= .70 else "medium_risk" if score >= .50 else "uncertain"
    if conflicts:
        verdict = "uncertain"
    uncertainty = {"sufficient": sufficient, "missing_evidence": missing,
                   "conflicting_evidence": conflicts, "confidence": "medium" if sufficient else "low", "reason": reason}
    context["uncertainty"].update(uncertainty)
    return {"fraud_probability": score, "verdict": verdict, "pattern": pattern, "grounded_context": context,
            "pattern_description": "Customer-reported unrecognized transaction." if denied else "No specific fraud pattern is established.",
            "evidence_count": len(signals), "conflicting_evidence": bool(conflicts), "uncertainty": uncertainty,
            "assessment": {"signals": signals, "pattern": pattern, "model_risk_score": score,
                           "graph_summary": summary, "graph_pattern_signals": patterns,
                           "velocity": velocity, "prior_case_ids": [r["case_id"] for r in prior],
                           "probability_method": "Dataset model score retained; graph/history are contextual, not calibrated probability increments."}}
