from langgraph.graph import StateGraph, START, END

from models.state import InvestigationState

from tools.transaction import get_transaction
from tools.graph import get_connected_entities
from tools.cases import find_similar_cases
from tools.policy import evaluate_policy


def load_case(state: InvestigationState):
    print(f"Loading case: {state.get('case_id')}")
    
    return {
        "evidence": [],
        "affected_txn_ids": [],
        "connected_card_ids": [],
        "connected_device_profiles": [],
        "similar_prior_cases": [],
    }


def investigate(state: InvestigationState):
    print("Investigating transaction...")

    txn_id = state.get("flagged_txn_id")

    # 1. Transaction evidence
    transaction = get_transaction(txn_id)

    # 2. Graph evidence
    graph = get_connected_entities(txn_id)

    # 3. Similar historical cases
    previous_cases = find_similar_cases(txn_id)

    evidence = [
        {
            "type": "transaction",
            "data": transaction
        },
        {
            "type": "graph",
            "data": graph
        },
        {
            "type": "historical_cases",
            "data": previous_cases
        }
    ]

    return {
        "evidence": evidence,
        "connected_card_ids": graph.get("connected_cards", []),
        "connected_device_profiles": graph.get("connected_devices", []),
        "affected_txn_ids": graph.get("related_transactions", []),
        "similar_prior_cases": previous_cases.get("similar_cases", [])
    }


def assess_risk(state: InvestigationState):
    print("Assessing risk...")

    evidence = state.get("evidence", [])

    fraud_probability = 0.0
    transaction = {}

    for item in evidence:
        if item.get("type") == "transaction":
            transaction = item.get("data", {})
            break

    try:
        fraud_probability = float(
            transaction.get("risk_score", 0.0)
        )
    except (TypeError, ValueError):
        fraud_probability = 0.0

    if fraud_probability >= 0.70:
        verdict = "HIGH_RISK"
    elif fraud_probability >= 0.50:
        verdict = "MEDIUM_RISK"
    else:
        verdict = "LOW_RISK"

    return {
        "fraud_probability": fraud_probability,
        "verdict": verdict,
        "pattern": "UNKNOWN"
    }

def policy_check(state: InvestigationState):
    print("Checking fraud policy...")

    evidence = state.get("evidence", [])

    result = evaluate_policy(
        fraud_probability=state.get("fraud_probability", 0.0),
        pattern=state.get("pattern", "UNKNOWN"),
        exposure_usd=state.get("exposure_usd", 0.0),
        evidence_count=len(evidence)
    )

    return {
        "final_actions": result["actions"],
        "stop_reason": result["reason"],
        "summary": result["decision"]
    }


def build_workflow():
    workflow = StateGraph(InvestigationState)

    workflow.add_node("load_case", load_case)
    workflow.add_node("investigate", investigate)
    workflow.add_node("assess_risk", assess_risk)
    workflow.add_node("policy_check", policy_check)

    workflow.add_edge(START, "load_case")
    workflow.add_edge("load_case", "investigate")
    workflow.add_edge("investigate", "assess_risk")
    workflow.add_edge("assess_risk", "policy_check")
    workflow.add_edge("policy_check", END)

    return workflow.compile()


fraud_agent = build_workflow()