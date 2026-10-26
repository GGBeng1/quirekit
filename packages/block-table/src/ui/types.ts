import type { Node } from "@quirekit/pm";
import type { WordTableGridRect, WordTableMap } from "@quirekit/classic-table-model";

/** Immutable table target retained while a menu owns focus. */
export interface BlockTableTarget {
  /** Captured document; any mutation invalidates this menu. */
  readonly doc: Node;
  /** Absolute position before the table. */
  readonly tablePos: number;
  /** Canonical map shared with Classic. */
  readonly map: WordTableMap;
  /** Selected structural rectangle or current semantic cell. */
  readonly rect: WordTableGridRect;
}
/** Continuous-document table actions backed by canonical commands. */
export type BlockTableAction = "rowBefore" | "rowAfter" | "columnBefore" | "columnAfter" | "deleteRows" | "deleteColumns" | "deleteTable" | "merge" | "split" | "selectRow" | "selectColumn" | "selectTable" | "clear" | "clearFormat" | "alignTop" | "alignCenter" | "alignBottom" | "shadeBlue" | "shadeYellow" | "shadeNone";
