from typing import Dict, Any, List


def evaluate_policy(
    fraud_probability: float,
    verdict: str,
    pattern: str,
    exposure_usd: float,
    evidence_count: int,
    customer_response: str = "UNKNOWN",
    shared_device: bool = False,
    shared_region: bool = False,
    shared_email: bool = False,
    conflicting_evidence: bool = False,
    card_testing: bool = False,
    cleared_purchase_amount: float = 0.0,
) -> Dict[str, Any]:
    """
    Apply HHGOA fraud investigation policies R1-R10.

    This function only decides the policy-supported actions.
    It does not perform the actions.
    """

    actions: List[str] = []
    approval_routes: Dict[str, str] = {}
    reasons: List[str] = []

    # ---------------------------------------------------------
    # Basic case rule
    # ---------------------------------------------------------
    create_case = (
        fraud_probability >= 0.30
        or evidence_count > 0
        or customer_response == "DENIED"
    )

    # ---------------------------------------------------------
    # R1 - Weak signal
    # ---------------------------------------------------------
    if (
        evidence_count <= 1
        and fraud_probability < 0.70
        and not card_testing
        and customer_response == "UNKNOWN"
    ):
        actions.extend([
            "VERIFY_WITH_CUSTOMER"
        ])

        approval_routes["VERIFY_WITH_CUSTOMER"] = "auto"

        reasons.append(
            "R1: Single weak signal with fraud probability below 0.70."
        )

    # ---------------------------------------------------------
    # R2 - Customer denies transaction
    # ---------------------------------------------------------
    if customer_response == "DENIED":
        actions.extend([
            "BLOCK_CARD",
            "CREATE_CASE"
        ])

        approval_routes["BLOCK_CARD"] = "L1"
        approval_routes["CREATE_CASE"] = "auto"

        reasons.append(
            "R2: Customer denied the transaction."
        )

        if (
            exposure_usd > 1000
            or shared_device
            or shared_region
        ):
            actions.append("FILE_REPORT")
            approval_routes["FILE_REPORT"] = "L2"

            reasons.append(
                "R2: Report required because exposure/shared fraud linkage meets policy."
            )

    # ---------------------------------------------------------
    # R3 - Customer confirms transaction
    # ---------------------------------------------------------
    if customer_response == "CONFIRMED":
        actions.append("CLOSE_NO_FRAUD")
        approval_routes["CLOSE_NO_FRAUD"] = "auto"

        reasons.append(
            "R3: Customer confirmed the transaction."
        )

    # ---------------------------------------------------------
    # R4 - No reply within 24 hours
    # ---------------------------------------------------------
    if customer_response == "NO_REPLY_24H":
        actions.extend([
            "MONITOR_CARD",
            "DECLINE_TRANSACTION"
        ])

        approval_routes["MONITOR_CARD"] = "auto"
        approval_routes["DECLINE_TRANSACTION"] = "auto"

        reasons.append(
            "R4: No customer reply within 24 hours."
        )

        if exposure_usd > 500:
            actions.append("ESCALATE_TO_ANALYST")
            approval_routes["ESCALATE_TO_ANALYST"] = "L1"

            reasons.append(
                "R4: Exposure exceeds $500."
            )

    # ---------------------------------------------------------
    # R5 - Card testing
    # ---------------------------------------------------------
    if card_testing:
        if cleared_purchase_amount > 100:
            actions.append("BLOCK_CARD")
            approval_routes["BLOCK_CARD"] = "L1"

            reasons.append(
                "R5: Card-testing sequence detected and purchase over $100 already cleared."
            )
        else:
            actions.extend([
                "DECLINE_TRANSACTION",
                "STEP_UP_AUTH"
            ])

            approval_routes["DECLINE_TRANSACTION"] = "L1"
            approval_routes["STEP_UP_AUTH"] = "auto"

            reasons.append(
                "R5: Three or more small online authorizations within one hour followed by a larger purchase."
            )

    # ---------------------------------------------------------
    # R6 - Shared origin
    # ---------------------------------------------------------
    shared_origin = (
        shared_device
        or shared_region
        or shared_email
    )

    if shared_origin and fraud_probability >= 0.30:
        actions.extend([
            "CREATE_CASE",
            "FILE_REPORT",
            "MONITOR_CONNECTED_CARDS"
        ])

        approval_routes["CREATE_CASE"] = "auto"
        approval_routes["FILE_REPORT"] = "L2"
        approval_routes["MONITOR_CONNECTED_CARDS"] = "auto"

        reasons.append(
            "R6: Fraud activity shares a device, region, or recipient email."
        )

    # ---------------------------------------------------------
    # R7 - Disputed but legitimate recurring pattern
    # ---------------------------------------------------------
    if (
        customer_response == "DISPUTED_LEGITIMATE"
        and pattern == "RECURRING_LEGITIMATE"
    ):
        actions.extend([
            "CREATE_CASE",
            "VERIFY_WITH_CUSTOMER",
            "WARN_CUSTOMER"
        ])

        approval_routes["CREATE_CASE"] = "auto"
        approval_routes["VERIFY_WITH_CUSTOMER"] = "auto"
        approval_routes["WARN_CUSTOMER"] = "auto"

        reasons.append(
            "R7: Disputed charge matches the customer's recurring legitimate pattern."
        )

    # ---------------------------------------------------------
    # R8 - Uncertain / conflicting evidence
    # ---------------------------------------------------------
    if (
        verdict.lower() == "uncertain"
        and exposure_usd > 500
    ) or conflicting_evidence:

        actions.append("ESCALATE_TO_ANALYST")
        approval_routes["ESCALATE_TO_ANALYST"] = "L1"

        reasons.append(
            "R8: Evidence is uncertain/conflicting and requires analyst review."
        )

    # ---------------------------------------------------------
    # R9 - Undocumented coordinated/repeated abuse
    # ---------------------------------------------------------
    if pattern == "UNDOCUMENTED_COORDINATED_ABUSE":
        actions.extend([
            "CREATE_CASE",
            "FILE_REPORT",
            "ESCALATE_TO_ANALYST"
        ])

        approval_routes["CREATE_CASE"] = "auto"
        approval_routes["FILE_REPORT"] = "L2"
        approval_routes["ESCALATE_TO_ANALYST"] = "L1"

        reasons.append(
            "R9: Coordinated or repeated abuse does not fit a known fraud pattern."
        )

    # ---------------------------------------------------------
    # General SAR rule
    # ---------------------------------------------------------
    confirmed_or_strongly_suspected = (
        customer_response == "DENIED"
        or fraud_probability >= 0.70
    )

    shared_fraud_link = (
        shared_device
        or shared_region
        or shared_email
    )

    if (
        confirmed_or_strongly_suspected
        and (
            exposure_usd > 1000
            or shared_fraud_link
            or pattern == "UNDOCUMENTED_COORDINATED_ABUSE"
        )
    ):
        if "FILE_REPORT" not in actions:
            actions.append("FILE_REPORT")
            approval_routes["FILE_REPORT"] = "L2"

            reasons.append(
                "SAR rule: confirmed/strongly suspected fraud meets reporting criteria."
            )

    # ---------------------------------------------------------
    # Case rule
    # ---------------------------------------------------------
    if create_case and "CREATE_CASE" not in actions:
        actions.append("CREATE_CASE")
        approval_routes["CREATE_CASE"] = "auto"

        reasons.append(
            "Case required because investigation evidence or fraud probability meets case criteria."
        )

    # ---------------------------------------------------------
    # R10 - Never casually block all cards
    # ---------------------------------------------------------
    if "BLOCK_ALL_CARDS" in actions:
        actions.remove("BLOCK_ALL_CARDS")

        reasons.append(
            "R10: BLOCK_ALL_CARDS is not permitted without confirmed multi-card fraud or confirmed credential compromise."
        )

    # Remove duplicate actions while preserving order
    unique_actions = []
    for action in actions:
        if action not in unique_actions:
            unique_actions.append(action)

    return {
        "actions": unique_actions,
        "approval_routes": approval_routes,
        "create_case": "CREATE_CASE" in unique_actions,
        "file_report": "FILE_REPORT" in unique_actions,
        "reasons": reasons,
        "decision": unique_actions[0] if unique_actions else "NO_ACTION",
    }