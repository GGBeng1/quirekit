import { createEditor, type CommandProps, type QuireAnyExtension } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { deriveQuireViewUpdatePatch } from "../src/invalidation";
import type { QuireViewEngineFrameBuildOptions } from "../src/frame/types";

export const baseOptions: QuireViewEngineFrameBuildOptions = {
  viewportRect: { x: 0, y: 0, width: 320, height: 240 }
};

/**
 * Creates immutable text source shared by the runtime admission cases.
 *
 * @param paragraphs - Number of body paragraphs to construct.
 * @param extensions - Additional extension callbacks whose authority is under test.
 * @returns Real editor with ordinary StarterKit styling.
 */
export function createFixtureEditor(paragraphs = 1, extensions: QuireAnyExtension[] = []) {
  return createEditor({
    extensions: [StarterKit.configure({ undoRedo: false }), ...extensions],
    content: {
      type: "doc",
      content: Array.from({ length: paragraphs }, () => ({
        type: "paragraph",
        content: [{ type: "text", text: "stable geometry" }]
      }))
    }
  });
}

/**
 * Dispatches a real selection transaction without changing the source document.
 *
 * @param editor - Fixture editor receiving the transaction.
 * @param anchor - Fixed selection endpoint.
 * @param head - Active endpoint, or anchor for a collapsed selection.
 */
export function setSelection(editor: ReturnType<typeof createFixtureEditor>, anchor: number, head = anchor): void {
  editor.commands.command(({ tr }: CommandProps) => {
    tr.setSelection(TextSelection.create(tr.doc, anchor, head));
    return true;
  });
}

/** @returns Typed selection-only update evidence for a frame request. */
export function selectionPatch() {
  return deriveQuireViewUpdatePatch({ reason: "selection" });
}
