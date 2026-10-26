import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { readBlockListFeature } from "./feature";

/** Uses the installed list owner's marker and nesting commands, including automatic numbering. */
export const blockListMenu: EditorBlockMenuProvider = {
  id: "list", order: 10,
  /** @param context - Captured list item. @returns Actions supplied by the installed numbering semantics. */
  getItems({ editor, block, range }) {
    const feature = readBlockListFeature(editor);
    if (!feature?.kind(block.node, editor.state.doc)) return [];
    return [
      ...(feature.markerActions?.(editor, block.from) ?? []).map(action => ({ value: action.id, label: action.label,
        disabled: action.disabled, run: action.execute })),
      ...([-1, 1] as const).map(delta => ({ value: `level:${delta}`, label: delta < 0 ? "减少缩进" : "增加缩进", icon: delta < 0 ? "indentDecrease" : "indentIncrease",
        isEnabled: () => editor.can().chain().selectBlockRange(range).changeBlockListLevel(delta).run(),
        run: () => editor.chain().closeHistory().changeBlockListLevel(delta).run() }))
    ];
  }
};
