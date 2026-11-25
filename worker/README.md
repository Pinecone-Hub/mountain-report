# Worker for `/mountain-report*`

Forwards `pinecone.lu/mountain-report*` to the Cloudflare Pages project `mountain-report`, with the path and query unchanged. The base path comes from `BASE_PATH` in `wrangler.toml`, which must equal `basePath` in `report.config.json` (`npm run check` compares them). The rest of the domain (WordPress) is not touched.

## Behaviour

- Only `GET` and `HEAD` are accepted (other methods get `405` with an `Allow` header).
- `/mountain-report` is redirected with `308` to `/mountain-report/`, keeping the query string.
- Everything under `/mountain-report/` is proxied to `PAGES_ORIGIN` with the same path. Redirects are not followed; their `Location` header is rewritten from the Pages origin to the public origin.
- Paths that only start with `mountain-report` (for example `/mountain-reportx` or `/mountain-report-foo`) are passed through to the origin untouched.

## OAuth for Decap CMS

GitHub login for `/admin/` is served by Pages Functions (not by this Worker), in `functions/[base]/api/auth.ts` and `callback.ts`, with the logic in `oauth/`. Both are GET only, so this Worker proxies them like any other page, with the query string unchanged. The Worker adds no CSP or `Cross-Origin-Opener-Policy`, so the inline script in the callback page and `window.opener` keep working. Decap's calls to `api.github.com` and the token exchange (a server-side POST from the Function to `github.com`) do not pass through the Worker.

- `<basePath>/api/auth` redirects to GitHub; `<basePath>/api/callback` checks the signed state, exchanges the code and hands the token to Decap through `postMessage`.
- The `redirect_uri` and the `postMessage` target origin are built from `site` and `basePath` in `report.config.json`, never from the request host.
- Environment variables, set in the Cloudflare Pages project (Settings, Variables and Secrets, **Production**): `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (the secret as an encrypted variable). Without them the routes answer 500.
- The GitHub OAuth App callback URL must be `<site><basePath>/api/callback`.
- Login works only from the public origin (`site`). On `*.pages.dev` the `redirect_uri` and the target origin still point to the public site, so the popup would not reach the opener.

## Deploy

From the `worker/` folder:

```
npx wrangler login
npx wrangler deploy
```

The first command opens the browser to authorise the Cloudflare account. The second publishes the Worker and the route defined in `wrangler.toml`.

If the Cloudflare Pages project has a different subdomain from `mountain-report.pages.dev`, update `PAGES_ORIGIN` in `wrangler.toml` before deploying.

## Check the route in the dashboard

Cloudflare, then **Workers & Pages**, then the Worker `mountain-report-proxy`, then **Settings**, then **Domains & Routes**. The route `pinecone.lu/mountain-report*` must be listed.

## Rollback

If something goes wrong: Cloudflare, then the Worker, then **Settings**, then **Domains & Routes**, and delete the `/mountain-report*` route. All traffic returns to WordPress immediately; nothing in WordPress was modified.
