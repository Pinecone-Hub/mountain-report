// Glue between Pages Functions and oauth.ts. Kept here so the route files stay
// one line each and the glue is type-checked by oauth/tsconfig.json.

import config from "../report.config.json";
import { HTML_HEADERS, handleAuth, handleCallback, isBaseMatch, type OAuthConfig, type OAuthEnv } from "./oauth";

export interface Ctx {
  request: Request;
  env: OAuthEnv;
  params: Record<string, string | string[] | undefined>;
}

const cfg: OAuthConfig = { site: config.site, basePath: config.basePath };

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
const page = (r: { status: number; html: string }) => new Response(r.html, { status: r.status, headers: HTML_HEADERS });

export async function authRoute({ env, params }: Ctx): Promise<Response> {
  if (!isBaseMatch(params.base, cfg)) return notFound();
  const r = await handleAuth(env, cfg, Date.now());
  if ("redirect" in r) return new Response(null, { status: 302, headers: { Location: r.redirect, "Cache-Control": "no-store" } });
  return page(r);
}

export async function callbackRoute({ request, env, params }: Ctx): Promise<Response> {
  if (!isBaseMatch(params.base, cfg)) return notFound();
  return page(await handleCallback(new URL(request.url).searchParams, env, cfg, Date.now(), fetch));
}
