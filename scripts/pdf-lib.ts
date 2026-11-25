// A minimal valid PDF 1.4 writer: one A4 page, Helvetica, a few lines of text. Pure, Node
// built-ins only (Buffer). Text is limited to printable ASCII; other characters become "?".

export interface PdfLine {
  text: string;
  /** Font size in points. */
  size: number;
}

/** Printable ASCII only, and the characters that are special in a PDF string escaped. */
export function pdfEscape(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if (code < 32 || code > 126) out += "?";
    else if (ch === "(" || ch === ")" || ch === "\\") out += `\\${ch}`;
    else out += ch;
  }
  return out;
}

/** Builds the file. Throws when there is no line to draw. */
export function buildPdf(lines: readonly PdfLine[]): Buffer {
  if (lines.length === 0) throw new Error("a PDF needs at least one line of text");
  let y = 760;
  const draw: string[] = ["BT"];
  for (const line of lines) {
    draw.push(`/F1 ${line.size} Tf`, `1 0 0 1 72 ${y} Tm`, `(${pdfEscape(line.text)}) Tj`);
    y -= Math.round(line.size * 1.8);
  }
  draw.push("ET");
  const stream = draw.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}
