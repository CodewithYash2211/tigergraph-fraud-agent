"""Fail-open shadow inference via the isolated ML interpreter, not production imports."""
import json
import math
from pathlib import Path
import subprocess

from ml.shadow import ARTIFACT_DIR, THRESHOLD, unavailable

BACKEND = Path(__file__).resolve().parents[1]
ML_PYTHON = BACKEND / ".venv-ml" / "Scripts" / "python.exe"


def score_transaction(transaction):
    try:
        raw = transaction.get("raw")
        if not isinstance(raw, dict) or str(raw.get("TransactionID")) != str(transaction.get("transaction_id")):
            return unavailable("malformed_transaction")
        if not (ARTIFACT_DIR / "manifest.json").is_file():
            return unavailable("artifact_missing")
        if not ML_PYTHON.is_file():
            return unavailable("environment_unavailable")
        response = subprocess.run(
            [str(ML_PYTHON), "-B", "-m", "ml.shadow"], input=json.dumps(raw),
            text=True, capture_output=True, timeout=45, cwd=str(BACKEND),
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if response.returncode:
            return unavailable("worker_failed")  # Never expose subprocess stderr.
        result = json.loads(response.stdout)
        if result.get("available") is not True:
            code = result.get("error", {}).get("code")
            allowed = {"malformed_transaction", "artifact_or_identity_missing", "schema_mismatch",
                       "environment_mismatch", "artifact_integrity_error", "inference_failed", "duplicate_identity"}
            return unavailable(code if code in allowed else "worker_failed")
        score = result.get("fraud_score")
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score) or not 0 <= score <= 1:
            return unavailable("invalid_probability")
        if result.get("threshold") != THRESHOLD:
            return unavailable("schema_mismatch")
        # Construct our own allowlisted response: worker output cannot add actions/state.
        answer = unavailable("unused")
        positive = score >= THRESHOLD
        answer.update(available=True, error=None, fraud_score=score,
                      prediction="fraud" if positive else "cleared",
                      risk_level="above_model_threshold" if positive else "below_model_threshold")
        return answer
    except subprocess.TimeoutExpired:
        return unavailable("inference_timeout")
    except Exception:
        return unavailable("inference_failed")
