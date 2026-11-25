import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = { PAGES_ORIGIN: "https://mountain-report.pages.dev", BASE_PATH: "/mountain-report" };

describe("worker fetch", () => {
  it("answers POST with 405 and an Allow header", async () => {
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/", { method: "POST" }), env);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("redirects GET /mountain-report to /mountain-report/ with 308, keeping the query", async () => {
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report?x=1"), env);
    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe("https://pinecone.lu/mountain-report/?x=1");
  });

  it("uses the configured base path", async () => {
    const other = { ...env, BASE_PATH: "/other-report" };
    const res = await worker.fetch(new Request("https://pinecone.lu/other-report"), other);
    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe("https://pinecone.lu/other-report/");
  });

  it("answers 500 when BASE_PATH is not configured", async () => {
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/"), { PAGES_ORIGIN: env.PAGES_ORIGIN, BASE_PATH: "" });
    expect(res.status).toBe(500);
  });
});

describe("worker fetch with a stubbed origin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stub = (response: Response) => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("proxies to PAGES_ORIGIN with path, query, method and manual redirect", async () => {
    const fetchMock = stub(new Response("ok", { status: 200 }));
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/fr/?x=1"), env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [upstream, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(upstream).toBe("https://mountain-report.pages.dev/mountain-report/fr/?x=1");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("manual");
  });

  it("allows HEAD and passes the method on", async () => {
    const fetchMock = stub(new Response(null, { status: 200 }));
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/", { method: "HEAD" }), env);
    expect(res.status).toBe(200);
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("HEAD");
  });

  it("sets the security headers on proxied responses", async () => {
    stub(new Response("ok", { status: 200, headers: { "X-Frame-Options": "DENY" } }));
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/"), env);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=(), payment=()");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("removes X-Robots-Tag from pages and assets (the pages.dev noindex must not reach the public host)", async () => {
    for (const path of ["/mountain-report/en/", "/mountain-report/_astro/app.abc.js", "/mountain-report/404.html"]) {
      stub(new Response("x", { status: 200, headers: { "X-Robots-Tag": "noindex", "Content-Type": "text/html" } }));
      const res = await worker.fetch(new Request(`https://pinecone.lu${path}`), env);
      expect(res.headers.get("X-Robots-Tag")).toBeNull();
      expect(res.headers.get("Content-Type")).toBe("text/html");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
  });

  it("removes X-Robots-Tag in any letter case and leaves a response without it alone", async () => {
    stub(new Response("x", { status: 200, headers: { "x-robots-tag": "noindex, nofollow" } }));
    expect((await worker.fetch(new Request("https://pinecone.lu/mountain-report/en/"), env)).headers.has("X-Robots-Tag")).toBe(false);
    stub(new Response("x", { status: 200 }));
    expect((await worker.fetch(new Request("https://pinecone.lu/mountain-report/en/"), env)).status).toBe(200);
  });

  it("keeps the noindex of the Functions under /api/", async () => {
    stub(new Response("x", { status: 200, headers: { "X-Robots-Tag": "noindex" } }));
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/api/callback?code=a"), env);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("rewrites a Location on a 3xx from PAGES_ORIGIN to the public origin", async () => {
    stub(new Response(null, { status: 301, headers: { Location: "https://mountain-report.pages.dev/mountain-report/en/" } }));
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/en"), env);
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://pinecone.lu/mountain-report/en/");
  });

  it("leaves a foreign-host Location unchanged", async () => {
    stub(new Response(null, { status: 302, headers: { Location: "https://example.com/elsewhere" } }));
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/x"), env);
    expect(res.headers.get("Location")).toBe("https://example.com/elsewhere");
  });

  it("passes /mountain-reportx to the origin with the original request", async () => {
    const fetchMock = stub(new Response("wp", { status: 200 }));
    const request = new Request("https://pinecone.lu/mountain-reportx");
    const res = await worker.fetch(request, env);
    expect(await res.text()).toBe("wp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(request);
  });
});

describe("worker with the OAuth flow (Decap)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies the auth popup request with its query string and passes a GitHub Location unchanged", async () => {
    const github = "https://github.com/login/oauth/authorize?client_id=id&redirect_uri=https%3A%2F%2Fpinecone.lu%2Fmountain-report%2Fapi%2Fcallback&scope=repo&state=1.n.sig";
    const fetchMock = vi.fn(async (..._a: unknown[]) => new Response(null, { status: 302, headers: { Location: github } }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/api/auth?provider=github&site_id=pinecone.lu&scope=repo"), env);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("https://mountain-report.pages.dev/mountain-report/api/auth?provider=github&site_id=pinecone.lu&scope=repo");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(github);
  });

  it("proxies the callback with code and state, and adds no CSP or COOP", async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => new Response("<script>1</script>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await worker.fetch(new Request("https://pinecone.lu/mountain-report/api/callback?code=abc&state=1.n.sig"), env);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("https://mountain-report.pages.dev/mountain-report/api/callback?code=abc&state=1.n.sig");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Security-Policy")).toBeNull();
    expect(res.headers.get("Cross-Origin-Opener-Policy")).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(await res.text()).toBe("<script>1</script>");
  });
});

