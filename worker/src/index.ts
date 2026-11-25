// Cloudflare Worker for the <basePath>* route. Forwards
// requests to the Cloudflare Pages project unchanged in path, and rewrites the
// host on redirects so the public domain is always what the browser sees. Drops the noindex
// header that Pages adds for the pages.dev host.

import { resolve, rewriteLocation } from "./route";

export interface Env {
  PAGES_ORIGIN: string;
  /** Base path of the report, e.g. "/mountain-report" (no trailing slash). */
  BASE_PATH: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "X-Frame-Options": "SAMEORIGIN",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    if (!env.BASE_PATH || !env.PAGES_ORIGIN) {
      return new Response("Worker misconfigured", { status: 500 });
    }

    const url = new URL(request.url);
    const route = resolve(url, env.PAGES_ORIGIN, env.BASE_PATH);

    if (route.kind === "pass") {
      // Defensive: the route pattern also matches paths that merely start
      // with the base path name (e.g. /mountain-reportx). Send
      // those to the origin untouched, as if this Worker weren't here.
      return fetch(request);
    }

    if (route.kind === "redirect") {
      return Response.redirect(url.origin + route.location, 308);
    }

    const upstreamResponse = await fetch(route.upstream, {
      method: request.method,
      headers: request.headers,
      redirect: "manual",
    });

    const headers = new Headers(upstreamResponse.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(name, value);
    }
    // Pages serves every file with X-Robots-Tag: noindex (dist/_headers) so that the pages.dev host
    // stays out of search engines. The public host must be indexable: drop it. The Functions under
    // <base>/api/ (OAuth) set their own noindex on purpose and keep it.
    if (!url.pathname.startsWith(`${env.BASE_PATH}/api/`)) headers.delete("X-Robots-Tag");

    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      const location = headers.get("Location");
      if (location) {
        headers.set("Location", rewriteLocation(location, env.PAGES_ORIGIN, url.origin));
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  },
};
