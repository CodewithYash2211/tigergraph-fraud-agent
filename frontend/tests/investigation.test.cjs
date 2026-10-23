const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
// Compile existing TypeScript modules in memory; no test framework or emitted files.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith("@/") ? path.join(__dirname, "..", name.slice(2)) : name, ...args);
};
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
require.extensions[".tsx"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { mapBackendToAnswerFile, triggerBackendInvestigation } = require("../lib/api/backend.ts");
const { getEvidenceForCase, getGraphForCase, getAgentEventsForCase, getNbaForCase } = require("../lib/data/investigation-data.ts");
const { AgentTrace } = require("../components/investigation/Assessment.tsx");
const { Recommendation, ApprovalPanel } = require("../components/investigation/Decision.tsx");
const { ReturnedEntityEvidence } = require("../components/graph/ReturnedEntityEvidence.tsx");
const { POST } = require("../app/api/investigate/route.ts");
const fixture = require("./live-HHG-001.json");

test("observed live response maps probability, exposure and actions without asserting graph success", () => {
  const answer = mapBackendToAnswerFile(fixture, "HHG-001");
  assert.equal(answer.case.fraud_probability, .61);
  assert.equal(answer.case.exposure_usd, 77.07);
  assert.equal(answer.next_best_actions.final[0].action, "CREATE_CASE");
  assert.equal(answer.live.graph_status, "unavailable");
  assert.equal(answer.live.persistence_status, "not_reported");
  assert.equal(answer.case.written_to_graph, false);
  assert.equal(answer.live.pattern, "UNKNOWN");
  assert.ok(answer.case.evidence.some(e => e.claim.includes("status 500")));
});

test("live render helpers do not inject demo confidence, MCP calls, device rings or policy rules", () => {
  const answer = mapBackendToAnswerFile(fixture, "HHG-001");
  assert.ok(getEvidenceForCase("HHG-001", answer).every(e => e.confidence === null));
  const graph = getGraphForCase("HHG-001", answer);
  const labels = graph.entities.map(e => e.label);
  assert.ok(labels.includes("TXN 3514030"));
  assert.equal(graph.entities.length, 1, "unavailable graph response should only show the flagged transaction");
  assert.equal(graph.relations.length, 0, "transaction CSV card data must not be drawn as a TigerGraph edge");
  assert.ok(getAgentEventsForCase("HHG-001", answer).every(e => !e.tool.includes("mcp.")));
  assert.deepEqual(getNbaForCase("HHG-001", answer).after.rules, []);
});

test("graph data lists query-returned IDs and does not synthesize relationship edges", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.connected_customers = ["customer-from-query"];
  graphData.connected_cards = [];
  graphData.connected_devices = [];
  graphData.connected_emails = ["email-from-query"];
  graphData.connected_regions = ["region-from-query"];
  graphData.related_transactions = Array.from({ length: 40 }, (_, i) => `related-${i}`);
  graphData.related_transactions.push("related-0");
  graphData.pattern_assessment.related_count = 40;
  response.result.graph_query_status = "complete";
  response.result.graph_query_status = "complete";
  response.result.connected_card_ids = [];
  response.result.connected_device_profiles = [];

  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const graph = getGraphForCase("HHG-001", answer);
  const labels = graph.entities.map(e => e.label);
  assert.ok(labels.includes("customer-from-query"));
  assert.ok(labels.includes("email-from-query"));
  assert.ok(labels.includes("region-from-query"));
  assert.ok(labels.includes("TXN related-0"));
  assert.ok(!labels.includes("21139"), "card1 from the transaction row is not a graph relationship");
  assert.equal(graph.relatedTransactionCount, 40);
  assert.equal(answer.live.graph_summary_related_count, 40);
  assert.equal(answer.live.graph_relationships.transactions.length, 40, "duplicate IDs are removed before counting");
  assert.equal(graph.omittedRelatedTransactionCount, 28);
  assert.equal(graph.relations.length, 0, "the query response has no explicit edge endpoint pairs");
  const positions = graph.entities.map(e => `${e.x},${e.y}`);
  assert.equal(new Set(positions).size, positions.length, "returned entity categories should not overlap at shared singleton angles");
  assert.deepEqual(graph.suspiciousPath, [], "a query result without suspicious-path evidence must not imply one");
});

