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
