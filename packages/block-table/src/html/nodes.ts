import { mergeAttributes } from "@quirekit/core";
import { WordTable, WordTableCell, WordTableRow } from "@quirekit/classic-table-model";
import { createBlockTableSurface } from "./surface";
import { blockTableStyleIds } from "../styles/presets";

/** Canonical table with a retained HTML sizing shell. */
export const BlockTableNode = WordTable.extend({
  /** @param context - Canonical table and schema attributes. @returns Product theme identity alongside the ordinary table shell. */
  renderHTML({ node, HTMLAttributes }) {
    return ["table", mergeAttributes({ style: "border-collapse: collapse; width: 100%" }, HTMLAttributes,
      Object.values(blockTableStyleIds).includes(node.attrs.tableStyle) ? { "data-block-table-style": node.attrs.tableStyle } : {}), ["tbody", 0]];
  },
  /** @returns HTML-only column shell; no second document or table engine. */
  addNodeView() { return createBlockTableSurface; }
});
/** Canonical row with its existing height projected to continuous HTML flow. */
export const BlockTableRowNode = WordTableRow.extend({
  /** @param context - Existing canonical row and resolved attributes. @returns Row shell with the declared height. */
  renderHTML({ node, HTMLAttributes }) {
    const height = node.attrs.height;
    return ["tr", mergeAttributes(HTMLAttributes, height?.value > 0 && height.rule !== "auto" ? { style: `height: ${height.value / 20}pt` } : {}), 0];
  }
});
/** Canonical cells with a quiet theme fallback; document styles retain precedence. */
export const BlockTableCellNode = WordTableCell.extend({
  /** @param context - Canonical cell presentation. @returns The same content hole with a product default border. */
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes({ style: "border: 1px solid var(--qk-color-border-subtle, #e2e5eb); padding: 6px 10px" }, HTMLAttributes), 0];
  }
});