test("verified live-shaped edges map by typed endpoints and retain undirected metadata", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.connected_cards = ["same-id"];
  graphData.connected_emails = ["same-id"];
  graphData.related_transactions = ["related-1"];
  graphData.edge_metadata = { limit: 200, returned: 3, truncated: false, status: "complete", source: "pyTigerGraph.getEdges", error: null };
  graphData.graph_edges = [
    { e_type: "MADE", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "Card", to_id: "same-id", attributes: {} },
    { e_type: "PURCHASER_EMAIL", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "EmailDomain", to_id: "same-id", attributes: {} },
    { e_type: "MADE", directed: false, from_type: "Card", from_id: "same-id", to_type: "Transaction", to_id: "related-1", attributes: {} },
  ];
  const graph = getGraphForCase("HHG-001", mapBackendToAnswerFile(response, "HHG-001"));
  assert.equal(graph.relations.length, 3);
  assert.deepEqual(graph.relations.map(edge => edge.edgeType), ["MADE", "PURCHASER_EMAIL", "MADE"]);
  assert.ok(graph.relations.every(edge => edge.directed === false));
  assert.notEqual(graph.relations[0].target, graph.relations[1].target, "identical ID strings on Card and EmailDomain stay distinct nodes");
});

test("duplicate edge records are deduplicated, while distinct edge attributes remain distinct", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.connected_cards = ["card-1"];
  const one = { e_type: "MADE", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "Card", to_id: "card-1", attributes: { role: "primary" } };
  graphData.graph_edges = [one, structuredClone(one), { ...one, attributes: { role: "secondary" } }];
  const graph = getGraphForCase("HHG-001", mapBackendToAnswerFile(response, "HHG-001"));
  assert.equal(graph.relations.length, 2);
});

test("invalid IDs and endpoints outside the current returned nodes never render as edges", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.connected_cards = ["card-1"];
  graphData.related_transactions = Array.from({ length: 13 }, (_, i) => `rel-${i}`);
  graphData.graph_edges = [
    { e_type: "MADE", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "Card", to_id: "card-1", attributes: {} },
    { e_type: "MADE", directed: false, from_type: "Transaction", from_id: "", to_type: "Card", to_id: "card-1", attributes: {} },
    { e_type: "MADE", directed: false, from_type: "Card", from_id: "card-1", to_type: "Transaction", to_id: "rel-12", attributes: {} },
  ];
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  assert.equal(answer.live.graph_edges.length, 2, "malformed endpoint IDs are rejected by the API adapter");
  const firstPage = getGraphForCase("HHG-001", answer, 0);
  assert.equal(firstPage.relations.length, 1, "the second edge endpoint is not on the visible page");
  const secondPage = getGraphForCase("HHG-001", answer, 1);
  assert.equal(secondPage.relations.length, 2, "the second page adds the real edge whose transaction endpoint becomes visible");
});

test("ID-only and empty edge responses preserve the 927 related IDs and 12-item pagination", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.related_transactions = Array.from({ length: 927 }, (_, i) => `related-${i}`);
  graphData.pattern_assessment.related_count = 927;
  graphData.graph_edges = [];
  graphData.edge_metadata = { limit: 200, returned: 0, truncated: false, status: "complete", source: "pyTigerGraph.getEdges", error: null };
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const first = getGraphForCase("HHG-001", answer, 0);
  const last = getGraphForCase("HHG-001", answer, 77);
  assert.equal(first.relatedTransactionCount, 927);
  assert.equal(first.graphSummaryRelatedCount, 927);
  assert.equal(first.relatedTransactionPageSize, 12);
  assert.equal(first.relatedTransactionPageCount, 78);
  assert.equal(first.entities.filter(e => e.kind === "transaction" && !e.flagged).length, 12);
  assert.equal(last.entities.filter(e => e.kind === "transaction" && !e.flagged).length, 3);
  assert.equal(first.relations.length, 0);
  assert.equal(last.relations.length, 0);
});

