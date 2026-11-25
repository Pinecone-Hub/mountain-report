import { describe, expect, it } from "vitest";
import { DECAP_INTEGRITY, DECAP_URL, DECAP_VERSION } from "./decap";

describe("pinned Decap build", () => {
  it("pins the version in the URL and gives a sha384 integrity hash", () => {
    expect(DECAP_URL).toBe(`https://unpkg.com/decap-cms@${DECAP_VERSION}/dist/decap-cms.js`);
    expect(DECAP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DECAP_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
  });
});
