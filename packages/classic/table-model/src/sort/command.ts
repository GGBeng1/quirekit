import { defineCommand, type AnyCommands, type CommandProps, type QuireEditor } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { isWordRevisionTrackingActive } from "@quirekit/classic-revision-contract";
import { createTableTransformCommand } from "../commands/derive/editor/transform";
import { locateWordTable } from "../commands/derive/editor/table";
import type { WordTableEditorLocateOptions } from "../commands/types";
import { insertSortedWordTableRowCopies, planWordTableRowSort, sortWordTableRows } from "./rows";
import type { SortWordTableRowsOptions, WordTableSortRefusal } from "./types";

/** Sort request addressed to the selected or an explicit table. */
export interface SortWordTableRowsCommandOptions extends SortWordTableRowsOptions, WordTableEditorLocateOptions {}

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Sort commands installed by the WordTable extension. */
    readonly wordTableSort: {
      /** Reorders the table rows by one to three keys; untracked edits only. */
      sortWordTableRows: (options: SortWordTableRowsCommandOptions) => ReturnType;
    };
  }
}

/** Distinguishes the history composition of each tracked sort. */
let compositionSequence = 0;

/** @returns The table sort command, described for Agents. */
export function createWordTableSortEditorCommands(): AnyCommands {
  return {
    sortWordTableRows: defineCommand({
      description: "Sorts the rows of the table by one to three columns, as Word's Sort: each key compares text, numbers or dates, ascending or descending; a header row stays first. Tables with cells merged across rows cannot be sorted.",
      target: "block",
      nodes: ["wordTable"],
      params: {
        type: "object",
        required: ["keys"],
        properties: {
          keys: {
            type: "array", minItems: 1, maxItems: 3,
            items: {
              type: "object", required: ["column"],
              properties: {
                column: { type: "integer", minimum: 1, description: "Column counted from 1." },
                type: { enum: ["text", "number", "date"], description: "Default text." },
                order: { enum: ["ascending", "descending"], description: "Default ascending." }
              },
              additionalProperties: false
            }
          },
          hasHeader: { type: "boolean", description: "Keep the first row in place; default false." }
        },
        additionalProperties: false
      },
      adapt: (value) => {
        const params = value as { keys: { column: number; type?: string; order?: string }[]; hasHeader?: boolean };
        return {
          hasHeader: params.hasHeader === true,
          keys: params.keys.map(key => ({ column: key.column - 1, type: key.type ?? "text", order: key.order ?? "ascending" }))
        };
      },
      run: createTableTransformCommand<SortWordTableRowsCommandOptions>(sortWordTableRows, undefined, { preserveSelectionWithinTable: true })
    })
  };
}

/**
 * Checks whether the selected table can be sorted.
 *
 * @param editor - Editor owning the Word table schema.
 * @param options - Keys and header choice.
 * @returns Null when sortable, otherwise why not; "no-table" outside a table.
 */
export function checkWordTableSort(
  editor: QuireEditor,
  options: SortWordTableRowsCommandOptions
): WordTableSortRefusal | "no-table" | null {
  const table = locateSelectedTable(editor, options.tablePos);
  if (table === null) return "no-table";
  const plan = planWordTableRowSort(table.node, options);
  return typeof plan === "string" ? plan : null;
}

/**
 * Sorts the selected table, recording it as Word does under tracked changes.
 *
 * Without tracking the rows are reordered. With tracking the sorted rows are
 * inserted as copies and the original rows are then deleted, in two
 * transactions sharing one history composition so a single undo restores the table.
 *
 * @param editor - Editor owning the Word table schema.
 * @param options - Keys and header choice.
 * @returns Whether the table was sorted.
 */
export function sortWordTable(editor: QuireEditor, options: SortWordTableRowsCommandOptions): boolean {
  const table = locateSelectedTable(editor, options.tablePos);
  if (table === null) return false;
  const located = { ...options, tablePos: table.pos };
  if (!isWordRevisionTrackingActive(editor)) {
    return editor.chain().command(({ tr }: CommandProps) => { closeHistory(tr); return true; }).sortWordTableRows(located).run();
  }
  const plan = planWordTableRowSort(table.node, options);
  if (typeof plan === "string") return false;
  const composition = `word-table-sort:${++compositionSequence}`;
  const insertCopies = createTableTransformCommand<SortWordTableRowsCommandOptions>(insertSortedWordTableRowCopies, undefined, { granularity: "minimal" });
  const inserted = editor.chain().command((props: CommandProps) => {
    closeHistory(props.tr).setMeta("composition", composition);
    return insertCopies(located)(props);
  }).run();
  if (!inserted) return false;
  const count = plan.order.length;
  const deleted = editor.chain()
    .command(({ tr }: CommandProps) => { tr.setMeta("composition", composition); return true; })
    .deleteWordTableRows({ tablePos: table.pos, from: plan.start + count, to: plan.start + 2 * count - 1 })
    .run();
  if (!deleted) editor.commands.undo();
  return deleted;
}

/**
 * @param editor - Editor.
 * @param tablePos - Optional explicit table position.
 * @returns The addressed table and its position, or null.
 */
function locateSelectedTable(editor: QuireEditor, tablePos: number | undefined): { readonly pos: number; readonly node: import("@quirekit/pm").Node } | null {
  let found: { readonly pos: number; readonly node: import("@quirekit/pm").Node } | null = null;
  editor.chain().command((props: CommandProps) => {
    found = locateWordTable(props, tablePos);
    return false;
  }).run();
  return found;
}
