import copy
import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from config.tigergraph import TigerGraphSettings
from tools.graph import MAX_VISUALIZATION_EDGES, get_connected_entities, normalize_query
from tools.tigergraph_client import INSTALLED_QUERIES, TigerGraphClientError


FIXTURE = json.loads((Path(__file__).parent / "fixtures/tigergraph_3514030.json").read_text())


def fixture_client():
    client = Mock()
    client.settings = TigerGraphSettings(base_url="https://test.invalid", token="unit-test-token")
    client.run_query.side_effect = lambda name, txn: copy.deepcopy(FIXTURE[name])
    client.get_edges.return_value = []
    return client


def edge(e_type, from_type, from_id, to_type, to_id, *, directed=False, attributes=None):
    return {"e_type": e_type, "directed": directed, "from_id": from_id, "from_type": from_type,
            "to_id": to_id, "to_type": to_type, "attributes": attributes or {}}


class GraphToolTests(unittest.TestCase):
    def test_benchmark_from_captured_live_results(self):
        client = fixture_client()
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["status"], "complete")
        self.assertEqual(graph["connected_customers"], ["C12382"])
        self.assertEqual(graph["connected_cards"], ["21139"])
        self.assertEqual(graph["connected_devices"], [])
        self.assertEqual(graph["connected_regions"], ["444.0"])
        self.assertEqual(len(graph["related_transactions"]), 421)
        self.assertEqual(graph["pattern_assessment"], {
            "related_count": 421, "high_risk_count": 5, "medium_high_risk_count": 8,
            "online_count": 2, "small_amount_count": 12,
            "total_related_amount": 48706.58, "maximum_related_amount": 845.01,
        })
        self.assertEqual(graph["velocity"], {
            "within_1h": 0, "within_6h": 3, "within_24h": 5,
            "amount_1h": 0.0, "amount_6h": 315.89, "amount_24h": 404.02,
        })
        self.assertEqual(graph["fraud_pattern_signals"], {
            "small_online_count": 0, "online_count": 2, "small_online_amount": 0.0,
            "high_risk_count": 5, "medium_high_risk_count": 8, "largest_related_amount": 845.01,
        })
        self.assertEqual(graph["raw_query_results"], FIXTURE)
        self.assertEqual(graph["graph_edges"], [])
        self.assertEqual(graph["edge_metadata"]["status"], "complete")
        self.assertEqual(graph["edge_metadata"]["returned"], 0)
        self.assertEqual([c.args[0] for c in client.run_query.call_args_list], list(INSTALLED_QUERIES))
        for name, provenance in graph["query_provenance"].items():
            self.assertEqual(provenance["query"], name)
            self.assertEqual(provenance["graph"], "HHGOA_Fraud")
            self.assertEqual(provenance["status"], "complete")
            self.assertIn("completed_at", provenance)
        self.assertNotIn("exposure_usd", graph)
        self.assertNotIn("card_testing", graph)
        client.close.assert_not_called()  # Injected client is owned by the caller.

    def test_partial_failure_keeps_successful_queries(self):
        client = fixture_client()
        def run(name, txn):
            if name == "transaction_velocity":
                raise TigerGraphClientError("timeout", "TigerGraph request timed out.")
            return copy.deepcopy(FIXTURE[name])
        client.run_query.side_effect = run
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["status"], "partial")
        self.assertEqual(graph["velocity"], {})
        self.assertEqual(graph["pattern_assessment"]["related_count"], 421)
        self.assertEqual(graph["query_provenance"]["transaction_velocity"]["error"]["kind"], "timeout")
        self.assertEqual(client.run_query.call_count, 4)

    def test_unavailable(self):
        client = fixture_client()
        client.run_query.side_effect = TigerGraphClientError("network", "Unable to reach TigerGraph.")
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["status"], "unavailable")
        self.assertEqual(graph["graph_findings"], [])
        self.assertEqual(graph["pattern_assessment"], {})
        self.assertEqual(graph["raw_query_results"], {})

    def test_missing_config_is_graceful_and_does_not_connect(self):
        with patch.dict("os.environ", {}, clear=True), patch("requests.Session.request") as http:
            graph = get_connected_entities("3514030")
        self.assertEqual(graph["status"], "unavailable")
        self.assertIn("TIGERGRAPH_BASE_URL", graph["configuration_error"])
        self.assertTrue(all(p["status"] == "not_run" for p in graph["query_provenance"].values()))
        http.assert_not_called()

    def test_missing_field_retains_raw_without_fabricating_zero(self):
        client = fixture_client()
        altered = copy.deepcopy(FIXTURE)
        altered["transaction_velocity"] = [x for x in altered["transaction_velocity"] if "@@within_1h" not in x]
        client.run_query.side_effect = lambda name, txn: altered[name]
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["status"], "partial")
        self.assertEqual(graph["velocity"], {})
        self.assertEqual(graph["raw_query_results"]["transaction_velocity"], altered["transaction_velocity"])

    def test_invalid_numeric_fields(self):
        for value in (None, "0", True, -1, 1.5, float("nan"), float("inf")):
            raw = copy.deepcopy(FIXTURE["transaction_velocity"])
            raw[0]["@@within_1h"] = value
            with self.subTest(value=value), self.assertRaises(TigerGraphClientError):
                normalize_query("transaction_velocity", raw)

    def test_duplicate_fields_are_rejected(self):
        raw = copy.deepcopy(FIXTURE["transaction_velocity"])
        raw.append({"@@within_1h": 999})
        with self.assertRaises(TigerGraphClientError):
            normalize_query("transaction_velocity", raw)

    def test_unknown_fields_are_not_interpreted(self):
        raw = copy.deepcopy(FIXTURE["detect_fraud_patterns"])
        raw.append({"future_field": "not a policy instruction"})
        mapped = normalize_query("detect_fraud_patterns", raw)
        self.assertNotIn("future_field", mapped)

    def test_empty_result_is_not_a_successful_no_fraud_result(self):
        client = fixture_client()
        client.run_query.side_effect = lambda name, txn: []
        graph = get_connected_entities("missing-transaction", client=client)
        self.assertEqual(graph["status"], "unavailable")
        self.assertEqual(graph["raw_query_results"], {name: [] for name in INSTALLED_QUERIES})

    def test_ids_require_strings_and_are_deduplicated_without_changing_raw(self):
        raw = copy.deepcopy(FIXTURE["investigate_transaction"])
        raw[1]["@@cards"] = ["21139", "21139"]
        self.assertEqual(normalize_query("investigate_transaction", raw)["connected_cards"], ["21139"])
        self.assertEqual(raw[1]["@@cards"], ["21139", "21139"])
        raw[1]["@@cards"] = [21139]
        with self.assertRaises(TigerGraphClientError):
            normalize_query("investigate_transaction", raw)

    def test_verified_live_shaped_undirected_edges_are_kept(self):
        client = fixture_client()
        run_query = client.run_query.side_effect
        def run_with_email(name, txn):
            raw = run_query(name, txn)
            if name == "investigate_transaction":
                for item in raw:
                    if "@@emails" in item:
                        item["@@emails"] = ["mail.example"]
            return raw
        client.run_query.side_effect = run_with_email
        client.get_edges.side_effect = lambda source_type, source_id, edge_type, limit: {
            ("Transaction", "PURCHASER_EMAIL"): [edge("PURCHASER_EMAIL", "Transaction", "3514030", "EmailDomain", "mail.example")],
            ("Transaction", "MADE"): [edge("MADE", "Transaction", "3514030", "Card", "21139")],
        }.get((source_type, edge_type), [])
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual({e["e_type"] for e in graph["graph_edges"]}, {"MADE", "PURCHASER_EMAIL"})
        self.assertTrue(all(e["directed"] is False for e in graph["graph_edges"]))
        self.assertEqual(graph["edge_metadata"]["status"], "complete")

    def test_exact_duplicate_edges_are_removed_but_distinct_attributes_remain(self):
        client = fixture_client()
        original = edge("MADE", "Transaction", "3514030", "Card", "21139", attributes={"source": "a"})
        distinct = edge("MADE", "Transaction", "3514030", "Card", "21139", attributes={"source": "b"})
        client.get_edges.side_effect = lambda source_type, source_id, edge_type, limit: [original, copy.deepcopy(original), distinct] if source_type == "Transaction" and edge_type == "MADE" else []
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(len(graph["graph_edges"]), 2)
        self.assertEqual({item["attributes"]["source"] for item in graph["graph_edges"]}, {"a", "b"})

    def test_invalid_edge_endpoint_records_are_omitted_and_reported(self):
        client = fixture_client()
        client.get_edges.side_effect = lambda source_type, source_id, edge_type, limit: [
            edge("MADE", "Transaction", "", "Card", "21139"),
            {"e_type": "MADE", "from_type": "Transaction", "from_id": "3514030", "to_type": "Card", "to_id": "21139"},
        ] if source_type == "Transaction" and edge_type == "MADE" else []
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["graph_edges"], [])
        self.assertEqual(graph["edge_metadata"]["invalid_records"], 2)
        self.assertEqual(graph["edge_metadata"]["status"], "partial")
        self.assertIn("invalid endpoint", graph["edge_metadata"]["error"])

    def test_unreturned_endpoint_and_unrelated_closed_case_edge_are_not_exposed(self):
        client = fixture_client()
        client.get_edges.side_effect = lambda source_type, source_id, edge_type, limit: [
            edge("PURCHASER_EMAIL", "Transaction", "3558054", "EmailDomain", "unreturned@example"),
            edge("INVOLVES", "Transaction", "3514030", "ClosedCase", "HHG-008"),
        ] if source_type == "Transaction" and edge_type == "PURCHASER_EMAIL" else []
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["graph_edges"], [])
        self.assertEqual(graph["edge_metadata"]["status"], "complete")

    def test_edge_lookup_failure_preserves_query_ids_and_metrics(self):
        client = fixture_client()
        client.get_edges.side_effect = TigerGraphClientError("http", "TigerGraph HTTP request failed (status 403).", "403")
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(graph["status"], "complete")
        self.assertEqual(len(graph["related_transactions"]), 421)
        self.assertEqual(graph["pattern_assessment"]["related_count"], 421)
        self.assertEqual(graph["edge_metadata"]["status"], "failed")
        self.assertIn("status 403", graph["edge_metadata"]["error"])

    def test_global_visualization_cap_and_truncation_do_not_change_related_ids(self):
        client = fixture_client()
        related = graph_ids = normalize_query("investigate_transaction", FIXTURE["investigate_transaction"])["related_transactions"]
        client.get_edges.side_effect = lambda source_type, source_id, edge_type, limit: [
            edge("MADE", "Card", "21139", "Transaction", txn_id) for txn_id in related[:limit]
        ] if source_type == "Card" and edge_type == "MADE" else []
        graph = get_connected_entities("3514030", client=client)
        self.assertEqual(len(graph["graph_edges"]), MAX_VISUALIZATION_EDGES)
        self.assertEqual(graph["edge_metadata"]["limit"], MAX_VISUALIZATION_EDGES)
        self.assertEqual(graph["edge_metadata"]["returned"], MAX_VISUALIZATION_EDGES)
        self.assertTrue(graph["edge_metadata"]["truncated"])
        self.assertEqual(graph["edge_metadata"]["status"], "partial")
        self.assertEqual(graph["related_transactions"], graph_ids)
