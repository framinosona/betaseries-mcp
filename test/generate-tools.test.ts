import { describe, expect, it } from "vitest";
import { categories } from "../src/generated/operations.js";

const EXCLUDED_OPERATION_IDS = [
  "post-oauth-access-token",
  "post-oauth-device",
  "post-members-auth",
  "post-members-oauth",
  "post-members-access-token",
];

describe("generated operation tables", () => {
  it("groups operations into categories, excluding auth-related ones", () => {
    expect(categories.authentication).toBeUndefined();

    const allOperationIds = Object.values(categories).flatMap((ops) => ops.map((op) => op.operationId));
    expect(allOperationIds.length).toBeGreaterThan(150);

    for (const excluded of EXCLUDED_OPERATION_IDS) {
      expect(allOperationIds).not.toContain(excluded);
    }
  });

  it("never includes the fake spec-poisoning 'Model' operations", () => {
    const allPaths = Object.values(categories).flatMap((ops) => ops.map((op) => op.path));
    for (const fake of ["/discover", "/resources", "/query", "/execute", "/version", "/setCredentials"]) {
      expect(allPaths).not.toContain(fake);
    }
  });

  it("gives every category at least one operation, with unique operationIds within it", () => {
    for (const [category, ops] of Object.entries(categories)) {
      expect(ops.length, `category "${category}" should have operations`).toBeGreaterThan(0);
      const ids = ops.map((op) => op.operationId);
      expect(new Set(ids).size, `duplicate operationId within "${category}"`).toBe(ids.length);
    }
  });

  it("includes the well-known shows.search operation with its expected params", () => {
    const search = categories.shows.find((op) => op.operationId === "get-shows-search");
    expect(search).toBeDefined();
    expect(search?.method).toBe("get");
    expect(search?.path).toBe("/shows/search");
    expect(search?.params.map((p) => p.name)).toContain("title");
  });
});
