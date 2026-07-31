#!/usr/bin/env node
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { config } from "./config.js";

async function runStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("betaseries-mcp running on stdio");
}

/** Stateless HTTP mode: one MCP server + transport per request, per the
 * pattern in the MCP SDK's stateless streamable-HTTP examples. Fine for a
 * single-account self-hosted deployment — no session state to share. */
async function runHttp() {
  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not found");
      return;
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(config.port, () => {
    console.error(`betaseries-mcp listening on http://localhost:${config.port}/mcp (health: /health)`);
  });
}

async function main() {
  if (config.transport === "http") {
    await runHttp();
  } else {
    await runStdio();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
