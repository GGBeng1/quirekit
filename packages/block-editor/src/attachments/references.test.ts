// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../runtime";
import { collectAttachmentReferences, insertAttachmentReference, readAttachmentQuery } from "./references";
const sessions: BlockEditorInstance[]=[];
const file={id:"reference-file",name:"发布清单.txt",mime:"text/plain",src:"data:text/plain;base64,aGVsbG8="};
/** @param text - Editable query context. @returns A file and a paragraph containing that context. */
function setup(text:string) {
  const session=createBlockEditor({content:{type:"doc",content:[{type:"blockAsset",attrs:{items:[file]}},{type:"paragraph",content:[{type:"text",text,marks:[{type:"bold"}]}]}]}});
  sessions.push(session);session.editor.commands.setTextSelection(session.editor.state.doc.content.size-1);return session.editor;
}
afterEach(()=>sessions.splice(0).forEach(session=>session.destroy()));
it("references a current attachment inline without losing adjacent text, marks, file identity or undo",()=>{
  const editor=setup("附件见 @发布"), before=editor.getJSON(),query=readAttachmentQuery(editor)!;
  expect(query.query).toBe("发布");expect(insertAttachmentReference(editor,query,file)).toBe(true);
  const paragraph=editor.state.doc.lastChild!, inline=paragraph.lastChild!;
  expect(paragraph.firstChild!.text).toBe("附件见 ");expect(inline.type.name).toBe("inlineAttachment");
  expect(inline.attrs.items).toEqual([file]);expect(inline.marks[0]!.type.name).toBe("bold");
  expect(collectAttachmentReferences(editor.state.doc)).toEqual([file]);
  editor.commands.undo();expect(editor.getJSON()).toEqual(before);
});
it("does not trigger for email, code, non-caret selection, or stale and removed file targets",()=>{
  const editor=setup("mail@example.com");expect(readAttachmentQuery(editor)).toBeNull();
  editor.commands.setContent({type:"doc",content:[{type:"codeBlock",content:[{type:"text",text:"@file"}]}]});editor.commands.setTextSelection(6);expect(readAttachmentQuery(editor)).toBeNull();
  const second=setup("@发布"),query=readAttachmentQuery(second)!;
  second.setEditable(false);expect(insertAttachmentReference(second,query,file)).toBe(false);second.setEditable(true);
  second.commands.deleteRange({from:0,to:1});expect(insertAttachmentReference(second,query,file)).toBe(false);
  expect(insertAttachmentReference(second,readAttachmentQuery(second)!,file)).toBe(false);
  second.commands.setTextSelection({from:1,to:3});expect(readAttachmentQuery(second)).toBeNull();
});
