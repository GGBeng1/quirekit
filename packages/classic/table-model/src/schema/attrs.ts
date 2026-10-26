import type { QuireExtensionAttributeSpec } from "@quirekit/core";
import type {
  WordTableAttrs,
  WordTableCellAttrs,
  WordTableRowAttrs
} from "../types";
import {
  wordTableColorToCss,
  wordTableStyleAttribute,
  wordTableVerticalAlignToCss,
  wordTableWidthToCss
} from "./html-attributes";

type WordTableAttributeMap<Attrs extends object> = {
  readonly [Key in keyof Attrs]: QuireExtensionAttributeSpec;
};

/** Schema attributes installed on `wordTable`. */
export const wordTableAttributes = {
  wordTablePropertyRevisions: { default: null, rendered: false },
  tableStyle: { default: null, rendered: false },
  styleProperties: { default: null, rendered: false },
  width: {
    default: null,
    renderHTML: attrs => wordTableStyleAttribute(
      "width",
      wordTableWidthToCss(attrs.width as WordTableAttrs["width"])
    )
  },
  alignment: {
    default: null,
    renderHTML: attrs => {
      const alignment = attrs.alignment as WordTableAttrs["alignment"];

      return alignment === "center"
        ? { style: "margin-left: auto; margin-right: auto" }
        : alignment === "right"
          ? { style: "margin-left: auto; margin-right: 0" }
          : {};
    }
  },
  tableIndent: { default: null, rendered: false },
  tableLayout: {
    default: null,
    renderHTML: attrs => wordTableStyleAttribute(
      "table-layout",
      attrs.tableLayout === "fixed" ? "fixed" : null
    )
  },
  tableLook: { default: null, rendered: false },
  bidiVisual: { default: null, rendered: false },
  grid: { default: null, rendered: false },
  legacyColumns: { default: null, rendered: false },
  borders: { default: null, rendered: false },
  shading: { default: null, rendered: false },
  cellSpacing: { default: null, rendered: false },
  defaultCellMargins: { default: null, rendered: false },
  floating: { default: null, rendered: false },
  styleBandSize: { default: null, rendered: false },
  preservation: { default: null, rendered: false }
} satisfies WordTableAttributeMap<WordTableAttrs>;

/** Schema attributes installed on `wordTableRow`. */
export const wordTableRowAttributes = {
  wordTablePropertyRevisions: { default: null, rendered: false },
  wordTableStructuralRevision: { default: null, rendered: false },
  isHeader: { default: false, rendered: false },
  height: { default: null, rendered: false },
  cantSplit: { default: false, rendered: false },
  gridBefore: { default: 0, rendered: false },
  gridAfter: { default: 0, rendered: false },
  cellSpacing: { default: null, rendered: false },
  borders: { default: null, rendered: false },
  alignment: { default: null, rendered: false },
  conditionalStyle: { default: null, rendered: false },
  preservation: { default: null, rendered: false }
} satisfies WordTableAttributeMap<WordTableRowAttrs>;

/** Schema attributes installed on `wordTableCell`. */
export const wordTableCellAttributes = {
  wordTablePropertyRevisions: { default: null, rendered: false },
  wordTableStructuralRevision: { default: null, rendered: false },
  width: { default: null, rendered: false },
  colspan: {
    default: 1,
    parseHTML: element => Number(element.getAttribute("colspan") ?? 1),
    renderHTML: attrs => {
      const value = attrs.colspan as number;
      return value > 1 ? { colspan: value } : {};
    }
  },
  gridSpan: { default: 1, rendered: false },
  rowspan: {
    default: 1,
    parseHTML: element => Number(element.getAttribute("rowspan") ?? 1),
    renderHTML: attrs => {
      const value = attrs.rowspan as number;
      return value > 1 ? { rowspan: value } : {};
    }
  },
  vMerge: {
    default: null,
    renderHTML: attrs => wordTableStyleAttribute(
      "display",
      attrs.vMerge === "continue" ? "none" : null
    )
  },
  vMergePreservation: { default: null, rendered: false },
  hMerge: { default: null, rendered: false },
  borders: { default: null, rendered: false },
  shading: { default: null, rendered: false },
  backgroundColor: {
    default: null,
    renderHTML: attrs => wordTableStyleAttribute(
      "background-color",
      wordTableColorToCss((attrs.shading as WordTableCellAttrs["shading"])?.fill
        ?? attrs.backgroundColor as WordTableCellAttrs["backgroundColor"])
    )
  },
  noWrap: {
    default: null,
    // Each cell owns wrapping, including nested cells inside a no-wrap parent.
    renderHTML: attrs => wordTableStyleAttribute(
      "white-space",
      attrs.noWrap === true ? "nowrap" : "normal"
    )
  },
  cellMargins: { default: null, rendered: false },
  textDirection: { default: null, rendered: false },
  fitText: { default: null, rendered: false },
  verticalAlign: {
    default: null,
    renderHTML: attrs => wordTableStyleAttribute(
      "vertical-align",
      wordTableVerticalAlignToCss(
        attrs.verticalAlign as WordTableCellAttrs["verticalAlign"]
      ) ?? "top"
    )
  },
  hideMark: { default: null, rendered: false },
  conditionalStyle: { default: null, rendered: false },
  preservation: { default: null, rendered: false }
} satisfies WordTableAttributeMap<WordTableCellAttrs>;
