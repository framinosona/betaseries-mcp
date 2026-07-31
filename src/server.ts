import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BetaSeriesClient } from "./client/betaseriesClient.js";
import { registerCategoryTools } from "./tools/categoryTools.js";
import { config } from "./config.js";

// Bumped independently of package.json — this is what MCP clients see.
const SERVER_VERSION = "0.1.0";

export function createServer(): McpServer {
  const server = new McpServer({ name: "betaseries-mcp", version: SERVER_VERSION });

  const client = new BetaSeriesClient({
    apiKey: config.apiKey,
    accessToken: config.accessToken,
    baseUrl: config.baseUrl,
    apiVersion: config.apiVersion,
    locale: config.locale,
  });

  registerCategoryTools(server, client);

  return server;
}
