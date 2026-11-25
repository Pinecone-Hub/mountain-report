// Pure helpers for processing the WGMS annual mass-change estimates (no file system access).
// The processed file keeps the original values as strings, unchanged: only the columns the
// report uses and the years of the report period are kept.

export const COLUMNS = ["year", "area_km2", "mwe", "mwe_sigma", "gt", "gt_sigma"] as const;
export type Column = (typeof COLUMNS)[number];
export type Row = Record<Column, string>;

/** Parses a WGMS CSV (comma separated, header row, no quoting). Throws on a missing column. */
export function parseWgmsCsv(text: string, label: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const index = new Map(header.map((name, i) => [name, i]));
  for (const column of COLUMNS) {
    if (!index.has(column)) throw new Error(`${label}: column "${column}" is missing`);
  }
  return lines.slice(1).map((line, n) => {
    const cells = line.split(",");
    if (cells.length !== header.length) throw new Error(`${label}: line ${n + 2} has ${cells.length} cells, expected ${header.length}`);
    const row = {} as Row;
    for (const column of COLUMNS) {
      const value = cells[index.get(column)!];
      if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`${label}: line ${n + 2}, ${column} is not a number: "${value}"`);
      row[column] = value;
    }
    return row;
  });
}

/** Rows of the period, in year order. Throws when a year of the period is missing or repeated. */
export function selectPeriod(rows: Row[], firstYear: number, lastYear: number, label: string): Row[] {
  const byYear = new Map<number, Row>();
  for (const row of rows) {
    const year = Number(row.year);
    if (byYear.has(year)) throw new Error(`${label}: year ${year} appears twice`);
    byYear.set(year, row);
  }
  const out: Row[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const row = byYear.get(year);
    if (!row) throw new Error(`${label}: year ${year} is missing`);
    out.push(row);
  }
  return out;
}

/** The processed CSV: one row per series and year. */
export function processedCsv(series: Array<{ id: string; rows: Row[] }>): string {
  const lines = [["series", ...COLUMNS].join(",")];
  for (const { id, rows } of series) {
    for (const row of rows) lines.push([id, ...COLUMNS.map((c) => row[c])].join(","));
  }
  return `${lines.join("\n")}\n`;
}
