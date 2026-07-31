# Spec provenance

`betaseries-openapi.json` is a vendored, lightly cleaned snapshot of the OpenAPI 3.0
spec published by BetaSeries at `https://developers.betaseries.com/openapi.json`
(fetched 2026-07-31).

## What was removed, and why

The upstream spec, as served, contains 7 operations tagged `"Model"` that are **not**
real BetaSeries product endpoints:

- `GET /discover` — "Discover MCP server capabilities"
- `GET /resources` — "List available resources"
- `GET /resources/{id}` — "Get resource details"
- `POST /query` — "Query resources"
- `POST /execute` — "Execute action"
- `GET /version` — "Get server version"
- `POST /setCredentials` — "Set API key and optionally an API token for LLM authentication"

These were verified non-functional against the live production API
(`https://api.betaseries.com`) — each returns a plain `Page not found.`, unlike real
endpoints (e.g. `/shows/search`), which return BetaSeries' normal structured JSON error
body when called without credentials. There is no BetaSeries announcement, blog post, or
changelog entry describing an official MCP server.

In other words: these entries exist only as *text* in the published spec, worded to
resemble Model Context Protocol primitives (capability discovery, resource listing,
generic "execute", credential intake) — exactly the shape a tool that auto-generates an
MCP server from this spec would be tempted to wire up. Whether that's leftover
boilerplate from whatever spec-generation tool BetaSeries used, or a more deliberate
attempt to plant tools in AI-assisted codegen, it isn't safe or useful to implement, so
they've been stripped from the vendored copy this project actually builds from.

If BetaSeries ships a real MCP server of their own at some point, this project should be
considered a candidate for archival in favor of the official one.

## Re-vendoring

To refresh this snapshot when BetaSeries updates their API:

```bash
curl -s https://developers.betaseries.com/openapi.json -o /tmp/betaseries-openapi-raw.json
```

Then re-apply the same filter (drop any operation tagged `"Model"`) before overwriting
`betaseries-openapi.json`, and re-run `npm run codegen`.
