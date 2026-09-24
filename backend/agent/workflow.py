from langgraph.graph import StateGraph, START, END

from models.state import InvestigationState

from tools.transaction import get_transaction
from tools.graph import get_connected_entities
from tools.cases import find_similar_cases
from tools.policy import evaluate_policy
from tools.triggers import load_trigger, trigger_response, InvestigationError
from tools.assessment import assess
from tools.artifacts import persist_case, now
import math


def load_case(state: InvestigationState):
    print(f"Loading case: {state.get('case_id')}")

    trigger = load_trigger(state.get("case_id"), state.get("flagged_txn_id"))
    return {
        **trigger,
        "trigger": trigger,
        "started_at": now(),
        "iteration": 0,
        "pattern": "UNKNOWN",
        "evidence": [],
        "affected_txn_ids": [],
        "connected_card_ids": [],
        "connected_device_profiles": [],
        "similar_prior_cases": [],
        "related_txn_ids": [],
        "graph_pattern_assessment": {},
        "graph_velocity": {},
        "graph_fraud_pattern_signals": {},
        "graph_query_status": "unavailable",
        "graph_query_provenance": {},

        "customer_response": trigger_response(trigger),

        "shared_device": False,
        "shared_region": False,
        "shared_email": False,
        "conflicting_evidence": False,

        "card_testing": False,
        "cleared_purchase_amount": 0.0,

        "initial_actions": [],
        "initial_approval_routes": {},
        "initial_reason": "",

        "final_actions": [],
        "final_approval_routes": {},
        "final_reason": "",

        "create_case": False,
        "file_report": False,

        "evidence_requests": [],
        "sar": {},

        "what_changed": "",
        "stop_reason": "",
        "summary": "",
    }


def investigate(state: InvestigationState):
    print("Investigating transaction...")

    txn_id = state.get("flagged_txn_id")

    # 1. Transaction evidence
    transaction = state.get("transaction_record") or get_transaction(txn_id)
    if not transaction.get("found"):
        raise InvestigationError("transaction_not_found", "Flagged transaction was not found.", 404)
    if transaction.get("transaction_id") != txn_id:
        raise InvestigationError("transaction_mismatch", "Transaction lookup returned a different ID.")
    try:
        amount = abs(float(transaction.get("amount")))
        if not math.isfinite(amount):
            raise ValueError()
    except (TypeError, ValueError):
        raise InvestigationError("invalid_transaction", "Transaction amount is missing or invalid.") from None

    # 2. Graph evidence
    if state.get("graph_mode") == "offline":
        graph = {"transaction_id": txn_id, "status": "unavailable", "connected_cards": [],
                 "connected_devices": [], "related_transactions": [], "graph_findings": [],
                 "pattern_assessment": {}, "velocity": {}, "fraud_pattern_signals": {},
                 "query_provenance": {}, "raw_query_results": {},
                 "reason": "Offline benchmark: TigerGraph was not contacted."}
    else:
        graph = get_connected_entities(txn_id)

    # 3. Similar historical cases
    previous_cases = find_similar_cases(
        txn_id, customer_id=state.get("customer_id"), card_id=state.get("card_id"),
        as_of=state.get("opened_at"),
    )

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

        "customer_id": state.get("customer_id"),

        "connected_card_ids": graph.get(
            "connected_cards", []
        ),

        "connected_device_profiles": graph.get(
            "connected_devices", []
        ),

        # Related transactions are associations, not confirmed fraud exposure.
        "related_txn_ids": graph.get(
            "related_transactions", []
        ),
        "graph_pattern_assessment": graph.get("pattern_assessment", {}),
        "graph_velocity": graph.get("velocity", {}),
        "graph_fraud_pattern_signals": graph.get("fraud_pattern_signals", {}),
        "graph_query_status": graph.get("status", "unavailable"),
        "graph_query_provenance": graph.get("query_provenance", {}),

        "similar_prior_cases": previous_cases.get(
            "similar_cases", []
        ),

        # Initial exposure starts with flagged transaction.
        # More transactions will be added when episode detection
        # is implemented.
        "exposure_usd": amount,
    }


def assess_risk(state: InvestigationState):
    return {**assess(state), "iteration": state.get("iteration", 0) + 1}



def initial_policy(state: InvestigationState):
    print("Calculating initial next-best action...")

    result = evaluate_policy(
        fraud_probability=state.get(
            "fraud_probability", 0.0
        ),

        verdict=state.get(
            "verdict", "uncertain"
        ),

        pattern=state.get(
            "pattern", "UNKNOWN"
        ),

        exposure_usd=state.get(
            "exposure_usd", 0.0
        ),

        evidence_count=state.get("evidence_count", 0),

        customer_response=state.get(
            "customer_response", "UNKNOWN"
        ),

        shared_device=state.get(
            "shared_device", False
        ),

        shared_region=state.get(
            "shared_region", False
        ),

        shared_email=state.get(
            "shared_email", False
        ),

        conflicting_evidence=state.get(
            "conflicting_evidence", False
        ),

        card_testing=state.get(
            "card_testing", False
        ),

        cleared_purchase_amount=state.get(
            "cleared_purchase_amount", 0.0
        ),
    )

    actions = result.get("actions", [])

    initial_actions = [
        {
            "action": action,
            "route": result.get(
                "approval_routes", {}
            ).get(action, "auto"),
            "reason": "; ".join(
                result.get("reasons", [])
            )
        }
        for action in actions
    ]

    return {
        "initial_actions": initial_actions,

        "initial_approval_routes": result.get(
            "approval_routes", {}
        ),

        "initial_reason": "; ".join(
            result.get("reasons", [])
        ),

        "create_case": result.get(
            "create_case", False
        ),

        "file_report": result.get(
            "file_report", False
        ),
    }


