import type { AnyCommands } from "@quirekit/core";
import {
  createWordTableCellEditorCommands,
  createWordTableColumnEditorCommands,
  createWordTableInsertionEditorCommands,
  createWordTableMatrixEditorCommands,
  createWordTableNavigationEditorCommands,
  createWordTableRowEditorCommands,
  createWordTableSelectionEditorCommands,
  createWordTableStyleEditorCommands,
  createWordTableTableEditorCommands
} from "./editor/index";

export * from "./editor/index";
import { describeWordTableCommands } from "./editor/agent/descriptors";
import { createWordTableSortEditorCommands } from "../sort/command";

/**
 * Creates editor-facing Word table commands grouped by feature-owned family.
 *
 * @returns Command map installed by the `WordTable` extension.
 */
export function createWordTableEditorCommands(): AnyCommands {
  return describeWordTableCommands({
    ...createWordTableSelectionEditorCommands(),
    ...createWordTableNavigationEditorCommands(),
    ...createWordTableInsertionEditorCommands(),
    ...createWordTableMatrixEditorCommands(),
    ...createWordTableTableEditorCommands(),
    ...createWordTableRowEditorCommands(),
    ...createWordTableColumnEditorCommands(),
    ...createWordTableCellEditorCommands(),
    ...createWordTableStyleEditorCommands(),
    ...createWordTableSortEditorCommands()
  });
}
