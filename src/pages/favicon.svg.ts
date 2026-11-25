import type { APIRoute } from "astro";
import { report } from "../config/report";
import { contourPaths } from "../lib/contours";

/** Favicon: a few contour lines in the accent colour, no text. Served at <base>/favicon.svg. */
export const GET: APIRoute = () => {
  const paths = contourPaths({ seed: 2026, width: 64, height: 64, levels: 4, points: 24 })
    .map((d) => `<path d="${d}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="${report.accentColour}" stroke-width="3">${paths}</g></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
};
