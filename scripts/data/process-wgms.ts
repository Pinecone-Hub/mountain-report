// Builds data/glacier-mass-change.csv from the original WGMS files in data/raw/.
// Usage: npm run data            (writes the processed file)
//        npm run data -- --check (fails when the processed file is out of date)
// Settings (period, series, paths, SHA-256 of each original file, download URL) are in
// data/processing.json.
//
// The original files are not in the repository (the dataset terms do not state that they may
// be redistributed). To rebuild: download the zip given in data/processing.json, check its
// SHA-256, and unzip the listed files into the raw folder (see its SOURCE.md).

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseWgmsCsv, processedCsv, selectPeriod } from "./wgms-lib.ts";

interface Settings {
  rawDir: string;
  output: string;
  firstYear: number;
  lastYear: number;
  download: { url: string; sha256: string };
  series: Array<{ id: string; file: string; sha256: string }>;
}

const root = process.cwd();
const settings = JSON.parse(readFileSync(join(root, "data/processing.json"), "utf8")) as Settings;
const fail = (message: string): never => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const series = settings.series.map(({ id, file, sha256 }) => {
  const path = join(settings.rawDir, file);
  if (!existsSync(join(root, path))) {
    fail(`${path} not found. Download ${settings.download.url} (SHA-256 ${settings.download.sha256}) and unzip the files listed in ${settings.rawDir}/SOURCE.md into ${settings.rawDir}/.`);
  }
  const bytes = readFileSync(join(root, path));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== sha256) fail(`${path}: SHA-256 ${hash} does not match ${sha256} in data/processing.json (a different version of the file?)`);
  const rows = parseWgmsCsv(bytes.toString("utf8"), path);
  return { id, rows: selectPeriod(rows, settings.firstYear, settings.lastYear, path) };
});
const csv = processedCsv(series);
const outPath = join(root, settings.output);

if (process.argv.includes("--check")) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
  if (current !== csv) fail(`${settings.output} is out of date: run npm run data`);
  process.stdout.write(`${settings.output} is up to date\n`);
} else {
  writeFileSync(outPath, csv);
  process.stdout.write(`wrote ${settings.output} (${series.length} series, ${settings.firstYear} to ${settings.lastYear})\n`);
}
