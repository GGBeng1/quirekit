import { startEditorBlockDrag } from "@quirekit/editor-ui";
/** @param args - Existing Classic drag intent. @returns Shared pointer lease cancellation. */
export function startClassicBlockDrag(...args: Parameters<typeof startEditorBlockDrag>): ReturnType<typeof startEditorBlockDrag> {
  const [editor, root, ...rest] = args;
  return startEditorBlockDrag(editor, root.querySelector<HTMLElement>(".qk-classic-editor__workspace-viewport") ?? root, ...rest);
}
