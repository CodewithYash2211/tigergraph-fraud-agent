from typing import TypedDict, List, Dict, Any, Optional


class InvestigationState(TypedDict, total=False):
    # Case information
    case_id: str
    trigger_type: str
    trigger_text: str
    flagged_txn_id: str
    card_id: str
    customer_id: str

    # Investigation
    evidence: List[Dict[str, Any]]
    affected_txn_ids: List[str]
    connected_card_ids: List[str]
    connected_device_profiles: List[str]
    similar_prior_cases: List[str]

    # Assessment
    fraud_probability: float
    verdict: str
    pattern: str
    pattern_description: str
    exposure_usd: float

    # Evidence requests
    evidence_requests: List[Dict[str, Any]]

    # Decisions
    initial_actions: List[Dict[str, Any]]
    final_actions: List[Dict[str, Any]]
    what_changed: str

    # Case completion
    stop_reason: str
    summary: str