// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../runtime";
const sessions: BlockEditorInstance[] = [];
const file = { id:"file-a", name:"checklist.txt", src:"data:text/plain;base64,aGVsbG8=", mime:"text/plain", size:5 };
/** @returns One original attachment and following paragraph. */
function setup() {
  const instance=createBlockEditor({content:{type:"doc",content:[{type:"blockAsset",attrs:{items:[file],caption:"发布前检查"}},{type:"paragraph"}]}});
  sessions.push(instance); return instance.editor;
}
afterEach(()=>{sessions.splice(0).forEach(instance=>instance.destroy());});
it("preserves resources and caption through both views, undo and JSON/HTML",()=>{
  const editor=setup(),original=editor.getJSON(),node=editor.state.doc.firstChild!;
  expect(editor.can().setBlockAttachmentView(0,node,"inline")).toBe(true);expect(editor.getJSON()).toEqual(original);
  expect(editor.commands.setBlockAttachmentView(0,node,"inline")).toBe(true);
  const inline=editor.state.doc.nodeAt(1)!;expect(inline.type.name).toBe("inlineAttachment");expect(inline.attrs.items).toEqual([file]);
  expect(editor.commands.setBlockAttachmentView(1,inline,"card")).toBe(true);
  expect(editor.state.doc.firstChild!.attrs).toMatchObject({caption:"发布前检查",items:[file]});
  editor.commands.undo();expect(editor.state.doc.nodeAt(1)!.type.name).toBe("inlineAttachment");
  const html=editor.getHTML();editor.commands.setContent(html);
  expect(editor.state.doc.nodeAt(1)!.attrs).toMatchObject({items:[file],caption:"发布前检查"});
  editor.commands.setBlockAttachmentView(1,editor.state.doc.nodeAt(1)!,"card");
  expect(editor.getHTML()).not.toContain("<iframe");
});
it("splits inline attachments without losing neighbouring formatted text or multiple files",()=>{
  const editor=setup();editor.commands.setContent({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"before",marks:[{type:"bold"}]},{type:"inlineAttachment",attrs:{items:[file,{...file,id:"file-b",name:"second.txt"}],caption:"Two files"}},{type:"text",text:"after",marks:[{type:"italic"}]}]}]});
  const original=editor.getJSON(),node=editor.state.doc.nodeAt(7)!;
  expect(editor.commands.setBlockAttachmentView(7,node,"card")).toBe(true);
  expect(editor.state.doc.childCount).toBe(3);expect(editor.state.doc.firstChild!.textContent).toBe("before");expect(editor.state.doc.lastChild!.textContent).toBe("after");
  expect(editor.state.doc.lastChild!.firstChild!.marks[0]!.type.name).toBe("italic");expect(editor.state.doc.child(1).attrs.items).toHaveLength(2);
  editor.commands.undo();expect(editor.getJSON()).toEqual(original);
});
it("rejects stale, readonly and invalid parent transforms without mutation",()=>{
  const editor=setup(),node=editor.state.doc.firstChild!;
  editor.setEditable(false);expect(editor.commands.setBlockAttachmentView(0,node,"inline")).toBe(false);editor.setEditable(true);
  editor.commands.setContent({type:"doc",content:[{type:"blockAsset",attrs:{items:[{...file,mime:"application/octet-stream",src:"https://example.com/a.docx",name:"a.docx"}]}}]});
  expect(editor.commands.setBlockAttachmentView(0,node,"card")).toBe(false);
  editor.commands.setContent({type:"doc",content:[{type:"bulletList",content:[{type:"listItem",content:[{type:"paragraph",content:[{type:"inlineAttachment",attrs:{items:[file]}}]}]}]}]});
  const original=editor.getJSON();expect(editor.commands.setBlockAttachmentView(3,editor.state.doc.nodeAt(3)!,"card")).toBe(false);expect(editor.getJSON()).toEqual(original);
});
it("inserts files at a caret or replaces a slash block and preserves editing undo",()=>{
  const editor=setup(), content=[{type:"inlineAttachment",attrs:{items:[file]}}];
  editor.commands.setContent({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"/附件"}]}]});
  expect(editor.commands.applyBlockRichContent({doc:editor.state.doc,kind:"attachment",range:{from:0,to:5}},content)).toBe(true);
  expect(editor.state.doc.firstChild!.type.name).toBe("paragraph");expect(editor.state.doc.nodeAt(1)!.type.name).toBe("inlineAttachment");
  editor.commands.undo();expect(editor.state.doc.textContent).toBe("/附件");
  editor.commands.setContent({type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"before after"}]}]});
  expect(editor.commands.applyBlockRichContent({doc:editor.state.doc,kind:"attachment",range:{from:8,to:8}},content)).toBe(true);
  expect(editor.state.doc.firstChild!.textContent).toBe("before after");
  const source=editor.state.doc.nodeAt(8)!;
  expect(editor.commands.applyBlockRichContent({doc:editor.state.doc,kind:"attachment",range:{from:8,to:9},node:source},[{...content[0]!,attrs:{items:[{...file,name:"renamed.txt"}]}}])).toBe(true);
  expect(editor.state.doc.nodeAt(8)!.attrs.items[0].name).toBe("renamed.txt");
  editor.commands.undo();expect(editor.state.doc.nodeAt(8)!.attrs.items[0].name).toBe(file.name);
});
