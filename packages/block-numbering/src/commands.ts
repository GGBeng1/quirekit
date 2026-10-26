import type { AnyCommands, CommandProps } from "@quirekit/core";
import type { BlockListKind } from "@quirekit/block-editor";

/** @param context - Current canonical command. @returns Whether the supported flat selection is editable. */
function admitted(context: CommandProps): boolean {
  if (!context.editor.isEditable) return false;
  const { $from, $to } = context.tr.selection;
  for (const endpoint of [$from, $to]) {
    for (let depth = 1; depth <= endpoint.depth; depth++) {
      if (["bulletList", "orderedList"].includes(endpoint.node(depth).type.name)) return false;
    }
  }
  let wrapped = false;
  context.tr.doc.nodesBetween($from.pos, $to.pos, node => {
    if (["bulletList", "orderedList"].includes(node.type.name)) wrapped = true;
    return !wrapped && !node.isTextblock;
  });
  if (wrapped) return false;
  return true;
}

/** @returns Product names delegated to canonical Classic commands within the same transaction. */
export function createListCommands(): AnyCommands {
  return {
    /** @param kind - Requested family. @returns Shared owner command. */
    toggleBlockList: (kind: BlockListKind) => context => admitted(context) && (kind === "ordered"
      ? context.commands.toggleWordOrderedList() : kind === "bullet"
        ? context.commands.toggleWordBulletList() : kind === "task" && context.commands.toggleWordTaskList()),
    /** @param preset - Installed preset identity. @returns Shared preset command. */
    applyBlockListPreset: (preset: string) => context => admitted(context) && context.commands.applyWordNumberingPreset({ presetId: preset }),
    /** @returns Canonical clear command. */
    clearBlockList: () => context => admitted(context) && context.commands.clearWordList(),
    /** @param delta - One nesting level. @returns Canonical level command. */
    changeBlockListLevel: (delta: -1 | 1) => context => admitted(context) && (delta === 1
      ? context.commands.increaseWordListLevel() : delta === -1 && context.commands.decreaseWordListLevel()),
    /** @param start - Positive counter. @returns Canonical restart command. */
    restartBlockList: (start: number) => context => admitted(context) && context.commands.restartWordNumbering({ start }),
    /** @returns Canonical continuation command. */
    continueBlockList: () => context => admitted(context) && context.commands.continueWordNumbering()
  };
}
