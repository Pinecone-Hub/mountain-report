import type { APIRoute, GetStaticPaths } from "astro";
import { fullLanguages } from "../../../config/report";
import { built, figuresFor } from "../../../lib/figure-store";
import { figureFiles } from "../../../lib/figures";

/** Generated figure files: <id>-<lang>.svg per language, <id>.csv once per figure. */
export const getStaticPaths: GetStaticPaths = async () => {
  const paths: Array<{ params: { file: string }; props: { body: string; type: string } }> = [];
  const csvDone = new Set<string>();
  for (const language of fullLanguages) {
    for (const figure of await figuresFor(language.code)) {
      const files = figureFiles(figure.id, language.code);
      const b = built(figure, language.code);
      paths.push({ params: { file: files.svg }, props: { body: b.svgFile, type: "image/svg+xml" } });
      if (!csvDone.has(files.csv)) {
        csvDone.add(files.csv);
        paths.push({ params: { file: files.csv }, props: { body: b.csv, type: "text/csv; charset=utf-8" } });
      }
    }
  }
  return paths;
};

export const GET: APIRoute = ({ props }) => new Response(props.body as string, { headers: { "content-type": props.type as string } });
