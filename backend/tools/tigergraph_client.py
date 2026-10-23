"""Small synchronous adapter around the locally verified pyTigerGraph 2.0.4 API."""

import logging
import re
from urllib.parse import urlsplit

import requests
from pyTigerGraph import TigerGraphConnection
from pyTigerGraph.common.exception import TigerGraphException

from config.tigergraph import TigerGraphSettings


INSTALLED_QUERIES = (
    "investigate_transaction",
    "risk_pattern_summary",
    "detect_fraud_patterns",
    "transaction_velocity",
)

# Edge names and vertex paths verified against the installed investigation query
# and the live HHGOA_Fraud schema. Keep this read-only allowlist intentionally
# narrow: it excludes unrelated edges such as Transaction-ClosedCase INVOLVES.
EDGE_LOOKUP_TYPES = {
    "Transaction": frozenset({"MADE", "FROM_DEVICE", "PURCHASER_EMAIL", "BILLED_IN"}),
    "Card": frozenset({"MADE", "OWNS"}),
}
MAX_EDGE_LOOKUP_LIMIT = 201  # 200 output edges plus one truncation probe.


class TigerGraphClientError(RuntimeError):
    def __init__(self, kind: str, message: str, code: str | None = None):
        super().__init__(message)
        self.kind = kind
        self.code = code

    def as_dict(self):
        return {"kind": self.kind, "message": str(self), "code": self.code}


class _BoundedConnection(TigerGraphConnection):
    """Bound authentication/query HTTP calls, including SDK retries.

    SDK query timeouts are server timeouts in milliseconds and do not bound
    authentication. This hook also prevents credential-bearing redirects.
    """

    def __init__(self, *, http_timeout, **kwargs):
        self.http_timeout = http_timeout
        super().__init__(**kwargs)
        self.verify = True

    def _do_request(self, method, url, _headers, _data, jsonData, params, timeout):
        limit = self.http_timeout if timeout is None else min(timeout, self.http_timeout)
        response = self._session.request(
            method, url, headers=_headers, params=params,
            timeout=limit, allow_redirects=False,
            **({"json": _data} if jsonData else {"data": _data}),
        )
        if 300 <= response.status_code < 400:
            raise TigerGraphClientError("http", "TigerGraph returned an unexpected redirect.")
        return response


class TigerGraphClient:
    def __init__(self, settings: TigerGraphSettings | None = None):
        self.settings = settings if settings is not None else TigerGraphSettings.from_env()
        self._connection = None

    def _connect(self):
        if self._connection is not None:
            return self._connection
        # SDK debug logs can contain authentication payloads, even under root DEBUG.
        for name in ("pyTigerGraph", "pyTigerGraph.common.base", "pyTigerGraph.pyTigerGraphBase",
                     "pyTigerGraph.pyTigerGraphAuth", "pyTigerGraph.pyTigerGraphQuery"):
            logging.getLogger(name).setLevel(logging.WARNING)
        config = self.settings
        url = urlsplit(config.base_url)
        origin = f"{url.scheme}://{url.netloc}"
        port = url.port or (443 if url.scheme == "https" else 80)
        connection = _BoundedConnection(
            host=origin, graphname=config.graph, apiToken=config.token,
            gsqlSecret=config.secret if not config.token else "",
            username=config.username, password=config.password,
            restppPort=port, gsPort=port, http_timeout=config.timeout,
        )
        try:
            if not config.token:
                # The SDK handles the different token endpoints in TG 3.x/4.x.
                connection.getToken(secret=config.secret or None, is_global=False)
        except Exception:
            connection.close()
            raise
        self._connection = connection
        return connection

    def run_query(self, query_name: str, txn_id: str) -> list[dict]:
        if query_name not in INSTALLED_QUERIES:
            raise TigerGraphClientError("input", "Query is not one of the four installed investigation queries.")
        if not isinstance(txn_id, str) or not txn_id.strip():
            raise TigerGraphClientError("input", "txn_id must be a nonempty string.")
        try:
            result = self._connect().runInstalledQuery(
                query_name, params={"txn_id": txn_id},
                timeout=max(1, int(self.settings.timeout * 1000)), usePost=False,
            )
        except (requests.Timeout, requests.HTTPError, requests.RequestException, TigerGraphException) as exc:
            raise _sanitize_sdk_error(exc) from None
        except (ValueError, KeyError, TypeError):
            raise TigerGraphClientError("response_shape", "TigerGraph returned an invalid response envelope.") from None
        if not isinstance(result, list) or not all(isinstance(item, dict) for item in result):
            raise TigerGraphClientError("response_shape", "TigerGraph query results must be a list of objects.")
        return result

    def get_edges(self, source_vertex_type: str, source_vertex_id: str, edge_type: str, *, limit: int) -> list[dict]:
        """Read incident edges using the verified pyTigerGraph getEdges API.

        The SDK returns the REST++ ``results`` array. The SDK's timeout argument
        is seconds; the client's HTTP adapter independently enforces the same
        configured network timeout.
        """
        if source_vertex_type not in EDGE_LOOKUP_TYPES or edge_type not in EDGE_LOOKUP_TYPES[source_vertex_type]:
            raise TigerGraphClientError("input", "Edge lookup is not an approved investigation relationship.")
        if not isinstance(source_vertex_id, str) or not source_vertex_id.strip():
            raise TigerGraphClientError("input", "source vertex ID must be a nonempty string.")
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= MAX_EDGE_LOOKUP_LIMIT:
            raise TigerGraphClientError("input", "Edge lookup limit is outside the supported range.")
        try:
            result = self._connect().getEdges(
                sourceVertexType=source_vertex_type,
                sourceVertexId=source_vertex_id,
                edgeType=edge_type,
                limit=limit,
                fmt="py",
                timeout=max(1, int(self.settings.timeout)),
            )
        except (requests.Timeout, requests.HTTPError, requests.RequestException, TigerGraphException) as exc:
            raise _sanitize_sdk_error(exc) from None
        except (ValueError, KeyError, TypeError):
            raise TigerGraphClientError("response_shape", "TigerGraph returned an invalid edge response.") from None
        if not isinstance(result, list) or not all(isinstance(item, dict) for item in result):
            raise TigerGraphClientError("response_shape", "TigerGraph edge results must be a list of objects.")
        return result

    def close(self):
        if self._connection is not None:
            self._connection.close()
            self._connection = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def _sanitize_sdk_error(exc: Exception) -> TigerGraphClientError:
    if isinstance(exc, requests.Timeout):
        return TigerGraphClientError("timeout", "TigerGraph request timed out.")
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else None
        body = exc.response.text if exc.response is not None else ""
        if status == 500 and "Auto start is not enabled for this workspace" in body:
            return TigerGraphClientError(
                "workspace", "TigerGraph workspace is stopped and auto-start is disabled. Resume the configured workspace and wait for Running/Ready.", "500",
            )
        return TigerGraphClientError(
            "http", f"TigerGraph HTTP request failed (status {status}).",
            str(status) if status is not None else None,
        )
    if isinstance(exc, requests.RequestException):
        return TigerGraphClientError("network", "Unable to reach TigerGraph.")
    # SDK/server messages may echo authentication data; only pass a constrained code.
    code = str(exc.code) if isinstance(exc, TigerGraphException) and exc.code is not None else None
    if code is not None and not re.fullmatch(r"(?:REST|GSQL|E)-[0-9]+", code):
        code = None
    return TigerGraphClientError(
        "application", "TigerGraph rejected the request or returned invalid JSON.", code,
    )
