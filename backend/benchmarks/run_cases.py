"""Run from backend: python -B -m benchmarks.run_cases [--offline]."""
import argparse
import csv
import json
from pathlib import Path

from agent.workflow import fraud_agent
from tools.artifacts import CASES_DIR, now, write_json
from tools.transaction import get_transactions
from tools.triggers import CASE_PACK, InvestigationError


def run_cases(*, case_pack=None, output_dir=None, offline=False, agent=None, transactions=None):
    agent = agent or fraud_agent
    directory = Path(output_dir or CASES_DIR)
    with Path(case_pack or CASE_PACK).open(encoding="utf-8-sig", newline="") as handle:
        cases = list(csv.DictReader(handle))
    lookup_failed = False
    if transactions is None:
        try:
            transactions = get_transactions(row["flagged_txn_id"] for row in cases)
        except (OSError, ValueError, KeyError):
            transactions = {}
            lookup_failed = True
    rows = []
    for case in cases:
        txn_id = case["flagged_txn_id"]
        row = {"case_id": case["case_id"], "transaction_id": txn_id,
               "trigger_risk_score": case.get("risk_score"), "risk_score": None,
               "verdict": None, "pattern": None, "uncertainty": None,
               "next_best_action": None, "approval_route": None, "case_status": "FAILED",
               "sar_required": None, "graph_status": "not_run",
               "graph_persistence_status": "not_attempted", "graph_persistence_error": None, "error": None}
        try:
            if lookup_failed:
                raise InvestigationError("transaction_data_unavailable", "Transaction dataset could not be read.", 503)
            result = agent.invoke({"case_id": case["case_id"], "flagged_txn_id": txn_id,
                                   "transaction_record": transactions.get(txn_id, {"found": False}),
                                   "graph_mode": "offline" if offline else "live",
                                   "case_output_dir": str(directory)})
            actions = result["final_actions"]
            first = actions[0] if actions else {"action": "NO_ACTION", "route": "auto"}
            row.update(risk_score=result["fraud_probability"], verdict=result["verdict"],
                       pattern=result["pattern"], uncertainty=result["uncertainty"],
                       next_best_action=first["action"], approval_route=first["route"],
                       case_status=result["case_status"], sar_required=result["file_report"],
                       graph_status=result["graph_query_status"],
                       graph_persistence_status=result.get("graph_persistence", {}).get("status", "not_attempted"),
                       graph_persistence_error=result.get("graph_persistence", {}).get("error"))
        except InvestigationError as exc:
            row["error"] = {"code": exc.code, "message": str(exc)}
        except Exception:
            row["error"] = {"code": "investigation_failed", "message": "Case could not be completed."}
        rows.append(row)
    report = {"mode": "offline" if offline else "live", "generated_at": now(), "total": len(rows),
              "completed": sum(r["error"] is None for r in rows),
              "failed": sum(r["error"] is not None for r in rows),
              "graph_complete": sum(r["graph_status"] == "complete" for r in rows), "results": rows}
    write_json(directory / "benchmark_results.json", report)
    with (directory / "benchmark_summary.csv").open("w", encoding="utf-8", newline="") as handle:
        fields = list(rows[0]) if rows else ["case_id", "transaction_id", "error"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, sort_keys=True) if isinstance(v, (dict, list)) else v
                             for k, v in row.items()})
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Never contact TigerGraph or read its credentials; mark graph evidence unavailable.")
    args = parser.parse_args()
    report = run_cases(offline=args.offline)
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, indent=2))
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
