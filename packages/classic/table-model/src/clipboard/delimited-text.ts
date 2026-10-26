/**
 * Reads spreadsheet-style quoted TSV without splitting embedded tabs/newlines.
 * @param text - Clipboard text.
 * @returns Rectangular fields; malformed quoting is preserved as literal content.
 */
export function readTsvFields(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') { quoted = false; closed = true; }
      else field += character;
    } else if (character === "\t" || character === "\n" || character === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (character !== "\t") {
        rows.push(row);
        row = [];
        if (character === "\r" && text[index + 1] === "\n") index += 1;
      }
    } else if (character === '"' && field === "" && !closed) quoted = true;
    else {
      if (closed) return [[text]];
      field += character;
    }
  }
  if (quoted) return [[text]];
  // A terminal record separator is not an extra empty spreadsheet row.
  if (field !== "" || row.length || closed || rows.length === 0) rows.push([...row, field]);
  const width = rows.reduce((maximum, values) => Math.max(maximum, values.length), 1);
  return rows.map(values => [...values, ...Array<string>(width - values.length).fill("")]);
}

/** @param value - Cell text. @returns Escaped TSV field preserving separators and quotes. */
export function writeTsvField(value: string): string {
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
