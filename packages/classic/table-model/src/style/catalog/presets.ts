import type { WordTableBorder, WordTableWidth } from "../../types";
import type {
  WordTableStyleDefinition,
  WordTableStyleFormatting,
  WordTableStyleLook
} from "../types";

/** Style id of Word's built-in default table style. */
export const wordTableNormalStyleId = "TableNormal";
/** Style id of Word's built-in grid table style. */
export const wordTableGridStyleId = "TableGrid";
/** Style id of the QuireKit academic three-line table style. */
export const wordThreeLineTableStyleId = "QuireThreeLineTable";

/**
 * Creates a single-line border in eighths of a point.
 *
 * @param size - Line width in eighths of a point.
 * @returns Canonical border.
 */
function single(size: number): WordTableBorder {
  return { style: "single", size, color: "auto", space: 0 };
}

/**
 * Creates a twip width.
 *
 * @param value - Width in twentieths of a point.
 * @returns Canonical width.
 */
function dxa(value: number): WordTableWidth {
  return { value, unit: "dxa" };
}

const nil: WordTableBorder = Object.freeze({ style: "nil", size: null, color: null, space: null });

const noFormatting: WordTableStyleFormatting = {
  table: null,
  row: null,
  cell: null,
  paragraph: null,
  text: null
};

// Single spacing without paragraph-after space, matching Word's grid style so
// cell text does not inherit the body paragraph's after spacing.
const compactParagraph = Object.freeze({
  spacing: {
    before: null,
    beforeLines: null,
    beforeAutoSpacing: null,
    after: { unit: "dxa", value: 0 },
    afterLines: null,
    afterAutoSpacing: null,
    line: { rule: "auto", value: 240 }
  }
});

/** Word's default table style: zero indent and 108-twip side cell margins. */
export const wordTableNormalStyle: WordTableStyleDefinition = Object.freeze({
  id: wordTableNormalStyleId,
  name: "Normal Table",
  basedOn: null,
  isDefault: true,
  custom: false,
  uiPriority: 99,
  hidden: false,
  semiHidden: true,
  base: {
    ...noFormatting,
    table: {
      indent: dxa(0),
      cellMargins: {
        top: dxa(0),
        left: dxa(108),
        bottom: dxa(0),
        right: dxa(108)
      }
    }
  },
  regions: {}
});

/** Word's built-in single-line grid table style. */
export const wordTableGridStyle: WordTableStyleDefinition = Object.freeze({
  id: wordTableGridStyleId,
  name: "Table Grid",
  basedOn: wordTableNormalStyleId,
  isDefault: false,
  custom: false,
  uiPriority: 39,
  hidden: false,
  semiHidden: false,
  base: {
    ...noFormatting,
    table: {
      borders: {
        top: single(4),
        left: single(4),
        bottom: single(4),
        right: single(4),
        insideH: single(4),
        insideV: single(4)
      }
    },
    paragraph: compactParagraph
  },
  regions: {}
});

/**
 * Academic three-line table: 1.5 pt top and bottom rules and a 0.75 pt rule
 * under the header rows, with no vertical rules.
 */
export const wordThreeLineTableStyle: WordTableStyleDefinition = Object.freeze({
  id: wordThreeLineTableStyleId,
  name: "三线表",
  basedOn: wordTableNormalStyleId,
  isDefault: false,
  custom: true,
  uiPriority: 40,
  hidden: false,
  semiHidden: false,
  base: {
    ...noFormatting,
    table: {
      borders: {
        top: single(12),
        bottom: single(12),
        left: nil,
        right: nil,
        insideH: nil,
        insideV: nil
      },
      rowBandSize: 1,
      columnBandSize: 1
    },
    paragraph: compactParagraph
  },
  regions: {
    firstRow: {
      ...noFormatting,
      cell: { borders: { bottom: single(6) } }
    }
  }
});

/** Built-in definitions offered by the table style gallery, in gallery order. */
export const wordTableBuiltinStyles: readonly WordTableStyleDefinition[] = Object.freeze([
  wordTableNormalStyle,
  wordTableGridStyle,
  wordThreeLineTableStyle
]);

/** Look recommended when applying the three-line table style. */
export const wordThreeLineTableLook: WordTableStyleLook = Object.freeze({
  firstRow: true,
  lastRow: false,
  firstColumn: false,
  lastColumn: false,
  bandedRows: false,
  bandedColumns: false
});
