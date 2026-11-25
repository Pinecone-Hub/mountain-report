/** Normalises a base such as "/report" or "/report/" to end with one slash. */
export function normaliseBase(base: string): string {
  const trimmed = base.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "/" : `/${trimmed}/`;
}

/** Builds a URL under the base. `path` is relative to the base ("en/", "_astro/x.js"). */
export function withBase(base: string, path = ""): string {
  return normaliseBase(base) + path.replace(/^\/+/, "");
}
