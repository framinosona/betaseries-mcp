#!/usr/bin/env tsx
/**
 * One-time interactive setup: runs the BetaSeries OAuth2 device-code flow
 * (https://developers.betaseries.com/docs/getting-started/authentication/)
 * to mint a long-lived access token, then writes it into .env as
 * BETASERIES_ACCESS_TOKEN.
 *
 * This intentionally lives outside the MCP tool surface — the running
 * server never has a "log in" tool an LLM could be tricked into calling.
 *
 * Usage: npm run auth
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authConfig } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../../.env");
const ENV_EXAMPLE_PATH = resolve(__dirname, "../../.env.example");

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** BetaSeries' own docs show the token-exchange response as bare
 * `access_token=...` text rather than JSON, unlike the rest of the API.
 * Handle both shapes defensively. */
function extractAccessToken(raw: string): string | undefined {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.access_token === "string") return parsed.access_token;
  } catch {
    // not JSON — fall through to form-encoded parsing
  }
  const params = new URLSearchParams(raw);
  return params.get("access_token") ?? undefined;
}

async function requestDeviceCode(apiKey: string): Promise<DeviceCodeResponse> {
  const url = new URL("/oauth/device", authConfig.baseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-BetaSeries-Key": apiKey,
      "X-BetaSeries-Version": authConfig.apiVersion,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to request device code: HTTP ${response.status} — ${await response.text()}`);
  }
  return (await response.json()) as DeviceCodeResponse;
}

async function pollForToken(
  apiKey: string,
  apiSecret: string,
  deviceCode: string,
  intervalSeconds: number,
  expiresInSeconds: number,
): Promise<string> {
  const deadline = Date.now() + expiresInSeconds * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalSeconds * 1000);

    const url = new URL("/oauth/access_token", authConfig.baseUrl);
    url.searchParams.set("client_id", apiKey);
    url.searchParams.set("client_secret", apiSecret);
    url.searchParams.set("code", deviceCode);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-BetaSeries-Key": apiKey,
        "X-BetaSeries-Version": authConfig.apiVersion,
      },
    });

    const raw = await response.text();
    const token = extractAccessToken(raw);
    if (token) return token;

    // Not ready yet (authorization_pending or similar) — keep polling.
    process.stdout.write(".");
  }

  throw new Error("Timed out waiting for device authorization. Run `npm run auth` again.");
}

function saveAccessToken(token: string): void {
  if (!existsSync(ENV_PATH) && existsSync(ENV_EXAMPLE_PATH)) {
    copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
  }

  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf-8") : "";
  const line = `BETASERIES_ACCESS_TOKEN=${token}`;
  const hasKey = /^BETASERIES_ACCESS_TOKEN=/m.test(existing);

  const updated = hasKey
    ? existing.replace(/^BETASERIES_ACCESS_TOKEN=.*$/m, line)
    : `${existing.trimEnd()}\n${line}\n`;

  writeFileSync(ENV_PATH, updated);
}

async function main() {
  const apiKey = authConfig.apiKey;
  const apiSecret = authConfig.apiSecret;

  if (!apiKey || !apiSecret) {
    console.error(
      "Set BETASERIES_API_KEY and BETASERIES_API_SECRET (from your BetaSeries API key details) " +
        "in .env before running `npm run auth`.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("Requesting a device code from BetaSeries...");
  const device = await requestDeviceCode(apiKey);

  console.log("");
  console.log(`  1. Open: ${device.verification_url}`);
  console.log(`  2. Enter code: ${device.user_code}`);
  console.log("");
  console.log(`Waiting for you to authorize (checking every ${device.interval}s, expires in ${device.expires_in}s)`);

  const token = await pollForToken(apiKey, apiSecret, device.device_code, device.interval, device.expires_in);

  saveAccessToken(token);
  console.log("");
  console.log("Success — BETASERIES_ACCESS_TOKEN saved to .env");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
