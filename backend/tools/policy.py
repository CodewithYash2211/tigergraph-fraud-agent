from typing import Dict, Any


def evaluate_policy(
    fraud_probability: float,
    pattern: str,
    exposure_usd: float,
    evidence_count: int
) -> Dict[str, Any]:

    actions = []
    approval_required = False
    needs_more_evidence = False
    reason = ""

    if evidence_count == 0:
        return {
            "decision": "REQUEST_MORE_EVIDENCE",
            "actions": ["REQUEST_MORE_EVIDENCE"],
            "approval_required": False,
            "needs_more_evidence": True,
            "reason": "Insufficient evidence to make a defensible decision."
        }

    if fraud_probability >= 0.90:
        actions.append("BLOCK_TRANSACTION")
        approval_required = True
        reason = "High fraud probability with sufficient supporting evidence."

    elif fraud_probability >= 0.70:
        actions.append("REQUEST_CUSTOMER_VALIDATION")
        needs_more_evidence = True
        reason = "Fraud probability is elevated but additional evidence is appropriate."

    else:
        actions.append("MONITOR")
        reason = "Available evidence does not justify a stronger intervention."

    if exposure_usd > 500 and fraud_probability >= 0.70:
        actions.append("ESCALATE_TO_ANALYST")
        approval_required = True

    return {
        "decision": actions[0],
        "actions": actions,
        "approval_required": approval_required,
        "needs_more_evidence": needs_more_evidence,
        "reason": reason
    }