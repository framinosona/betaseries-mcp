# BetaSeries MCP Server

An open-source [Model Context Protocol](https://modelcontextprotocol.io) server for the
[BetaSeries API](https://developers.betaseries.com/) — TV show and movie tracking,
planning, ratings, social features, and more. Self-hostable via Docker, or run locally
over stdio with any MCP client.

## Features

- **186 BetaSeries operations**, grouped into **23 tools** (one per API resource category)
  so an LLM client doesn't choke on tool count — every real endpoint the API exposes is
  reachable, with none of the noise of one-tool-per-endpoint.
- Generated straight from BetaSeries' own OpenAPI spec (`scripts/generate-tools.ts`), so
  keeping up with API changes is a re-vendor + `npm run codegen`, not hand-editing 190
  parameter lists.
- Both **stdio** (local MCP clients) and **Streamable HTTP** (Docker / remote) transports
  from the same server.
- Auth is a one-time `npm run auth` (OAuth2 device-code flow) — the running server never
  exposes a "log in" tool to the LLM.

### Tool categories

| Tool | Operations | Covers |
|---|---|---|
| `betaseries_shows` | 34 | search, display, tracking, ratings, episodes, seasons, similars, recommendations, videos, tags... |
| `betaseries_members` | 24 | profile, options, notifications, badges, search, signup, sync, locale, avatar/banner... |
| `betaseries_movies` | 21 | search, display, favorites, ratings, discover, upcoming, similars, characters... |
| `betaseries_episodes` | 17 | list, watched, downloaded, hidden, rewatch, notes, next/latest, unrated... |
| `betaseries_comments` | 11 | list, post, delete, replies, reactions, subscriptions... |
| `betaseries_pictures` | 9 | poster/image URLs for shows, movies, episodes, seasons, members, characters, persons, platforms, badges |
| `betaseries_collections` | 8 | manage & subscribe to collections (Premium) |
| `betaseries_seasons` | 8 | watched, hidden, rewatch, notes |
| `betaseries_quiz` | 7 | list, answer, history, rankings |
| `betaseries_friends` | 6 | list, requests, add/remove, block |
| `betaseries_timeline` | 6 | home/friends/member/show feeds, events |
| `betaseries_messages` | 5 | inbox, discussion, send, read |
| `betaseries_polls` | 5 | list, latest, answer, target |
| `betaseries_subtitles` | 5 | episode/season/show subtitles, latest, report |
| `betaseries_platforms` | 4 | list & manage streaming platform subscriptions |
| `betaseries_planning` | 3 | your schedule, general & upcoming planning |
| `betaseries_search` | 3 | unified search across shows/movies |
| `betaseries_tags` | 3 | list & tag shows |
| `betaseries_persons` | 2 | actor/director/crew info & articles |
| `betaseries_reports` | 2 | report content, update a report |
| `betaseries_badges` | 1 | badge details |
| `betaseries_news` | 1 | latest news |
| `betaseries_stats` | 1 | show ranking stats |

Each tool takes `operation` (an enum of that category's operation IDs) and `params` (a
string key/value map for that operation) — the full parameter reference for every
operation is in the tool's own MCP description, generated from the spec.

## ⚠️ A note on `openapi.json`

BetaSeries' published spec (`https://developers.betaseries.com/openapi.json`) contains 7
extra operations tagged `"Model"` — `/discover`, `/resources`, `/resources/{id}`,
`/query`, `/execute`, `/version`, `/setCredentials` — worded like Model Context Protocol
primitives ("Discover MCP server capabilities", "Execute an action through the MCP
server", "Set API key... for LLM authentication"). They do **not** exist on the real API
(`api.betaseries.com` returns a plain `Page not found.` for all of them, unlike real
endpoints), and there's no BetaSeries announcement of an official MCP server. They look
like either leftover boilerplate from a spec-generation tool, or bait aimed at AI agents
auto-generating MCP servers from this exact file. Either way, this project strips them —
see [`spec/PROVENANCE.md`](spec/PROVENANCE.md) for the full writeup. If BetaSeries ships
a real MCP server later, treat this project as a candidate for archival in favor of theirs.

## Setup

### 1. Get a BetaSeries API key

Register an application at BetaSeries to get an API key (and secret, needed for step 3)
— see [developers.betaseries.com](https://developers.betaseries.com/).

### 2. Install

```bash
git clone https://github.com/framinosona/betaseries-mcp.git
cd betaseries-mcp
npm install
cp .env.example .env
# edit .env: set BETASERIES_API_KEY (and BETASERIES_API_SECRET for the next step)
```

### 3. Authenticate (one-time)

```bash
npm run auth
```

This runs BetaSeries' OAuth2 device-code flow: it prints a code and a URL, you approve
it in your browser, and the resulting access token is saved into `.env` automatically as
`BETASERIES_ACCESS_TOKEN`.

### 4. Run

Locally over stdio (default):

```bash
npm run build
npm start
```

Or for development, without a build step:

```bash
npm run dev
```

### 5. Point an MCP client at it

For Claude Code / Claude Desktop, add to your MCP config:

```json
{
  "mcpServers": {
    "betaseries": {
      "command": "node",
      "args": ["/path/to/betaseries-mcp/dist/index.js"],
      "env": {
        "BETASERIES_API_KEY": "...",
        "BETASERIES_ACCESS_TOKEN": "..."
      }
    }
  }
}
```

## Self-hosting with Docker

```bash
cp .env.example .env   # fill in your key/token as above
docker compose up -d
```

This runs the server in Streamable HTTP mode on `http://localhost:3000/mcp`
(`/health` for a liveness check). Point any MCP client that supports Streamable HTTP at
that URL. To run `npm run auth` against the containerized build instead of locally, use
`docker compose run --rm betaseries-mcp npm run auth`.

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `BETASERIES_API_KEY` | yes | — | from your BetaSeries API key |
| `BETASERIES_API_SECRET` | only for `npm run auth` | — | from your BetaSeries API key |
| `BETASERIES_ACCESS_TOKEN` | for member-scoped operations | — | written by `npm run auth` |
| `BETASERIES_LOCALE` | no | `fr` | matches the API's own default |
| `BETASERIES_API_BASE_URL` | no | `https://api.betaseries.com` | |
| `BETASERIES_API_VERSION` | no | `3.0` | |
| `MCP_TRANSPORT` | no | `stdio` | `stdio` or `http` |
| `PORT` | no | `3000` | HTTP mode only |

## Development

```bash
npm run codegen    # spec/betaseries-openapi.json -> src/generated/operations.ts
npm run typecheck
npm test
```

To pick up a BetaSeries API change: re-fetch `https://developers.betaseries.com/openapi.json`,
strip any `"Model"`-tagged operations (see `spec/PROVENANCE.md`), overwrite
`spec/betaseries-openapi.json`, then `npm run codegen`.

## License

MIT — see [LICENSE.md](LICENSE.md).
