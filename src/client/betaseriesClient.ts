import type { HttpMethod } from "../generated/operations.js";

export interface BetaSeriesCredentials {
  apiKey: string;
  accessToken?: string;
  baseUrl: string;
  apiVersion: string;
  locale: string;
}

export class BetaSeriesApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly codes: number[],
  ) {
    super(message);
    this.name = "BetaSeriesApiError";
  }
}

interface BetaSeriesErrorBody {
  errors?: Array<{ code: number; text: string }>;
}

/** Thin wrapper around the BetaSeries REST API. Every parameter the spec
 * declares is sent as a URL query parameter, regardless of HTTP method —
 * that's what the vendored OpenAPI spec documents for every operation, GET
 * or otherwise. */
export class BetaSeriesClient {
  constructor(private readonly creds: BetaSeriesCredentials) {}

  async call(
    method: HttpMethod,
    path: string,
    params: Record<string, string> = {},
  ): Promise<unknown> {
    const url = new URL(path, this.creds.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
    if (!url.searchParams.has("locale")) {
      url.searchParams.set("locale", this.creds.locale);
    }

    const headers: Record<string, string> = {
      "X-BetaSeries-Key": this.creds.apiKey,
      "X-BetaSeries-Version": this.creds.apiVersion,
      "User-Agent": "betaseries-mcp (https://github.com/framinosona/betaseries-mcp)",
    };
    if (this.creds.accessToken) {
      headers["X-BetaSeries-Token"] = this.creds.accessToken;
    }

    const response = await fetch(url, { method: method.toUpperCase(), headers });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    if (!response.ok || hasErrors(body)) {
      const errors = hasErrors(body) ? body.errors! : [];
      const message =
        errors.length > 0
          ? errors.map((e) => e.text).join("; ")
          : `BetaSeries API request failed with HTTP ${response.status}`;
      throw new BetaSeriesApiError(message, response.status, errors.map((e) => e.code));
    }

    return body;
  }
}

function hasErrors(body: unknown): body is Required<BetaSeriesErrorBody> {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as BetaSeriesErrorBody).errors) &&
    (body as BetaSeriesErrorBody).errors!.length > 0
  );
}