test("215 related transactions use a collision-free 12-item grid and concise node labels", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.connected_customers = ["customer-1"];
  graphData.connected_cards = ["card-1"];
  graphData.connected_devices = ["device-1"];
  graphData.connected_emails = ["mail.example"];
  graphData.connected_regions = ["region-1"];
  graphData.related_transactions = Array.from({ length: 215 }, (_, i) => `related-${i}`);
  graphData.pattern_assessment.related_count = 215;
  graphData.graph_edges = [
    { e_type: "MADE", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "Card", to_id: "card-1", attributes: {} },
    { e_type: "OWNS", directed: false, from_type: "Card", from_id: "card-1", to_type: "Customer", to_id: "customer-1", attributes: {} },
    { e_type: "FROM_DEVICE", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "DeviceProfile", to_id: "device-1", attributes: {} },
    { e_type: "PURCHASER_EMAIL", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "EmailDomain", to_id: "mail.example", attributes: {} },
    { e_type: "BILLED_IN", directed: false, from_type: "Transaction", from_id: "3514030", to_type: "BillingRegion", to_id: "region-1", attributes: {} },
  ];
  const graph = getGraphForCase("HHG-001", mapBackendToAnswerFile(response, "HHG-001"));
  const related = graph.entities.filter(entity => entity.kind === "transaction" && !entity.flagged);
  assert.equal(graph.relatedTransactionCount, 215);
  assert.equal(graph.relatedTransactionPageSize, 12);
  assert.equal(related.length, 12);
  assert.ok(related.every(entity => entity.sub === ""), "related cards do not repeat a long TigerGraph description");
  assert.deepEqual(graph.relations.map(edge => edge.edgeType), ["MADE", "OWNS", "FROM_DEVICE", "PURCHASER_EMAIL", "BILLED_IN"]);

  const bounds = graph.entities.map(entity => {
    const size = entity.kind === "transaction" ? (entity.flagged ? [232, 92] : [200, 68])
      : entity.kind === "account" ? [96, 64]
      : entity.kind === "customer" ? [80, 80]
      : entity.kind === "device" ? [60, 76] : [72, 72];
    const hasCaption = entity.kind !== "transaction" || Boolean(entity.sub);
    const width = hasCaption ? Math.max(size[0], 260) : size[0];
    const x = entity.x + (size[0] - width) / 2;
    const height = size[1] + (hasCaption ? 64 : 0);
    return { id: entity.id, x, y: entity.y, width, height };
  });
  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i], b = bounds[j];
      const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test("edge retrieval failure is distinct from a successful empty result", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.connected_cards = ["card-1"];
  graphData.edge_metadata = { limit: 200, returned: 0, truncated: false, status: "failed", source: "pyTigerGraph.getEdges", error: "TigerGraph HTTP request failed (status 403)." };
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const graph = getGraphForCase("HHG-001", answer);
  assert.equal(graph.relations.length, 0);
  assert.equal(graph.edgeMetadata.status, "failed");
  const html = renderToStaticMarkup(React.createElement(ReturnedEntityEvidence, {
    entities: graph.entities, relatedTransactionCount: graph.relatedTransactionCount,
    graphSummaryRelatedCount: graph.graphSummaryRelatedCount, graphStatus: answer.live.graph_status,
    edgeMetadata: graph.edgeMetadata, visibleEdgeCount: graph.relations.length,
    relatedTransactionPage: graph.relatedTransactionPage, relatedTransactionPageCount: graph.relatedTransactionPageCount,
    relatedTransactionPageSize: graph.relatedTransactionPageSize, onRelatedTransactionPage: () => {},
  }));
  assert.match(html, /edge retrieval failed.*status 403/i);
});

test("visualization cap is disclosed separately from related-ID and summary counts", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.related_transactions = Array.from({ length: 927 }, (_, i) => `related-${i}`);
  graphData.pattern_assessment.related_count = 927;
  graphData.edge_metadata = { limit: 200, returned: 200, truncated: true, status: "partial", source: "pyTigerGraph.getEdges", error: null };
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const graph = getGraphForCase("HHG-001", answer);
  const html = renderToStaticMarkup(React.createElement(ReturnedEntityEvidence, {
    entities: graph.entities, relatedTransactionCount: graph.relatedTransactionCount,
    graphSummaryRelatedCount: graph.graphSummaryRelatedCount, graphStatus: answer.live.graph_status,
    edgeMetadata: graph.edgeMetadata, visibleEdgeCount: graph.relations.length,
    relatedTransactionPage: graph.relatedTransactionPage, relatedTransactionPageCount: graph.relatedTransactionPageCount,
    relatedTransactionPageSize: graph.relatedTransactionPageSize, onRelatedTransactionPage: () => {},
  }));
  assert.match(html, /200-edge visualization cap was reached/i);
  assert.match(html, /not the total graph-edge count or the related-transaction count/i);
  assert.match(html, /927 unique IDs in the returned list/);
});

