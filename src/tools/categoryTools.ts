import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BetaSeriesApiError, type BetaSeriesClient } from "../client/betaseriesClient.js";
import { categories, type OperationDef } from "../generated/operations.js";

/** Every BetaSeries resource category becomes exactly one MCP tool, with an
 * `operation` enum selecting which of that category's endpoints to call.
 * This keeps the tool count sane (~23) while still reaching all 186 real
 * endpoints — the alternative, one tool per endpoint, would be unusable in
 * most MCP clients. */
export function registerCategoryTools(server: McpServer, client: BetaSeriesClient): void {
  for (const [category, operations] of Object.entries(categories)) {
    registerCategoryTool(server, client, category, operations);
  }
}

function registerCategoryTool(
  server: McpServer,
  client: BetaSeriesClient,
  category: string,
  operations: OperationDef[],
): void {
  const operationIds = operations.map((op) => op.operationId);
  const opById = new Map(operations.map((op) => [op.operationId, op]));

  server.registerTool(
    `betaseries_${category}`,
    {
      title: `BetaSeries: ${category}`,
      description: buildDescription(category, operations),
      inputSchema: {
        operation: z.enum(operationIds as [string, ...string[]]).describe("Which operation to perform"),
        params: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Query parameters for the chosen operation, as string key/value pairs. " +
              "See this tool's description for the accepted parameter names per operation.",
          ),
      },
    },
    async ({ operation, params }) => {
      const op = opById.get(operation);
      if (!op) {
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown ${category} operation: ${operation}` }],
        };
      }

      try {
        const result = await client.call(op.method, op.path, params ?? {});
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof BetaSeriesApiError ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `BetaSeries API error: ${message}` }] };
      }
    },
  );
}

function buildDescription(category: string, operations: OperationDef[]): string {
  const lines = [
    `Call the BetaSeries "${category}" API. Pick an operation and pass its parameters in the params object.`,
    "",
    "Available operations:",
  ];
  for (const op of operations) {
    const paramList = op.params.length
      ? op.params
          .map((p) => `${p.name}${p.required ? "" : "?"} (${p.description || "no description"})`)
          .join(", ")
      : "no parameters";
    lines.push(`- ${op.operationId} [${op.method.toUpperCase()} ${op.path}]: ${op.summary}. Params: ${paramList}`);
  }
  return lines.join("\n");
}
