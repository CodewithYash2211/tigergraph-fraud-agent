from typing import Dict, Any


def get_connected_entities(txn_id: str) -> Dict[str, Any]:
    """
    Retrieve graph relationships for a transaction.

    Will be connected to TigerGraph MCP/GSQL.
    """

    return {
        "transaction_id": txn_id,
        "connected_cards": [],
        "connected_devices": [],
        "related_transactions": [],
        "graph_findings": []
    }