// Pure logic for the GitHub OAuth provider used by Decap CMS. No Pages
// Functions globals here, so it can be unit-tested with plain vitest.
// Origin and paths always come from report.config.json, never from the request
// (inside the Function, request.url is the pages.dev host).

import en from "../src/i18n/en.json";

export interface OAuthConfig {
  /** Public origin of the site, e.g. "https://example.org". */
  site: string;
  /** Base path with a leading slash and no trailing slash, e.g. "/report". */
  basePath: string;
}

export interface OAuthEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export interface HtmlResult {
  status: number;
  html: string;
}

export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const STATE_MAX_AGE_MS = 10 * 60 * 1000;
export const SCOPE = "repo";

// The admin is English, so the page uses the English dictionary (keys "admin.oauth.*").
const text = en as Record<string, string>;

/** Looks up an "admin.oauth.*" string and fills {name} placeholders. A missing key throws. */
export function oauthText(key: string, values: Record<string, string | number> = {}): string {
  const value = text[key];
  if (value === undefined) throw new Error(`Missing translation key "${key}"`);
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

/** The single path segment of basePath ("/a" gives "a"). Throws on anything else. */
export function baseSegment(basePath: string): string {
  const m = /^\/([A-Za-z0-9._~-]+)$/.exec(basePath);
  if (!m) throw new Error("basePath must be a single path segment such as /report");
  return m[1];
}

export function isBaseMatch(param: unknown, config: OAuthConfig): boolean {
  return typeof param === "string" && param === baseSegment(config.basePath);
}

export function redirectUri(config: OAuthConfig): string {
  return `${new URL(config.site).origin}${config.basePath}/api/callback`;
}

export function targetOrigin(config: OAuthConfig): string {
  return new URL(config.site).origin;
}

// ---- state ---------------------------------------------------------------

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

/** Constant-time string comparison (length is not secret here). */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function createState(secret: string, now: number, nonce?: string): Promise<string> {
  const n = nonce ?? b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${now}.${n}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyState(state: string | null | undefined, secret: string, now: number): Promise<boolean> {
  if (!state || !secret) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [issued, nonce, sig] = parts;
  if (!/^\d{1,16}$/.test(issued) || !/^[A-Za-z0-9_-]+$/.test(nonce) || !sig) return false;
  const age = now - Number(issued);
  if (age < 0 || age > STATE_MAX_AGE_MS) return false;
  return safeEqual(sig, await hmac(secret, `${issued}.${nonce}`));
}

// ---- HTML ----------------------------------------------------------------

/** JSON safe to embed inside an inline script. */
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export type Outcome = { token: string } | { error: string };

export function renderPage(outcome: Outcome, origin: string, status: number): HtmlResult {
  const ok = "token" in outcome;
  const message = ok
    ? "authorization:github:success:" + JSON.stringify({ token: outcome.token, provider: "github" })
    : "authorization:github:error:" + JSON.stringify({ message: outcome.error });
  const noOpener = oauthText("admin.oauth.noOpener");
  const data = safeJson({ origin, message, noOpener });
  const title = oauthText(ok ? "admin.oauth.signingIn" : "admin.oauth.failed");
  const script = `(function(){var d=${data};var o=window.opener;
if(!o){document.getElementById("status").textContent=d.noOpener;return;}
window.addEventListener("message",function(e){if(e.source!==o||e.origin!==d.origin||e.data!=="authorizing:github")return;
e.source.postMessage(d.message,e.origin);window.close();});
o.postMessage("authorizing:github",d.origin);})();`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body><main><p id="status" role="status">${title}</p></main><script>${script}</script></body></html>`;
  return { status, html };
}

export const HTML_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
  "Referrer-Policy": "no-referrer",
};

// ---- handlers ------------------------------------------------------------

export function envReady(env: OAuthEnv): env is Required<OAuthEnv> {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

/** Location for the 302 to GitHub, or an error page when env is missing. */
export async function handleAuth(
  env: OAuthEnv,
  config: OAuthConfig,
  now: number,
): Promise<{ redirect: string } | HtmlResult> {
  if (!envReady(env)) return renderPage({ error: oauthText("admin.oauth.error.config") }, targetOrigin(config), 500);
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri(config),
    scope: SCOPE,
    state: await createState(env.GITHUB_CLIENT_SECRET, now),
  });
  return { redirect: `${GITHUB_AUTHORIZE_URL}?${params.toString()}` };
}

export async function handleCallback(
  query: URLSearchParams,
  env: OAuthEnv,
  config: OAuthConfig,
  now: number,
  fetchFn: typeof fetch,
): Promise<HtmlResult> {
  const origin = targetOrigin(config);
  const fail = (status: number, error: string) => renderPage({ error }, origin, status);
  if (!envReady(env)) return fail(500, oauthText("admin.oauth.error.config"));
  if (!(await verifyState(query.get("state"), env.GITHUB_CLIENT_SECRET, now))) return fail(400, oauthText("admin.oauth.error.state"));
  const ghError = query.get("error");
  if (ghError) return fail(400, oauthText("admin.oauth.error.github", { detail: ghError.slice(0, 100) }));
  const code = query.get("code");
  if (!code) return fail(400, oauthText("admin.oauth.error.noCode"));

  try {
    const res = await fetchFn(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri(config),
      }),
    });
    if (!res.ok) return fail(502, oauthText("admin.oauth.error.githubStatus", { status: res.status }));
    const body = (await res.json()) as { access_token?: unknown; error?: unknown };
    if (typeof body.error === "string") return fail(400, oauthText("admin.oauth.error.github", { detail: body.error.slice(0, 100) }));
    if (typeof body.access_token !== "string" || !body.access_token) return fail(502, oauthText("admin.oauth.error.noToken"));
    return renderPage({ token: body.access_token }, origin, 200);
  } catch {
    return fail(502, oauthText("admin.oauth.error.unreachable"));
  }
}
