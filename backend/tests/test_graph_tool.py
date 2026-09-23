import copy
import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from config.tigergraph import TigerGraphSettings
from tools.graph import get_connected_entities, normalize_query
from tools.tigergraph_client import INSTALLED_QUERIES, TigerGraphClientError


FIXTURE = json.loads((Path(__file__).parent / "fixtures/tigergraph_3514030.json").read_text())


def fixture_client():
    client = Mock()
    client.settings = TigerGraphSettings(base_url="https://test.invalid", token="unit-test-token")
    client.run_query.side_effect = lambda name, txn: copy.deepcopy(FIXTURE[name])
    return client


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
