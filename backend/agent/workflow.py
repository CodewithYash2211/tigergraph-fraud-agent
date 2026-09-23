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
        "related_txn_ids": [],
        "graph_pattern_assessment": {},
        "graph_velocity": {},
        "graph_fraud_pattern_signals": {},
        "graph_query_status": "unavailable",
        "graph_query_provenance": {},

        "customer_response": "UNKNOWN",

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

    # Extract basic transaction information
    customer_id = transaction.get("customer_id")

    amount = 0.0

    try:
        amount = abs(float(transaction.get("amount", 0.0)))
    except (TypeError, ValueError):
        amount = 0.0

    return {
        "evidence": evidence,

        "customer_id": customer_id,

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
    print("Assessing risk...")

    evidence = state.get("evidence", [])

    transaction = {}

    for item in evidence:
        if item.get("type") == "transaction":
            transaction = item.get("data", {})
            break

    try:
        risk_score = float(
            transaction.get("risk_score", 0.0)
        )
    except (TypeError, ValueError):
        risk_score = 0.0

    # For now the dataset risk score is used as the
    # initial probability estimate.
    #
    # Later this will be replaced/enriched by:
    # graph evidence + fraud patterns + historical cases.
    fraud_probability = risk_score

    if fraud_probability >= 0.70:
        verdict = "high_risk"
    elif fraud_probability >= 0.50:
        verdict = "medium_risk"
    else:
        verdict = "uncertain"

    return {
        "fraud_probability": fraud_probability,
        "verdict": verdict,
    }


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

        evidence_count=len(
            state.get("evidence", [])
        ),

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


def request_evidence(state: InvestigationState):
    print("Checking whether additional evidence is needed...")

    requests = []

    actions = state.get("initial_actions", [])

    action_names = [
        item.get("action")
        for item in actions
    ]

    if "VERIFY_WITH_CUSTOMER" in action_names:
        requests.append({
            "action": "VERIFY_WITH_CUSTOMER",
            "status": "REQUESTED",
            "assumption": (
                "No customer response is provided in the benchmark, "
                "so the response must be simulated."
            )
        })

    if "STEP_UP_AUTH" in action_names:
        requests.append({
            "action": "STEP_UP_AUTH",
            "status": "REQUESTED",
            "assumption": (
                "No step-up authentication result is provided, "
                "so the result must be simulated."
            )
        })

    return {
        "evidence_requests": requests
    }


def simulate_response(state: InvestigationState):
    print("Simulating additional evidence response...")

    # The benchmark does not provide customer/analyst responses.
    # Until we implement case-specific simulation, preserve UNKNOWN.
    #
    # This is intentional. We do not invent a customer response.

    return {
        "customer_response": state.get(
            "customer_response",
            "UNKNOWN"
        )
    }


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

        evidence_count=len(
            state.get("evidence", [])
        ),

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
            "Policy evaluation completed with the "
            "currently available evidence."
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

    workflow.add_edge(
        "initial_policy",
        "request_evidence"
    )

    workflow.add_edge(
        "request_evidence",
        "simulate_response"
    )

    workflow.add_edge(
        "simulate_response",
        "final_policy"
    )

    workflow.add_edge(
        "final_policy",
        END
    )

    return workflow.compile()


fraud_agent = build_workflow()
