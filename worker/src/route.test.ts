import { describe, expect, it } from "vitest";
import { resolve, rewriteLocation } from "./route";

const PAGES_ORIGIN = "https://mountain-report.pages.dev";
const PUBLIC_ORIGIN = "https://pinecone.lu";

function urlFor(pathname: string, search = ""): URL {
  return new URL(`${PUBLIC_ORIGIN}${pathname}${search}`);
}

describe.each(["/mountain-report", "/other-report"])("resolve with base %s", (base) => {
  const name = base.slice(1);
  const r = (pathname: string, search = "") => resolve(urlFor(pathname, search), PAGES_ORIGIN, base);

  it("redirects the bare base path to the trailing-slash form", () => {
    expect(r(base)).toEqual({ kind: "redirect", location: `${base}/` });
  });

  it("keeps the query string on the redirect", () => {
    expect(r(base, "?x=1")).toEqual({ kind: "redirect", location: `${base}/?x=1` });
  });

  it("proxies the base root, pages and assets unchanged", () => {
    for (const path of [`${base}/`, `${base}/fr/`, `${base}/_astro/a.js`, `${base}/api/auth`]) {
      expect(r(path)).toEqual({ kind: "proxy", upstream: `${PAGES_ORIGIN}${path}` });
    }
  });

  it("keeps the query string on a proxied request", () => {
    expect(r(`${base}/fr/`, "?x=1")).toEqual({ kind: "proxy", upstream: `${PAGES_ORIGIN}${base}/fr/?x=1` });
  });

  it("passes through paths that merely start with the name", () => {
    for (const path of [`${base}x`, `${base}x/`, `${base}-foo`, `/${name}`.slice(0, -1)]) {
      expect(r(path)).toEqual({ kind: "pass" });
    }
  });

  it("passes through unrelated paths", () => {
    expect(r("/")).toEqual({ kind: "pass" });
    expect(r("/tools/")).toEqual({ kind: "pass" });
  });
});

it("does not treat another report's path as its own", () => {
  expect(resolve(urlFor("/other-report/"), PAGES_ORIGIN, "/mountain-report")).toEqual({ kind: "pass" });
});

describe("rewriteLocation", () => {
  it("rewrites an absolute Pages location to the public origin", () => {
    expect(rewriteLocation(`${PAGES_ORIGIN}/mountain-report/en/`, PAGES_ORIGIN, PUBLIC_ORIGIN)).toBe(
      "https://pinecone.lu/mountain-report/en/",
    );
  });

  it("rewrites a location with a query string", () => {
    expect(rewriteLocation(`${PAGES_ORIGIN}/mountain-report/?a=1`, PAGES_ORIGIN, PUBLIC_ORIGIN)).toBe(
      "https://pinecone.lu/mountain-report/?a=1",
    );
  });

  it("rewrites the bare Pages origin", () => {
    expect(rewriteLocation(PAGES_ORIGIN, PAGES_ORIGIN, PUBLIC_ORIGIN)).toBe(PUBLIC_ORIGIN);
  });

  it("leaves a relative location unchanged", () => {
    expect(rewriteLocation("/mountain-report/en/", PAGES_ORIGIN, PUBLIC_ORIGIN)).toBe("/mountain-report/en/");
  });

  it("leaves a foreign-host location unchanged", () => {
    expect(rewriteLocation("https://example.com/elsewhere", PAGES_ORIGIN, PUBLIC_ORIGIN)).toBe("https://example.com/elsewhere");
  });

  it("leaves a look-alike host unchanged", () => {
    expect(rewriteLocation(`${PAGES_ORIGIN}.evil.example/x`, PAGES_ORIGIN, PUBLIC_ORIGIN)).toBe(`${PAGES_ORIGIN}.evil.example/x`);
  });
});
