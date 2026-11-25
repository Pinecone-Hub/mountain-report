import type { APIRoute } from "astro";
import { report } from "../../config/report";
import { cmsConfigText } from "../../lib/cms-config";

/** Decap configuration for the demo (test backend: changes are not saved). JSON is valid YAML. */
export const GET: APIRoute = () => new Response(cmsConfigText(report, "test-repo"), { headers: { "content-type": "text/yaml; charset=utf-8" } });
