import json
import unittest
from pathlib import Path
from unittest.mock import patch

import requests

from config.tigergraph import TigerGraphConfigError, TigerGraphSettings
from tools.tigergraph_client import TigerGraphClient, TigerGraphClientError


FIXTURE = json.loads((Path(__file__).parent / "fixtures/tigergraph_3514030.json").read_text())


def response(payload=None, *, status=200, body=None):
    result = requests.Response()
    result.status_code = status
    result._content = (json.dumps(payload) if body is None else body).encode()
    result.url = "https://test.invalid/restpp/query/HHGOA_Fraud/transaction_velocity"
    return result


class SettingsTests(unittest.TestCase):
    def test_defaults_and_credentials_are_not_in_repr(self):
        settings = TigerGraphSettings.from_env({
            "TIGERGRAPH_BASE_URL": "https://test.invalid/",
            "TIGERGRAPH_TOKEN": " unit-test-token ",
        })
        self.assertEqual(settings.graph, "HHGOA_Fraud")
        self.assertEqual(settings.timeout, 60)
        self.assertEqual(settings.token, "unit-test-token")
        self.assertNotIn("unit-test-token", repr(settings))

    def test_missing_configuration(self):
        for env in ({}, {"TIGERGRAPH_BASE_URL": "https://test.invalid"}):
            with self.subTest(env=env), self.assertRaises(TigerGraphConfigError):
                TigerGraphSettings.from_env(env)

    def test_invalid_timeout(self):
        for timeout in ("invalid", "0", "-1", "nan", "inf", "0.0001"):
            with self.subTest(timeout=timeout), self.assertRaises(TigerGraphConfigError):
                TigerGraphSettings.from_env({
                    "TIGERGRAPH_BASE_URL": "https://test.invalid",
                    "TIGERGRAPH_TOKEN": "unit-test-token", "TIGERGRAPH_TIMEOUT": timeout,
                })

    def test_unsafe_or_malformed_url(self):
        for url in ("test.invalid", "https://user:secret@test.invalid", "https://test.invalid/?token=x",
                    "https://test.invalid/other", "https://test.invalid#fragment"):
            with self.subTest(url=url), self.assertRaises(TigerGraphConfigError):
                TigerGraphSettings(base_url=url, token="unit-test-token")


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.settings = TigerGraphSettings(base_url="https://test.invalid", token="unit-test-token", timeout=7)
        self.client = TigerGraphClient(self.settings)
        self.addCleanup(self.client.close)
        self.http = patch("requests.Session.request").start()
        self.addCleanup(patch.stopall)
        self.http.return_value = response({"error": False, "results": FIXTURE["transaction_velocity"]})

    def test_real_sdk_query_transport_and_result(self):
        self.assertEqual(self.client.run_query("transaction_velocity", "3514030"), FIXTURE["transaction_velocity"])
        args, kwargs = self.http.call_args
        self.assertEqual(args[0], "GET")
        self.assertIn("/restpp/query/HHGOA_Fraud/transaction_velocity", args[1])
        self.assertTrue("txn_id=3514030" in args[1] or "3514030" in str(kwargs.get("params")))
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer unit-test-token")
        self.assertEqual(int(kwargs["headers"]["GSQL-TIMEOUT"]), 7000)
        self.assertEqual(kwargs["timeout"], 7)
        self.assertFalse(kwargs["allow_redirects"])
        self.assertTrue(self.client._connection._session.verify)

    def test_reuses_and_closes_connection(self):
        self.client.run_query("transaction_velocity", "3514030")
        connection = self.client._connection
        self.client.run_query("transaction_velocity", "3514030")
        self.assertIs(connection, self.client._connection)
        with patch.object(connection, "close") as close:
            self.client.close()
            close.assert_called_once()
        self.assertIsNone(self.client._connection)

    def test_restpp_suffix_and_custom_port(self):
        with TigerGraphClient(TigerGraphSettings(base_url="https://test.invalid:14240/restpp", token="test")) as client:
            client.run_query("transaction_velocity", "3514030")
        self.assertIn("https://test.invalid:14240/restpp/query/", self.http.call_args.args[1])
        self.assertNotIn("/restpp/restpp", self.http.call_args.args[1])

    def test_username_password_authentication_delegates_to_sdk(self):
        with patch("tools.tigergraph_client._BoundedConnection") as factory:
            factory.return_value.runInstalledQuery.return_value = FIXTURE["transaction_velocity"]
            with TigerGraphClient(TigerGraphSettings(
                base_url="https://test.invalid", username="test-user", password="test-password",
            )) as client:
                client.run_query("transaction_velocity", "3514030")
            factory.return_value.getToken.assert_called_once_with(secret=None, is_global=False)
            self.assertEqual(factory.call_args.kwargs["password"], "test-password")

    def test_secret_authentication_delegates_to_sdk(self):
        with patch("tools.tigergraph_client._BoundedConnection") as factory:
            factory.return_value.runInstalledQuery.return_value = FIXTURE["transaction_velocity"]
            with TigerGraphClient(TigerGraphSettings(base_url="https://test.invalid", secret="test-secret")) as client:
                client.run_query("transaction_velocity", "3514030")
            factory.return_value.getToken.assert_called_once_with(secret="test-secret", is_global=False)

    def test_authentication_http_request_is_also_bounded(self):
        connection = self.client._connect()
        connection._do_request("POST", "https://test.invalid/gsql/v1/tokens", {}, {}, True, None, None)
        self.assertEqual(self.http.call_args.kwargs["timeout"], 7)

    def test_http_failures_do_not_echo_response_body(self):
        for status in (401, 403, 404, 500, 302):
            with self.subTest(status=status):
                self.http.return_value = response(status=status, body="secret-bearing-error-body")
                with self.assertRaises(TigerGraphClientError) as caught:
                    self.client.run_query("transaction_velocity", "3514030")
                self.assertEqual(caught.exception.kind, "http")
                self.assertNotIn("secret-bearing", str(caught.exception))

    def test_application_error_does_not_echo_server_message(self):
        self.http.return_value = response({"error": True, "message": "secret-bearing-error-body", "code": "REST-1000"})
        with self.assertRaises(TigerGraphClientError) as caught:
            self.client.run_query("transaction_velocity", "3514030")
        self.assertEqual(caught.exception.kind, "application")
        self.assertEqual(caught.exception.code, "REST-1000")
        self.assertNotIn("secret-bearing", str(caught.exception))

    def test_invalid_json_and_envelopes(self):
        for result in (response(body="not JSON"), response({}), response({"error": False, "results": None}),
                       response({"error": False, "results": ["unexpected"]})):
            with self.subTest(result=result), self.assertRaises(TigerGraphClientError):
                self.http.return_value = result
                self.client.run_query("transaction_velocity", "3514030")

    def test_network_and_timeout_errors(self):
        for error, kind in ((requests.Timeout("sensitive detail"), "timeout"),
                            (requests.ConnectionError("sensitive detail"), "network")):
            with self.subTest(kind=kind):
                self.http.side_effect = error
                with self.assertRaises(TigerGraphClientError) as caught:
                    self.client.run_query("transaction_velocity", "3514030")
                self.assertEqual(caught.exception.kind, kind)
                self.assertNotIn("sensitive", str(caught.exception))

    def test_invalid_input_does_not_send_requests(self):
        for name, txn in (("arbitrary_query", "3514030"), ("transaction_velocity", None), ("transaction_velocity", "")):
            with self.subTest(name=name, txn=txn), self.assertRaises(TigerGraphClientError):
                self.client.run_query(name, txn)
        self.http.assert_not_called()
