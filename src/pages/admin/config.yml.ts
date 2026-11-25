import type { APIRoute } from "astro";
import { report } from "../../config/report";
import { cmsConfigText } from "../../lib/cms-config";

/** Decap configuration for the editor (GitHub backend). JSON is valid YAML. */
export const GET: APIRoute = () => new Response(cmsConfigText(report, "github"), { headers: { "content-type": "text/yaml; charset=utf-8" } });
