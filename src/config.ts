import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in ` +
        `(see README.md — you'll need a BetaSeries API key, and an access token from \`npm run auth\`).`,
    );
  }
  return value;
}

export const config = {
  apiKey: requireEnv("BETASERIES_API_KEY"),
  accessToken: process.env.BETASERIES_ACCESS_TOKEN,
  baseUrl: process.env.BETASERIES_API_BASE_URL ?? "https://api.betaseries.com",
  apiVersion: process.env.BETASERIES_API_VERSION ?? "3.0",
  locale: process.env.BETASERIES_LOCALE ?? "fr",
  transport: (process.env.MCP_TRANSPORT ?? "stdio") as "stdio" | "http",
  port: Number(process.env.PORT ?? 3000),
};

/** Same as `config`, but doesn't throw if BETASERIES_API_KEY is missing. Only the
 * one-time `npm run auth` setup flow needs this — it wants BETASERIES_API_KEY (and
 * optionally BETASERIES_API_SECRET) without requiring an access token to already exist. */
export const authConfig = {
  apiKey: process.env.BETASERIES_API_KEY,
  apiSecret: process.env.BETASERIES_API_SECRET,
  baseUrl: process.env.BETASERIES_API_BASE_URL ?? "https://api.betaseries.com",
  apiVersion: process.env.BETASERIES_API_VERSION ?? "3.0",
};
