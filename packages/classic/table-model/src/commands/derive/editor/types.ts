import type { CommandProps } from "@quirekit/core";
import type { Node as PMNode, Selection } from "@quirekit/pm";
import type { WordTableEditorLocateOptions } from "../../types";
import type { WordTableStepGranularity } from "../steps/types";

/** Optional behavior for an editor-facing table transform command. */
export interface TableTransformCommandOptions<
  Options extends WordTableEditorLocateOptions = WordTableEditorLocateOptions
> {
  /** Preserve a selection inside the table when the replacement keeps its topology. */
  readonly preserveSelectionWithinTable?: boolean;
  /** Request selection navigation after the edit; false preserves existing chain intent. Defaults to true. */
  readonly scrollIntoView?: boolean;
  /** How the result is written: minimal identity-preserving steps or one table replacement. Defaults to whole-table. */
  readonly granularity?: WordTableStepGranularity;
  /** Resolves an explicit canonical selection after the replacement is applied. */
  readonly resolveSelectionAfterTransform?: ((
    context: TableTransformSelectionContext<Options>
  ) => Selection | null) | undefined;
}

/** Facts available while resolving selection after one Table replacement. */
export interface TableTransformSelectionContext<Options extends WordTableEditorLocateOptions> {
  /** Transaction after the replacement step was applied. */
  readonly tr: CommandProps["tr"];
  /** Absolute position immediately before the replaced Table. */
  readonly tablePos: number;
  /** Table node before the transform. */
  readonly previousTable: PMNode;
  /** Replacement Table node. */
  readonly nextTable: PMNode;
  /** Canonical selection captured before replacement. */
  readonly selection: Selection;
  /** Resolved command options used by the pure transform. */
  readonly options: Options;
}
