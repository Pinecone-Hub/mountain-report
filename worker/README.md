# Worker for `/mountain-report*`

Forwards `pinecone.lu/mountain-report*` to the Cloudflare Pages project `mountain-report`, with the path and query unchanged. The base path comes from `BASE_PATH` in `wrangler.toml`, which must equal `basePath` in `report.config.json` (`npm run check` compares them). The rest of the domain (WordPress) is not touched.

## Behaviour

- Only `GET` and `HEAD` are accepted (other methods get `405` with an `Allow` header).
- `/mountain-report` is redirected with `308` to `/mountain-report/`, keeping the query string.
- Everything under `/mountain-report/` is proxied to `PAGES_ORIGIN` with the same path. Redirects are not followed; their `Location` header is rewritten from the Pages origin to the public origin.
- Paths that only start with `mountain-report` (for example `/mountain-reportx` or `/mountain-report-foo`) are passed through to the origin untouched.

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
