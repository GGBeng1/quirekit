import type { AnyCommands } from "@quirekit/core";
import { deleteWordTable } from "../compound";
import { setWordTableAttrs } from "../formatting";
import { repairWordTableNode } from "../repair";
import { withSelectedTablePosition } from "../derive/editor/selection/options";
import { createTableTransformCommand } from "../derive/editor/transform";
import type {
  DeleteWordTableCommandOptions,
  RepairWordTableCommandOptions,
  SetWordTableAttrsCommandOptions
} from "../types";

/**
 * Creates editor commands owned by the whole-table family.
 *
 * @returns Editor command map for logical table operations.
 */
export function createWordTableTableEditorCommands(): AnyCommands {
  return {
    deleteWordTable:
      createTableTransformCommand<DeleteWordTableCommandOptions>(
        deleteWordTable,
        withSelectedTablePosition
      ),
    setWordTableAttrs:
      createTableTransformCommand<SetWordTableAttrsCommandOptions>(
        setWordTableAttrs,
        undefined,
        { preserveSelectionWithinTable: true }
      ),
    repairWordTable:
      createTableTransformCommand<RepairWordTableCommandOptions>(
        repairWordTableNode
      )
  };
}
