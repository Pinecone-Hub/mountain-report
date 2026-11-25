import { describe, expect, it, vi } from "vitest";
import en from "../src/i18n/en.json";
import fr from "../src/i18n/fr.json";
import config from "../report.config.json";
import {
  STATE_MAX_AGE_MS, baseSegment, createState, handleAuth, handleCallback, isBaseMatch,
  oauthText, redirectUri, renderPage, safeEqual, safeJson, verifyState,
} from "./oauth";

const cfg = { site: config.site, basePath: config.basePath };
const env = { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" };
const now = 1_800_000_000_000;

describe("config helpers", () => {
  it("derives segment, redirect_uri and match from config", () => {
    const seg = config.basePath.slice(1);
    expect(baseSegment(config.basePath)).toBe(seg);
    expect(isBaseMatch(seg, cfg)).toBe(true);
    expect(isBaseMatch("other", cfg)).toBe(false);
    expect(isBaseMatch(undefined, cfg)).toBe(false);
    expect(isBaseMatch([seg], cfg)).toBe(false);
    expect(redirectUri(cfg)).toBe(`${config.site}${config.basePath}/api/callback`);
  });
  it("fails clearly on a multi-segment or empty basePath", () => {
    expect(() => baseSegment("/a/b")).toThrow(/single path segment/);
    expect(() => baseSegment("")).toThrow();
    expect(() => baseSegment("/")).toThrow();
  });
  it("redirect_uri ignores a trailing path in site", () => {
    expect(redirectUri({ site: "https://x.org/ignored", basePath: "/r" })).toBe("https://x.org/r/api/callback");
  });
});

describe("state", () => {
  it("round-trips and has three parts", async () => {
    const s = await createState("k", now);
    expect(s.split(".")).toHaveLength(3);
    expect(await verifyState(s, "k", now + 1000)).toBe(true);
  });
  it("is random per call", async () => {
    expect(await createState("k", now)).not.toBe(await createState("k", now));
  });
  it("rejects wrong key, tampering, expiry, future, malformed", async () => {
    const s = await createState("k", now, "nonce");
    expect(await verifyState(s, "other", now)).toBe(false);
    expect(await verifyState(s.replace("nonce", "nonce2"), "k", now)).toBe(false);
    expect(await verifyState(s, "k", now + STATE_MAX_AGE_MS)).toBe(true);
    expect(await verifyState(s, "k", now + STATE_MAX_AGE_MS + 1)).toBe(false);
    expect(await verifyState(s, "k", now - 1)).toBe(false);
    for (const bad of [null, undefined, "", "bad", "1.2", "a.b.c", "1.2.3.4", `${now}.n.`]) {
      expect(await verifyState(bad, "k", now)).toBe(false);
    }
    expect(await verifyState(s, "", now)).toBe(false);
  });
  it("safeEqual compares correctly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("safeJson and renderPage", () => {
  it("escapes characters that could break out of a script", () => {
    const out = safeJson({ a: "</script><!-- & \u2028 \u2029" });
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(out).a).toBe("</script><!-- & \u2028 \u2029");
  });
  it("embeds the success message and target origin", () => {
    const { html, status } = renderPage({ token: "tok</script>" }, "https://x.org", 200);
    expect(status).toBe(200);
    expect(html).toContain("authorization:github:success:");
    expect(html).not.toContain("tok</script>");
    expect(html).toContain("https://x.org");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
  it("embeds the error message", () => {
    const { html } = renderPage({ error: "boom" }, "https://x.org", 400);
    expect(html).toContain("authorization:github:error:");
    expect(html).not.toContain("token");
  });
});

describe("page text", () => {
  it("comes from the dictionary and fills placeholders", () => {
    expect(oauthText("admin.oauth.signingIn")).toBe(en["admin.oauth.signingIn"]);
    expect(oauthText("admin.oauth.error.githubStatus", { status: 502 })).toBe("GitHub answered 502");
    expect(() => oauthText("admin.oauth.nope")).toThrow(/Missing translation key/);
  });
  it("has the same admin.oauth keys in English and French", () => {
    const keys = (d: Record<string, string>) => Object.keys(d).filter((k) => k.startsWith("admin.oauth.")).sort();
    expect(keys(fr)).toEqual(keys(en));
  });
  it("shows the no-opener text when there is no opener, and only trusts the opener as message source", () => {
    const { html } = renderPage({ token: "t" }, "https://x.org", 200);
    expect(html).toContain(en["admin.oauth.noOpener"]);
    expect(html).toContain('id="status"');
    expect(html).toContain("e.source!==o");
  });
  it("uses the failed title for an error page", () => {
    expect(renderPage({ error: "x" }, "https://x.org", 400).html).toContain(`<title>${en["admin.oauth.failed"]}</title>`);
  });
});

describe("handleAuth", () => {
  it("redirects to GitHub with config-derived redirect_uri and a valid state", async () => {
    const r = await handleAuth(env, cfg, now);
    if (!("redirect" in r)) throw new Error("expected redirect");
    const u = new URL(r.redirect);
    expect(u.origin + u.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(u.searchParams.get("client_id")).toBe("id");
    expect(u.searchParams.get("scope")).toBe("repo");
    expect(u.searchParams.get("redirect_uri")).toBe(redirectUri(cfg));
    expect(await verifyState(u.searchParams.get("state"), "secret", now)).toBe(true);
    expect(r.redirect).not.toContain("secret");
  });
  it("answers 500 when env is missing", async () => {
    for (const e of [{}, { GITHUB_CLIENT_ID: "id" }, { GITHUB_CLIENT_SECRET: "s" }]) {
      const r = await handleAuth(e, cfg, now);
      expect("status" in r && r.status).toBe(500);
    }
  });
});

describe("handleCallback", () => {
  const q = (o: Record<string, string>) => new URLSearchParams(o);
  const good = async () => await createState("secret", now);
  const ghOk = (body: unknown, status = 200) => vi.fn(async (..._a: unknown[]) => new Response(JSON.stringify(body), { status }));

  it("exchanges the code and returns the token page", async () => {
    const f = ghOk({ access_token: "gho_abc" });
    const r = await handleCallback(q({ code: "c", state: await good() }), env, cfg, now, f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(r.html).toContain("authorization:github:success:");
    expect(r.html).toContain("gho_abc");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect((init.headers as Record<string, string>).Accept).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      client_id: "id", client_secret: "secret", code: "c", redirect_uri: redirectUri(cfg),
    });
  });
  it("rejects bad state without calling GitHub", async () => {
    const f = ghOk({});
    const r = await handleCallback(q({ code: "c", state: "bad" }), env, cfg, now, f as unknown as typeof fetch);
    expect(r.status).toBe(400);
    expect(r.html).toContain("authorization:github:error:");
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects a missing code and a missing state", async () => {
    const f = ghOk({});
    expect((await handleCallback(q({ state: await good() }), env, cfg, now, f as unknown as typeof fetch)).status).toBe(400);
    expect((await handleCallback(q({ code: "c" }), env, cfg, now, f as unknown as typeof fetch)).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it("reports a GitHub error param (user denied)", async () => {
    const f = ghOk({});
    const r = await handleCallback(q({ error: "access_denied", state: await good() }), env, cfg, now, f as unknown as typeof fetch);
    expect(r.status).toBe(400);
    expect(r.html).toContain("access_denied");
  });
  it("handles GitHub error body, non-200, missing token and network failure", async () => {
    const run = async (f: unknown) => handleCallback(q({ code: "c", state: await good() }), env, cfg, now, f as typeof fetch);
    expect((await run(ghOk({ error: "bad_verification_code" }))).status).toBe(400);
    expect((await run(ghOk({}, 500))).status).toBe(502);
    expect((await run(ghOk({}))).status).toBe(502);
    expect((await run(ghOk({ access_token: "" }))).status).toBe(502);
    const r = await run(vi.fn(async () => { throw new Error("net secret"); }));
    expect(r.status).toBe(502);
    expect(r.html).not.toContain("net secret");
  });
  it("answers 500 when env is missing", async () => {
    const r = await handleCallback(q({ code: "c", state: "x" }), {}, cfg, now, fetch);
    expect(r.status).toBe(500);
  });
  it("never puts the client secret in the page", async () => {
    const r = await handleCallback(q({ code: "c", state: "bad" }), env, cfg, now, fetch);
    expect(r.html).not.toContain("secret");
  });
});
