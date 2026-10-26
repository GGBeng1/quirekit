import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../index";
import { captureBlockTarget } from "../ui/blocks/actions";
import { captureBlockMedia, updateBlockMedia } from "./commands";

const instances: BlockEditorInstance[] = [];
afterEach(() => instances.splice(0).forEach(instance => instance.destroy()));
it("shares the same media target for whole-block menus and object clicks, excluding multi-block selections", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "image", attrs: { src: "image.png", alt: "One" } },
    { type: "paragraph", content: [{ type: "text", text: "After" }] }
  ] } });
  instances.push(instance); const editor = instance.editor;
  const block = captureBlockTarget(editor, 0)!;
  editor.commands.selectBlockRange(block.range);
  const target = captureBlockMedia(editor);
  expect(target?.pos).toBe(0);
  expect(updateBlockMedia(editor, target!, { align: "right" })).toBe(true);
  expect(editor.state.doc.firstChild!.attrs.media.align).toBe("right");
  editor.commands.undo();
  editor.commands.setNodeSelection(0);
  expect(captureBlockMedia(editor)?.pos).toBe(0);
  const first = captureBlockTarget(editor, 0)!, second = captureBlockTarget(editor, 1)!;
  editor.commands.selectBlockRange({ ...first.range, focus: second.block });
  expect(captureBlockMedia(editor)).toBeNull();
});