def evidence_route(state: InvestigationState):
    if state["uncertainty"]["sufficient"] or state["iteration"] >= 2:
        return "final_policy"
    if state.get("customer_response") == "UNKNOWN":
        return "request_evidence"
    return "final_policy"


def request_evidence(state: InvestigationState):
    # Verification is a permitted auto-routed evidence request, not a block/decline.
    request = {"action": "VERIFY_WITH_CUSTOMER", "approval_route": "auto",
               "status": "REQUESTED", "iteration": state["iteration"],
               "reason": state["uncertainty"]["reason"]}
    return {"evidence_requests": [*state.get("evidence_requests", []), request]}


def simulate_response(state: InvestigationState):
    # No invented customer denial/confirmation. The deterministic simulation is
    # explicitly unavailable and cannot satisfy an evidence requirement.
    requests = [dict(r) for r in state["evidence_requests"]]
    requests[-1].update(status="SIMULATED_UNAVAILABLE", simulated=True,
                        response="UNKNOWN", assumption="No real customer interaction is available.")
    return {"evidence_requests": requests, "customer_response": state.get("customer_response", "UNKNOWN")}



def final_policy(state: InvestigationState):
    print("Calculating final next-best action...")

    result = evaluate_policy(
        fraud_probability=state.get(
            "fraud_probability", 0.0
        ),

        verdict=state.get(
            "verdict", "uncertain"
        ),

        pattern=state.get(
            "pattern", "UNKNOWN"
        ),

        exposure_usd=state.get(
            "exposure_usd", 0.0
        ),

        evidence_count=state.get("evidence_count", 0),

        customer_response=state.get(
            "customer_response", "UNKNOWN"
        ),

        shared_device=state.get(
            "shared_device", False
        ),

        shared_region=state.get(
            "shared_region", False
        ),

        shared_email=state.get(
            "shared_email", False
        ),

        conflicting_evidence=state.get(
            "conflicting_evidence", False
        ),

        card_testing=state.get(
            "card_testing", False
        ),

        cleared_purchase_amount=state.get(
            "cleared_purchase_amount", 0.0
        ),
    )

    actions = result.get("actions", [])

    final_actions = [
        {
            "action": action,
            "route": result.get(
                "approval_routes", {}
            ).get(action, "auto"),
            "reason": "; ".join(
                result.get("reasons", [])
            )
        }
        for action in actions
    ]

    initial_names = [
        item.get("action")
        for item in state.get(
            "initial_actions", []
        )
    ]

    final_names = [
        item.get("action")
        for item in final_actions
    ]

    if initial_names == final_names:
        what_changed = (
            "No additional evidence changed the recommendation."
        )
    else:
        what_changed = (
            f"Initial actions: {initial_names}. "
            f"Final actions: {final_names}."
        )

    return {
        "final_actions": final_actions,

        "final_approval_routes": result.get(
            "approval_routes", {}
        ),

        "final_reason": "; ".join(
            result.get("reasons", [])
        ),

        "create_case": result.get(
            "create_case", False
        ),

        "file_report": result.get(
            "file_report", False
        ),

        "what_changed": what_changed,

        "stop_reason": (
            "Evidence sufficient for recommendation." if state["uncertainty"]["sufficient"]
            else "Maximum 2 assessment iterations reached; uncertainty remains." if state["iteration"] >= 2
            else "No applicable automated evidence request; analyst review remains necessary."
        ),
        "case_summary": (
            f"Case {state['case_id']}: transaction {state['flagged_txn_id']}, "
            f"risk {state['fraud_probability']:.2f} ({state['verdict']}), pattern {state['pattern']}. "
            f"Exposure ${state['exposure_usd']:.2f}; related graph volume is not fraud exposure. "
            f"Graph status {state.get('graph_query_status')}; {state['evidence_count']} evidence signals. "
            f"{state['uncertainty']['reason']} Recommended actions: {', '.join(final_names)}. "
            "Actions are recommendations only; SAR outputs are drafts."
        ),

        "summary": result.get(
            "decision", "NO_ACTION"
        ),
    }


def build_workflow():

    workflow = StateGraph(InvestigationState)

    workflow.add_node(
        "load_case",
        load_case
    )

    workflow.add_node(
        "investigate",
        investigate
    )

    workflow.add_node(
        "assess_risk",
        assess_risk
    )

    workflow.add_node(
        "initial_policy",
        initial_policy
    )

    workflow.add_node(
        "request_evidence",
        request_evidence
    )

    workflow.add_node(
        "simulate_response",
        simulate_response
    )

    workflow.add_node(
        "final_policy",
        final_policy
    )

    workflow.add_edge(
        START,
        "load_case"
    )

    workflow.add_edge(
        "load_case",
        "investigate"
    )

    workflow.add_edge(
        "investigate",
        "assess_risk"
    )

    workflow.add_edge(
        "assess_risk",
        "initial_policy"
    )

    workflow.add_conditional_edges("initial_policy", evidence_route)

    workflow.add_edge(
        "request_evidence",
        "simulate_response"
    )

    workflow.add_node("reassess", assess_risk)
    workflow.add_edge("simulate_response", "reassess")
    workflow.add_conditional_edges("reassess", evidence_route)

    workflow.add_node("persist_case", persist_case)
    workflow.add_edge("final_policy", "persist_case")
    workflow.add_edge("persist_case", END)

    return workflow.compile()


fraud_agent = build_workflow()
