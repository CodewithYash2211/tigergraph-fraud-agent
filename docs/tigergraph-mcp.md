# TigerGraph MCP boundary — partial integration

## What is implemented

The existing synchronous pyTigerGraph path remains the default and is unchanged.
`get_connected_entities(txn_id, client=...)` is the existing injectable boundary:
the client supplies `settings.graph` and `run_query(query_name, txn_id)`, returning
the same list of query-output dictionaries used by the normalizer. This is where
an MCP transport adapter can fit without changing the workflow or GSQL.

No MCP server or client transport has been connected in this submission. This
document is an integration boundary, **not a claim of functioning MCP**.

## Inspection result

At inspection, neither the `mcp` nor `tigergraph_mcp` Python package was installed,
and the active tool catalog exposed no TigerGraph MCP server. The official
[TigerGraph MCP project](https://github.com/tigergraph/tigergraph-mcp) provides
`tigergraph__run_installed_query` and uses async pyTigerGraph internally.

Adding that server, a client session, dependency versions, and credential routing
would require separate setup and testing. Under the deadline and the instruction
not to access credentials, the working SDK transport was retained. No packages
were installed and no credential configuration was inspected or changed.

## Exact adapter contract for a subsequent MCP connection

1. Start/connect the official server separately; inspect its actual `tools/list`
   input schema and live result shape before writing an envelope adapter.
2. Allow only the four existing investigation queries:
   `investigate_transaction`, `risk_pattern_summary`, `detect_fraud_patterns`,
   `transaction_velocity`. Do not expose schema mutation or query installation.
3. Implement the client contract described above, passing `txn_id` as a string
   and selecting `HHGOA_Fraud`. Convert validated MCP results into the SDK result
   list; reject tool errors and malformed responses rather than inventing data.
4. Inject that adapter at the existing graph-tool boundary. Record MCP versus
   SDK provenance explicitly. Use the current `TigerGraphClient` as the fallback
   for unavailable read-only MCP calls; never silently retry non-idempotent actions.
5. Run the captured-response and failure tests against the adapter, followed by
   a separately authorized live check. Keep persistence on the working SDK path.

The HTTP investigation API and installed queries require no changes for this
boundary. A live MCP demonstration remains outstanding if judges require one.
