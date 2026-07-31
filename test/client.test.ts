import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BetaSeriesApiError, BetaSeriesClient } from "../src/client/betaseriesClient.js";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("BetaSeriesClient", () => {
  const creds = {
    apiKey: "test-key",
    accessToken: "test-token",
    baseUrl: "https://api.betaseries.com",
    apiVersion: "3.0",
    locale: "fr",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the API key, token, version headers and default locale", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const client = new BetaSeriesClient(creds);
    await client.call("get", "/shows/search", { title: "Breaking Bad" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.betaseries.com/shows/search?title=Breaking+Bad&locale=fr");
    expect(init.method).toBe("GET");
    expect(init.headers["X-BetaSeries-Key"]).toBe("test-key");
    expect(init.headers["X-BetaSeries-Token"]).toBe("test-token");
    expect(init.headers["X-BetaSeries-Version"]).toBe("3.0");
  });

  it("omits X-BetaSeries-Token when no access token is configured", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const client = new BetaSeriesClient({ ...creds, accessToken: undefined });
    await client.call("get", "/shows/search", {});

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-BetaSeries-Token"]).toBeUndefined();
  });

  it("throws BetaSeriesApiError with the API's error text when errors[] is present", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ code: 1001, text: "Mauvaise clé API." }] }, true, 200),
    );

    const client = new BetaSeriesClient(creds);
    await expect(client.call("get", "/shows/search", {})).rejects.toMatchObject(
      new BetaSeriesApiError("Mauvaise clé API.", 200, [1001]),
    );
  });

  it("throws on non-2xx responses even without an errors[] body", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(undefined, false, 500));

    const client = new BetaSeriesClient(creds);
    await expect(client.call("get", "/shows/search", {})).rejects.toThrow(/HTTP 500/);
  });
});
