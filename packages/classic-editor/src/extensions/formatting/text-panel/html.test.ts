// @vitest-environment happy-dom
import { createEditor } from "@quirekit/core";
import { Underline, underlineStyles } from "@quirekit/extension-underline";
import { StarterKit } from "@quirekit/starter-kit";
import { expect, it } from "vitest";

it.each(underlineStyles)('preserves %s and independent color through the public HTML codec', style => {
  const editor = createEditor({ extensions: [StarterKit.configure({ underline: false }), Underline], content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ABC' }] }] } });
  editor.chain().setTextSelection({ from: 1, to: 4 }).setUnderline({ underlineType: style, color: '#123456' }).run();
  const html = editor.getHTML();
  editor.commands.setContent(html);
  editor.commands.setTextSelection({ from: 1, to: 4 });
  expect(editor.getAttributes('underline')).toMatchObject({ underlineType: style, color: '#123456' });
  editor.destroy();
});
