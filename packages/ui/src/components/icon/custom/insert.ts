/**
 * Wraps original insertion artwork in the public compact icon geometry contract.
 * @param geometry - Trusted paths drawn on the 24-unit grid.
 * @returns Monochrome SVG with the same stroke and safe inset as standard icons.
 */
function icon(geometry: string): string {
  return `<svg data-icon-style="lucide-custom" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${geometry}</svg>`;
}

/** Distinct document and graphic tasks that lack an exact standard glyph. */
export const insertIconSvg = Object.freeze({
  figureCaption: icon('<rect x="4" y="3" width="16" height="11" rx="2"/><path d="m5 12 5-5 4 4 2-2 3 3M6 18h12M9 21h6"/>'),
  whiteboard: icon('<path d="M3 4h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM8 17l-2 4m10-4 2 4M7 12c1-5 3-5 4-2s3 3 6-2"/>'),
  textDiagram: icon('<path d="m5 3-3 4 3 4m5-8 3 4-3 4M7 14v3a2 2 0 0 0 2 2h5m-3-3 3 3-3 3"/><rect x="16" y="12" width="6" height="8" rx="1"/>'),
  mindMap: icon('<circle cx="10" cy="12" r="3"/><path d="M3 12h4m6-1 4-6h4m-8 8 4 6h4m-8-7h8"/>'),
  sectionBreak: icon('<path d="M4 3h16M4 7h10M3 12h3m4 0h4m4 0h3M4 17h16M4 21h10"/>'),
  footnote: icon('<path d="M15 3H5v18h14V10M8 7h4M8 11h4M8 16h8M8 19h4m8-16 2-1v5"/>'),
  endnote: icon('<path d="M8 3H4v14m4-10h12v14H8ZM11 12h6m-6 4h6m-6 3h3"/>'),
  chartDoughnut: icon('<path d="M12 3a9 9 0 1 0 9 9h-5a4 4 0 1 1-4-4ZM16 3v5h5a9 9 0 0 0-5-5Z"/>')
});