test("returned graph evidence UI identifies ID-only results and keeps summary count separate", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.related_transactions = ["related-a", "related-b"];
  graphData.pattern_assessment.related_count = 2;
  response.result.graph_query_status = "complete";
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const graph = getGraphForCase("HHG-001", answer);
  const html = renderToStaticMarkup(React.createElement(ReturnedEntityEvidence, {
    entities: graph.entities,
    relatedTransactionCount: graph.relatedTransactionCount,
    graphSummaryRelatedCount: graph.graphSummaryRelatedCount,
    graphStatus: answer.live.graph_status,
    relatedTransactionPage: graph.relatedTransactionPage,
    relatedTransactionPageCount: graph.relatedTransactionPageCount,
    relatedTransactionPageSize: graph.relatedTransactionPageSize,
    onRelatedTransactionPage: () => {},
  }));
  assert.match(html, /edge retrieval is unavailable/i);
  assert.match(html, /2 unique IDs in the returned list/);
  assert.match(html, /separate TigerGraph summary also reports 2/);
  assert.match(html, /TXN 3514030/);
});

test("graph evidence can omit the repeated flagged-transaction card when a page summary is present", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  graphData.connected_cards = ["card-from-query"];
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const graph = getGraphForCase("HHG-001", answer);
  const html = renderToStaticMarkup(React.createElement(ReturnedEntityEvidence, {
    entities: graph.entities, relatedTransactionCount: graph.relatedTransactionCount,
    graphSummaryRelatedCount: graph.graphSummaryRelatedCount, graphStatus: answer.live.graph_status,
    edgeMetadata: graph.edgeMetadata, visibleEdgeCount: graph.relations.length,
    relatedTransactionPage: graph.relatedTransactionPage, relatedTransactionPageCount: graph.relatedTransactionPageCount,
    relatedTransactionPageSize: graph.relatedTransactionPageSize, onRelatedTransactionPage: () => {},
    showFlaggedSummary: false,
  }));
  assert.doesNotMatch(html, /aria-label="Flagged transaction"/);
  assert.match(html, /card-from-query/, "returned entity evidence remains visible");
});

test("a complete TigerGraph response with empty relationship lists is not rendered as unavailable", () => {
  const response = structuredClone(fixture);
  const graphData = response.result.evidence.find(e => e.type === "graph").data;
  graphData.status = "complete";
  for (const key of ["connected_customers", "connected_cards", "connected_devices", "connected_emails", "connected_regions", "related_transactions"]) graphData[key] = [];
  response.result.graph_query_status = "complete";
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const graph = getGraphForCase("HHG-001", answer);
  assert.equal(answer.live.graph_status, "complete");
  assert.equal(graph.entities.length, 1);
  assert.equal(graph.relations.length, 0);
});

test("agent timeline formats long timestamps and constrains wrapping grid columns", () => {
  const html = renderToStaticMarkup(React.createElement(AgentTrace, {
    stage: 3, running: false, detailed: true,
    events: [{ id: "q", stage: 1, t: "2026-10-23T12:34:56.000Z", step: "Graph query",
      title: "risk_pattern_summary: complete", detail: "A long query result description that should wrap within its column.", tool: "pyTigerGraph.runInstalledQuery" }],
  }));
  assert.match(html, /<time[^>]*datetime="2026-10-23T12:34:56\.000Z"/i);
  assert.match(html, /min-w-0/);
  assert.match(html, /risk_pattern_summary: complete/);
  const shownTime = html.match(/<time[^>]*>(.*?)<\/time>/is)?.[1] || "";
  assert.match(shownTime, /class="block"/);
  assert.doesNotMatch(shownTime, /2026-10-23T12:34:56\.000Z/);
});

test("decision reasoning list uses unique keys while retaining duplicate and distinct explanations", () => {
  const nba = getNbaForCase("HHG-001", mapBackendToAnswerFile(fixture, "HHG-001"));
  nba.after.reasoning = ["Shared policy reason", "Shared policy reason", "Distinct second reason"];
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const html = renderToStaticMarkup(React.createElement(Recommendation, {
      version: "after", showCompare: false, nba, whatChanged: "No change",
    }));
    assert.equal((html.match(/Shared policy reason/g) || []).length, 2);
    assert.ok(html.includes("Distinct second reason"));
    assert.ok(!errors.some(message => /unique.*key|same key/i.test(message)));
  } finally {
    console.error = originalError;
  }
});

