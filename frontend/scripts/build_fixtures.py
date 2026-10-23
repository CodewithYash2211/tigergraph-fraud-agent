"""
Build small JSON fixtures for the frontend from the HHGOA dataset.
The browser never loads transactions.csv; it only gets what the demo needs.

usage: python scripts/build_fixtures.py <dataset_dir>
needs: case_pack.csv, closed_cases_history.csv, identity.csv (transactions.csv optional, not required)
"""
import json, re, sys, os
import pandas as pd

src = sys.argv[1] if len(sys.argv) > 1 else "data"
out = os.path.join(os.path.dirname(__file__), "..", "lib", "data", "fixtures")
os.makedirs(out, exist_ok=True)

cp = pd.read_csv(f"{src}/case_pack.csv", dtype=str).fillna("")
cc = pd.read_csv(f"{src}/closed_cases_history.csv", dtype=str).fillna("")
idt = pd.read_csv(f"{src}/identity.csv", dtype=str)

def profile(row):
    parts = [row.get("DeviceInfo"), row.get("id_30"), row.get("id_31"), row.get("id_33")]
    return " | ".join(p if isinstance(p, str) and p else "?" for p in parts)

idt["profile"] = idt.apply(profile, axis=1)
txn_to_cc = {}
for _, c in cc.iterrows():
    for t in c.txn_ids.split("|"):
        if t:
            txn_to_cc.setdefault(t, []).append(c.case_id)

cases, needed_cc = [], set()
for _, r in cp.iterrows():
    m_amt = re.search(r"\$([\d,]+\.\d\d)", r.trigger_text)
    m_reg = re.search(r"billing region ([\d.]+)", r.trigger_text)
    ident = idt[idt.TransactionID == r.flagged_txn_id]
    device = None
    device_neighbours, device_cc = [], []
    if len(ident):
        i = ident.iloc[0]
        g = lambda k: (i[k] if isinstance(i[k], str) else None)
        device = {
            "profile": i["profile"], "device_type": g("DeviceType"), "device_info": g("DeviceInfo"),
            "os": g("id_30"), "browser": g("id_31"), "screen": g("id_33"),
            "new_for_account": g("id_15"), "proxy": g("id_23"), "match_status": g("id_34"),
        }
        if not i["profile"].startswith("? | ?"):
            same = idt[idt.profile == i["profile"]]
            device_neighbours = sorted(same.TransactionID.tolist(), key=int)
            device_cc = sorted({c for t in device_neighbours for c in txn_to_cc.get(t, [])})
    cust_cc = cc[cc.customer_id == r.customer_id].case_id.tolist()
    needed_cc.update(device_cc)
    needed_cc.update(cust_cc)
    cases.append({
        "case_id": r.case_id, "opened_at": r.opened_at, "trigger_type": r.trigger_type, "trigger_text": r.trigger_text,
        "flagged_txn_id": r.flagged_txn_id, "card_id": r.card_id, "customer_id": r.customer_id,
        "risk_score": float(r.risk_score) if r.risk_score else None,
        "amount_usd": float(m_amt.group(1).replace(",", "")) if m_amt else None,
        "channel": "online" if "online" in r.trigger_text else ("in_person" if m_reg else ("online" if device else None)),
        "billing_region": m_reg.group(1) if m_reg else None,
        "device": device,
        "device_neighbour_count": len(device_neighbours),
        "device_neighbours_exam_window": [t for t in device_neighbours if int(t) >= 3440000 and t != r.flagged_txn_id][:12],
        "customer_closed_cases": cust_cc,
        "device_closed_cases": device_cc,
    })

keep = cc[cc.case_id.isin(needed_cc) | (cc.pattern == "undocumented")]
closed = [{
    **{k: row[k] for k in ["case_id", "customer_id", "card_id", "opened_at", "closed_at", "outcome", "pattern",
                           "first_fraud_txn_id", "actions_taken", "report_filed", "analyst_notes"]},
    "txn_ids": [t for t in row.txn_ids.split("|") if t],
    "connected_card_ids": [t for t in row.connected_card_ids.split("|") if t],
    "n_txns": int(row.n_txns or 0), "exposure_usd": float(row.exposure_usd or 0),
} for _, row in keep.iterrows()]

stats = {
    "total": int(len(cc)),
    "by_outcome": cc.outcome.value_counts().to_dict(),
    "by_pattern": cc.pattern.value_counts().to_dict(),
    "identity_records": int(len(idt)),
}

json.dump(cases, open(f"{out}/case_pack.json", "w"), indent=1)
json.dump(closed, open(f"{out}/closed_cases.json", "w"), indent=1)
json.dump(stats, open(f"{out}/closed_case_stats.json", "w"), indent=1)
print(f"{len(cases)} cases, {len(closed)} closed cases kept, stats written to {out}")
