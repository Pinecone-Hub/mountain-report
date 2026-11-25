import { describe, expect, it } from "vitest";
import config from "../report.config.json";
import { authRoute, callbackRoute } from "./routes";
import { onRequestGet as authGet } from "../functions/[base]/api/auth";
import { onRequestGet as cbGet } from "../functions/[base]/api/callback";

const seg = config.basePath.slice(1);
const env = { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" };
// request.url is the pages.dev host inside the Function
const request = new Request("https://something.pages.dev/x/api/auth?provider=github");

describe("route glue", () => {
  it("302 to GitHub using the configured public origin, not the request host", async () => {
    const res = await authRoute({ request, env, params: { base: seg } });
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("Location")!);
    expect(loc.searchParams.get("redirect_uri")).toBe(`${config.site}${config.basePath}/api/callback`);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
  it("404 for another base on both routes", async () => {
    expect((await authRoute({ request, env, params: { base: "other" } })).status).toBe(404);
    expect((await callbackRoute({ request, env, params: { base: "other" } })).status).toBe(404);
  });
  it("callback error page carries the required headers and no COOP", async () => {
    const req = new Request("https://something.pages.dev/x/api/callback?code=x&state=bad");
    const res = await callbackRoute({ request: req, env, params: { base: seg } });
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("Cross-Origin-Opener-Policy")).toBeNull();
  });
  it("route files export onRequestGet only", () => {
    expect(typeof authGet).toBe("function");
    expect(typeof cbGet).toBe("function");
  });
});