test("live evidence-request status is preserved and unavailable responses are not presented as customer replies", () => {
  const response = structuredClone(fixture);
  response.result.evidence_requests = [{
    action: "VERIFY_WITH_CUSTOMER", iteration: 1, status: "SIMULATED_UNAVAILABLE", simulated: true,
    response: "UNKNOWN", assumption: "No real customer interaction is available.", reason: "Evidence remains insufficient.",
  }];
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  assert.deepEqual(answer.evidence_requests[0], {
    type: "customer_validation", asked_after_step: 1, reason: "Evidence remains insufficient.",
    status: "SIMULATED_UNAVAILABLE", simulated: true, response: "UNKNOWN",
    assumption: "No real customer interaction is available.", assumed_response: undefined,
  });
  const html = renderToStaticMarkup(React.createElement(ApprovalPanel, {
    decision: "pending", decidedAt: null, rejectReason: null, onDecide: () => {}, caseId: "HHG-001",
  }));
  assert.match(html, /browser session/);
  assert.match(html, /do not create an approval queue/);
  assert.doesNotMatch(html, /handed to a fraud manager/i);
});

test("missing backend assessment score stays unavailable instead of becoming zero", () => {
  const response = structuredClone(fixture);
  delete response.result.fraud_probability;
  const transaction = response.result.evidence.find(e => e.type === "transaction").data;
  delete transaction.risk_score;
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  assert.equal(answer.case.fraud_probability, null);
  assert.equal(answer._initial_fraud_probability, undefined);
  assert.equal(getNbaForCase("HHG-001", answer).after.probability, null);
  const html = renderToStaticMarkup(React.createElement(Recommendation, {
    version: "after", showCompare: false, nba: getNbaForCase("HHG-001", answer), scoreAvailable: true,
  }));
  assert.match(html, /Not reported/);
  assert.doesNotMatch(html, /0\.00/);
});

test("query errors redact credentials before evidence or provenance reaches the UI", () => {
  const response = structuredClone(fixture);
  response.result.graph_query_provenance.investigate_transaction.error = {
    message: "Authorization: hunter2 Bearer abc.def?token=querysecret",
  };
  const answer = mapBackendToAnswerFile(response, "HHG-001");
  const displayed = JSON.stringify({ evidence: answer.case.evidence, provenance: answer.live.query_provenance });
  for (const secret of ["hunter2", "abc.def", "querysecret"]) assert.ok(!displayed.includes(secret));
  assert.ok(displayed.includes("[redacted]"));
});

test("client sends exactly one POST through the existing proxy", async () => {
  const original = global.fetch; const calls = [];
  global.fetch = async (...args) => { calls.push(args); return Response.json(fixture); };
  try {
    const result = await triggerBackendInvestigation("HHG-001", "3514030");
    assert.equal(result.source, "agent"); assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "/api/investigate/");
    assert.equal(calls[0][1].method, "POST");
    assert.deepEqual(JSON.parse(calls[0][1].body), { case_id: "HHG-001", flagged_txn_id: "3514030" });
  } finally { global.fetch = original; }
});

test("client surfaces API errors without retrying or returning demo results", async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return Response.json({ error: "Transaction not found" }, { status: 404 }); };
  try {
    await assert.rejects(triggerBackendInvestigation("HHG-001", "missing"), /Transaction not found/);
    assert.equal(calls, 1);
  } finally { global.fetch = original; }
});

test("client rejects mismatched or malformed successful responses", async () => {
  const original = global.fetch;
  global.fetch = async () => Response.json({ status: "success", result: { case_id: "other" } });
  try { await assert.rejects(triggerBackendInvestigation("HHG-001", "3514030"), /invalid or mismatched/); }
  finally { global.fetch = original; }
});

test("proxy forwards to the configured backend and preserves the actual response", async () => {
  const original = global.fetch; let url;
  global.fetch = async (target) => { url = target; return Response.json(fixture); };
  try {
    const result = await POST(new Request("http://localhost/api/investigate/", { method: "POST", body: JSON.stringify({ case_id: "HHG-001", flagged_txn_id: "3514030" }) }));
    assert.equal(url, "http://127.0.0.1:8000/investigate");
    assert.deepEqual(await result.json(), fixture);
  } finally { global.fetch = original; }
});

test("proxy exposes controlled backend errors and handles network failure", async () => {
  const original = global.fetch;
  const request = () => new Request("http://localhost/api/investigate/", { method: "POST", body: JSON.stringify({ case_id: "HHG-001", flagged_txn_id: "missing" }) });
  try {
    global.fetch = async () => Response.json({ detail: { message: "Transaction missing" } }, { status: 404 });
    let result = await POST(request()); assert.equal(result.status, 404);
    assert.equal((await result.json()).error, "Transaction missing");
    global.fetch = async () => { throw new Error("internal transport details"); };
    result = await POST(request()); assert.equal(result.status, 502);
    assert.match((await result.json()).error, /Cannot reach/);
  } finally { global.fetch = original; }
});
