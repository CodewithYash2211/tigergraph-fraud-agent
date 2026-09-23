"""Environment-only configuration; importing this module never connects to TigerGraph."""

import math
import os
import re
from dataclasses import dataclass, field
from typing import Mapping
from urllib.parse import urlsplit


class TigerGraphConfigError(ValueError):
    """Missing or invalid configuration, without credential values."""


@dataclass(frozen=True)
class TigerGraphSettings:
    base_url: str
    graph: str = "HHGOA_Fraud"
    timeout: float = 60.0
    token: str = field(default="", repr=False)
    secret: str = field(default="", repr=False)
    username: str = field(default="", repr=False)
    password: str = field(default="", repr=False)

    def __post_init__(self):
        try:
            url = urlsplit(self.base_url)
            port = url.port
        except ValueError:
            raise TigerGraphConfigError("Invalid TIGERGRAPH_BASE_URL.") from None
        if (
            url.scheme not in ("http", "https") or not url.hostname
            or url.username is not None or url.password is not None
            or url.query or url.fragment
            or url.path.rstrip("/") not in ("", "/restpp")
            or (port is not None and port <= 0)
            or any(c.isspace() for c in self.base_url)
        ):
            raise TigerGraphConfigError(
                "TIGERGRAPH_BASE_URL must be an HTTP(S) origin, optionally ending in /restpp."
            )
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", self.graph):
            raise TigerGraphConfigError("Invalid TIGERGRAPH_GRAPH.")
        if not math.isfinite(self.timeout) or self.timeout < 0.001:
            raise TigerGraphConfigError("TIGERGRAPH_TIMEOUT must be finite and at least 0.001 seconds.")
        if not (self.token or self.secret or (self.username and self.password)):
            raise TigerGraphConfigError(
                "Set TIGERGRAPH_TOKEN, TIGERGRAPH_SECRET, or both "
                "TIGERGRAPH_USERNAME and TIGERGRAPH_PASSWORD."
            )

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None):
        env = os.environ if environ is None else environ
        base_url = env.get("TIGERGRAPH_BASE_URL", "").strip().rstrip("/")
        if not base_url:
            raise TigerGraphConfigError("Missing TIGERGRAPH_BASE_URL.")
        try:
            timeout = float(env.get("TIGERGRAPH_TIMEOUT", "60"))
        except (ValueError, TypeError):
            raise TigerGraphConfigError("TIGERGRAPH_TIMEOUT must be a number of seconds.") from None
        return cls(
            base_url=base_url,
            graph=env.get("TIGERGRAPH_GRAPH", "HHGOA_Fraud").strip(),
            timeout=timeout,
            token=env.get("TIGERGRAPH_TOKEN", "").strip(),
            secret=env.get("TIGERGRAPH_SECRET", "").strip(),
            username=env.get("TIGERGRAPH_USERNAME", "").strip(),
            # Password whitespace can be significant.
            password=env.get("TIGERGRAPH_PASSWORD", ""),
        )
