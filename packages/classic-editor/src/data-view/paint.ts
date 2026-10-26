import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { DataViewPreview } from "@quirekit/data-view";

/** Builds bounded neutral text primitives; no media policy or browser decoder is involved.
 * @param preview - Complete prepared summary.
 * @param width - Available object width in CSS pixels.
 * @returns A retained tree shared by Canvas and SVG.
 */
export function dataViewPaint(preview: DataViewPreview, width: number): QuireViewNode {
  const inner = Math.max(0, width - 24), count = Math.max(1, ...preview.rows.map(row => row.length)), cellWidth = inner / count;
  /** @param text - Preview text. @param size - Available width. @param bold - Heading style. @returns Bounded single-line text. */
  function label(text: string, size: number, bold = false): QuireViewNode {
    return qkView.paragraphPreview({text, width: size, height: 24, maxLines: 1, whiteSpace: "nowrap", overflow: "ellipsis", style: {font: `${bold ? "600 " : ""}13px sans-serif`, color: "#253147", lineHeight: 20}});
  }
  return qkView.surface({width, height: 76 + preview.rows.length * 34, style: {fill: "#ffffff", stroke: {color: "#dce1e7", width: 1}, borderRadius: 8}, padding: qkView.insets(12),
    child: qkView.column({width: inner, children: [label(preview.title, inner, true),
      ...preview.rows.map((row, index) => qkView.row({width: inner, height: 34, children: row.map(text => qkView.surface({width: cellWidth, height: 34,
        style: {fill: index === 0 ? "#f4f6f8" : "#ffffff", stroke: {color: "#e9edf1", width: .5}}, padding: qkView.insets({top: 5, bottom: 5, left: 8, right: 8}), child: label(text, Math.max(0, cellWidth - 16), index === 0)}))})),
      label(preview.notice, inner)]})});
}
