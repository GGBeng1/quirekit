import type { DataViewPreview } from "./types";

/** Escapes every text position in the inert image format.
 * @param text - Arbitrary user content.
 * @returns Safe XML text.
 */
function xml(text: string): string { return text.replace(/[<>&"']/g, character => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;"})[character]!); }
/** Creates an inert, fixed-size vector image for document media consumers.
 * @param preview - Bounded source projection.
 * @returns Exact SVG bytes, width and height in object-local CSS pixels.
 */
export function dataViewPreviewSvg(preview: DataViewPreview): {svg: string; width: number; height: number} {
  const width = 640, rows = preview.rows.slice(0, 6), height = 84 + rows.length * 34;
  const columnCount = Math.max(1, ...rows.map(row => Math.min(4, row.length))), columnWidth = (width - 24) / columnCount;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x=".5" y=".5" width="639" height="${height - 1}" rx="8" fill="#fff" stroke="#dce1e7"/>`,
    `<g fill="#253147" font-family="sans-serif" font-size="13">`, `<text x="16" y="26" font-weight="600">${xml(Array.from(preview.title).slice(0, 40).join(""))}</text>`];
  rows.forEach((row, index) => {
    const y = 42 + index * 34;
    if (index === 0) parts.push(`<rect x="12" y="${y}" width="616" height="34" fill="#f4f6f8"/>`);
    row.slice(0, 4).forEach((value, column) => {
      const x = 12 + column * columnWidth, id = `cell-${index}-${column}`;
      parts.push(`<clipPath id="${id}"><rect x="${x + 8}" y="${y}" width="${columnWidth - 16}" height="34"/></clipPath>`,
        `<text x="${x + 8}" y="${y + 22}" clip-path="url(#${id})">${xml(Array.from(value.replace(/\s+/g, " ")).slice(0, 80).join(""))}</text>`);
    });
    parts.push(`<path d="M12 ${y + 34}H628" stroke="#e9edf1"/>`);
  });
  parts.push(`<text x="16" y="${height - 15}" font-size="11" fill="#66758a">${xml(preview.notice)}</text>`, "</g></svg>");
  return {svg: parts.join(""), width, height};
}
