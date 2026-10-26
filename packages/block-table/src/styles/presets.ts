import type { WordTableBorder, WordTableStyleDefinition, WordTableStyleFormatting, WordTableStyleLook, WordTableStyleRegistry } from "@quirekit/classic-table-model";
import type { BlockTableStyle } from "./types";

const nil: WordTableBorder = { style: "nil", size: null, color: null, space: null };
const rule: WordTableBorder = { style: "single", size: 6, color: "E0E4EA", space: 0 };
const empty: WordTableStyleFormatting = { table: null, row: null, cell: null, paragraph: null, text: null };
/** First row starts emphasized; the first column remains ordinary body content. */
export const blockTableDefaultLook: WordTableStyleLook = { firstRow: true, lastRow: false, firstColumn: false, lastColumn: false, bandedRows: false, bandedColumns: false };
/** Accessible names and stable product preset keys. */
export const blockTableStyleChoices = [
  { value: "grid", label: "网格" }, { value: "horizontal", label: "横线" }, { value: "banded", label: "隔行底色" }
] as const;
/** Product definitions use a separate namespace from imported or Word built-in styles. */
export const blockTableStyleIds: Readonly<Record<BlockTableStyle, string>> = {
  grid: "QuireBlockGrid", horizontal: "QuireBlockHorizontal", banded: "QuireBlockBanded"
};

/** @param fill - Portable RGB fallback for static output. @returns Conditional heading appearance. */
function heading(fill: string): WordTableStyleFormatting {
  return { ...empty, cell: { shading: { fill, pattern: "clear", color: "auto" } }, text: { fontWeight: "bold" } };
}
/** @param kind - Complete product style. @returns Self-contained canonical definition, without inherited geometry. */
function definition(kind: BlockTableStyle): WordTableStyleDefinition {
  const grid = kind === "grid";
  return {
    id: blockTableStyleIds[kind], name: `Block ${kind}`, basedOn: null, isDefault: false, custom: true,
    uiPriority: null, hidden: false, semiHidden: false,
    base: { ...empty, table: {
      borders: { top: rule, bottom: rule, insideH: rule, left: grid ? rule : nil, right: grid ? rule : nil, insideV: grid ? rule : nil },
      cellMargins: { top: { value: 90, unit: "dxa" }, bottom: { value: 90, unit: "dxa" }, left: { value: 150, unit: "dxa" }, right: { value: 150, unit: "dxa" } },
      rowBandSize: 1, columnBandSize: 0
    }, cell: { verticalAlign: "top" } },
    regions: { firstRow: heading("F5F7FA"), firstColumn: heading("F5F7FA"),
      ...(kind === "banded" ? { band1Horizontal: { ...empty, cell: { shading: { fill: "FAFBFC", pattern: "clear", color: "auto" } } } } : {}) }
  };
}
/** Portable product definitions installed by an explicit style intent or copied table. */
export const blockTableStyleRegistry: WordTableStyleRegistry = {
  version: 1, defaultStyleId: null,
  styles: Object.fromEntries(blockTableStyleChoices.map(item => { const style = definition(item.value); return [style.id, style]; }))
};
