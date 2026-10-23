import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 }); }
  const { case_id, flagged_txn_id } = body ?? {};
  if (typeof case_id !== "string" || !case_id.trim() || typeof flagged_txn_id !== "string" || !flagged_txn_id.trim()) {
    return NextResponse.json({ error: "case_id and flagged_txn_id are required" }, { status: 400 });
  }
  try {
    const response = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/investigate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id, flagged_txn_id }), cache: "no-store",
      signal: AbortSignal.timeout(300_000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      const message = typeof detail === "string" ? detail : detail?.message;
      return NextResponse.json({ error: message || `Backend returned HTTP ${response.status}.` }, { status: response.status });
    }
    if (data?.status !== "success" || !data.result) {
      return NextResponse.json({ error: "Backend returned an invalid investigation response." }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timedOut
      ? "Investigation timed out. The backend may still be processing the case."
      : "Cannot reach the investigation backend. Check that it is running on the configured address." },
      { status: timedOut ? 504 : 502 });
  }
}
