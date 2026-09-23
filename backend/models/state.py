from typing import TypedDict, List, Dict, Any


class InvestigationState(TypedDict, total=False):

    # ---------------------------------------------------------
    # Case / trigger
    # ---------------------------------------------------------
    case_id: str
    trigger_type: str
    trigger_text: str
    flagged_txn_id: str
    card_id: str
    customer_id: str

    # ---------------------------------------------------------
    # Investigation evidence
    # ---------------------------------------------------------
    evidence: List[Dict[str, Any]]
    affected_txn_ids: List[str]
    connected_card_ids: List[str]
    connected_device_profiles: List[str]
    similar_prior_cases: List[str]
    # Graph associations are not automatically confirmed affected transactions.
    related_txn_ids: List[str]
    graph_pattern_assessment: Dict[str, Any]
    graph_velocity: Dict[str, Any]
    graph_fraud_pattern_signals: Dict[str, Any]
    graph_query_status: str
    graph_query_provenance: Dict[str, Any]

    # ---------------------------------------------------------
    # Risk assessment
    # ---------------------------------------------------------
    fraud_probability: float
    verdict: str
    pattern: str
    pattern_description: str
    exposure_usd: float

    # ---------------------------------------------------------
    # Additional evidence
    # ---------------------------------------------------------
    evidence_requests: List[Dict[str, Any]]
    customer_response: str

    # ---------------------------------------------------------
    # Evidence flags
    # ---------------------------------------------------------
    shared_device: bool
    shared_region: bool
    shared_email: bool
    conflicting_evidence: bool

    # ---------------------------------------------------------
    # Fraud pattern signals
    # ---------------------------------------------------------
    card_testing: bool
    cleared_purchase_amount: float

    # ---------------------------------------------------------
    # Initial recommendation
    # ---------------------------------------------------------
    initial_actions: List[Dict[str, Any]]
    initial_approval_routes: Dict[str, str]
    initial_reason: str

    # ---------------------------------------------------------
    # Final recommendation
    # ---------------------------------------------------------
    final_actions: List[Dict[str, Any]]
    final_approval_routes: Dict[str, str]
    final_reason: str

    # ---------------------------------------------------------
    # Case / SAR
    # ---------------------------------------------------------
    create_case: bool
    file_report: bool

    case_summary: str

    sar: Dict[str, Any]

    # ---------------------------------------------------------
    # Agent explanation
    # ---------------------------------------------------------
    what_changed: str
    stop_reason: str
    summary: str
