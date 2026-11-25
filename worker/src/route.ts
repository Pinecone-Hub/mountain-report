// Pure routing logic for the <basePath>* Worker. No Workers globals
// (Request, Response, fetch, ...) are used here so this module can be
// unit-tested with plain vitest, outside the Workers runtime.

export type RouteResult =
  | { kind: "redirect"; location: string }
  | { kind: "proxy"; upstream: string }
  | { kind: "pass" };

/**
 * Decides what to do with an incoming request under the <basePath>*
 * route pattern. The pattern also matches paths that merely start with
 * the base path (e.g. /mountain-reportx, /mountain-report-foo), which are
 * not part of this project and must be passed through untouched.
 */
export function resolve(url: URL, pagesOrigin: string, basePath: string): RouteResult {
  const { pathname, search } = url;

  if (pathname === basePath) {
    return { kind: "redirect", location: `${basePath}/${search}` };
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return { kind: "proxy", upstream: `${pagesOrigin}${pathname}${search}` };
  }

  return { kind: "pass" };
}

/**
 * Rewrites a Location header from the Pages origin to the public origin, so
 * redirects issued by the Astro site never leak the *.pages.dev hostname.
 * Relative locations and locations on other hosts are left unchanged.
 */
export function rewriteLocation(location: string, pagesOrigin: string, publicOrigin: string): string {
  if (location === pagesOrigin || location.startsWith(`${pagesOrigin}/`) || location.startsWith(`${pagesOrigin}?`)) {
    return publicOrigin + location.slice(pagesOrigin.length);
  }
  return location;
}
