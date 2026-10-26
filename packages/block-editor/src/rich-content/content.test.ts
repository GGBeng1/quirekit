// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import type { QuireJSONContent } from "@quirekit/core";
import { createBlockEditor } from "../runtime/create";
import { readBlockCatalog } from "@quirekit/extensions";
import { createColumns } from "../columns/model";
import { webURL, resourceURL } from "./urls";
import { registerRichContentHost, openRichContent } from "./tasks";
import type { RichContentRequest } from "./types";
import { freshTemplateContent, templateError } from "../templates/library";
import { blockContentTemplates } from "../templates/catalog";
import { blockInsertItems } from "../ui/insert/catalog";
import { acceptBlockSlash } from "../ui/insert/execute";
import { storeBlockFiles } from "../resources/files";
const sessions:ReturnType<typeof createBlockEditor>[]=[];
afterEach(()=>sessions.splice(0).forEach(session=>session.destroy()));
/** @param content - Fixture blocks. @returns Canonical headless owner. */
function session(content:QuireJSONContent[]=[{type:"paragraph"}]) {
  const result=createBlockEditor({content:{type:"doc",content}});sessions.push(result);return result.editor;
}
const card={type:"webCard",attrs:{url:"https://example.com/guide",title:"参考资料",description:"说明",mode:"card"}};
const image=(id:string)=>({id,src:"data:image/png;base64,aGVsbG8=",name:id+".png",mime:"image/png"});
it("guards every insertion entry, preserving slash cancellation, stale targets and undo",()=>{
  const editor=session([{type:"paragraph",content:[{type:"text",text:"/"}]}]);
  const doc=editor.state.doc;let request:RichContentRequest|undefined;
  const release=registerRichContentHost(editor,value=>request=value);
  expect(blockInsertItems(editor,"",true).map(item=>item.id)).toEqual(expect.arrayContaining(["columns","template","webCard","embed","attachment","audio","video","imageGallery"]));
  expect(acceptBlockSlash(editor,{doc,from:0,to:3,text:"/"},"webCard")).toBe(true);
  expect(editor.state.doc).toBe(doc);
  expect(editor.commands.applyBlockRichContent(request!,[card])).toBe(true);
  expect(editor.state.doc.firstChild!.type.name).toBe("webCard");
  expect(editor.commands.applyBlockRichContent(request!,[card])).toBe(false);
  editor.commands.closeHistory();editor.commands.undo();expect(editor.state.doc.textContent).toBe("/");
  openRichContent(editor,"columns");editor.setEditable(false);
  expect(editor.commands.applyBlockRichContent(request!,[createColumns([50,50])])).toBe(false);release();
});
it("resizes, reduces and unwraps columns without dropping any content",()=>{
  const content={...createColumns([34,33,33]),content:["左","中","右"].map(text=>({type:"blockColumn",content:[{type:"paragraph",content:[{type:"text",text}]}]}))};
  const editor=session([content]),before=editor.state.doc;
  expect(editor.commands.setBlockColumns(0,[30,70])).toBe(true);
  expect(editor.state.doc.firstChild!.childCount).toBe(2);expect(editor.state.doc.textContent).toBe("左中右");
  editor.commands.closeHistory();editor.commands.undo();expect(editor.state.doc.textContent).toBe(before.textContent);expect(editor.state.doc.firstChild!.attrs.widths).toEqual([34,33,33]);
  expect(editor.commands.unwrapBlockColumns(0)).toBe(true);expect(editor.getJSON().content!.filter(node=>node.content?.length)).toHaveLength(3);expect(editor.state.doc.textContent).toBe("左中右");
  expect(editor.commands.setBlockColumns(0,[1,99])).toBe(false);
});
it("moves a complete block across columns and keeps a usable empty source",()=>{
  const content={...createColumns([50,50]),content:[{type:"blockColumn",content:[{type:"paragraph",content:[{type:"text",text:"移动我"}]}]},{type:"blockColumn",content:[{type:"paragraph"}]}]};
  const editor=session([content]);
  expect(readBlockCatalog(editor)!.byFrom.get(2)?.node.type.name).toBe("paragraph");
  expect(editor.commands.moveBlockToColumn(2,1)).toBe(true);
  const group=editor.state.doc.firstChild!;
  expect(group.child(0).textContent).toBe("");expect(group.child(1).textContent).toBe("移动我");expect(group.child(0).firstChild!.type.name).toBe("paragraph");
  expect(editor.state.pm.selection.content().content.textBetween(0,editor.state.pm.selection.content().content.size)).toBe("移动我");
  editor.commands.closeHistory();editor.commands.undo();expect(editor.state.doc.firstChild!.child(0).textContent).toBe("移动我");
});
it("changes only column widths without moving the text selection",()=>{
  const content={...createColumns([50,50]),content:["Left text","Right text"].map(text=>({type:"blockColumn",content:[{type:"paragraph",content:[{type:"text",text}]}]}))};
  const editor=session([content]);
  editor.commands.setTextSelection({from:4,to:8});
  const selected=editor.state.pm.selection.toJSON();
  expect(editor.commands.setBlockColumns(0,[40,60])).toBe(true);
  expect(editor.state.pm.selection.toJSON()).toEqual(selected);
  expect(editor.commands.setBlockColumns(-1,[50,50])).toBe(false);
  expect(editor.commands.setBlockColumns(NaN,[50,50])).toBe(false);
});
it("keeps gallery order, resources and names through JSON and static HTML",()=>{
  const editor=session([{type:"imageGallery",attrs:{items:[image("a"),image("b")],caption:"两幅图",columns:2}},card]);
  const html=editor.getHTML();expect(html).toContain("两幅图");expect(html).toContain("data-qk-resource");expect(html).not.toContain("<iframe");
  const json=editor.getJSON(),copy=session(json.content!);expect(copy.getJSON()).toEqual(json);
  const pasted=session();expect(pasted.commands.setContent(html,{errorOnInvalidContent:true})).toBe(true);
  expect(pasted.state.doc.firstChild!.attrs.items.map((item:{id:string})=>item.id)).toEqual(["a","b"]);
  expect(pasted.state.doc.child(1).attrs.url).toBe("https://example.com/guide");
});
it("rejects executable, transient and credential-bearing resource URLs",()=>{
  for(const url of ["javascript:alert(1)","data:text/html;base64,eA==","blob:https://example.com/id","https://user:password@example.com","https://example.com/a\nb"])expect(webURL(url)).toBeNull();
  expect(resourceURL("blob:https://example.com/id")).toBe(false);
  expect(resourceURL("data:image/png;base64,aA==","image/jpeg")).toBe(false);
  expect(webURL(" https://example.com ")).toBe("https://example.com/");
});
it("validates template capability and regenerates block identities",()=>{
  const editor=session();
  for(const template of blockContentTemplates)expect(templateError(editor.state.schema,template.content)).toBe("");
  expect(templateError(editor.state.schema,[{type:"missingPlugin"}])).not.toBe("");
  expect(freshTemplateContent([{type:"paragraph",attrs:{blockId:"old",align:"left"}}])[0]!.attrs).toEqual({align:"left"});
});
it("keeps copied template notes independent and refuses incomplete associations",()=>{
  const editor=session();
  const pair:QuireJSONContent[]=[{type:"paragraph",content:[{type:"footnoteReference",attrs:{noteId:"original"}}]},
    {type:"footnoteDefinition",attrs:{noteId:"original"},content:[{type:"paragraph",content:[{type:"text",text:"Note"}]}]}];
  expect(templateError(editor.state.schema,pair)).toBe("");
  expect(templateError(editor.state.schema,pair.slice(0,1))).toContain("完整脚注");
  const copy=freshTemplateContent(pair), id=copy[1]!.attrs!.noteId;
  expect(id).not.toBe("original");expect(copy[0]!.content![0]!.attrs!.noteId).toBe(id);
});
it("validates host storage and ignores a cancelled late completion",async()=>{
  const editor=session(),extension=editor.extensions.find(item=>item.name==="blockRichContent")!;
  const options=extension.options as {maxFileSize:number;storeFile?:unknown};
  const progress=vi.fn(),abort=new AbortController(),file=new File(["text"],"notes.txt",{type:"text/plain"});
  const assets=await storeBlockFiles(editor,[file],abort.signal,progress);
  expect(assets[0]).toMatchObject({name:"notes.txt",mime:"text/plain",src:"data:text/plain;base64,dGV4dA=="});
  options.storeFile=async()=>{abort.abort();return{id:"id",name:"notes.txt",mime:"text/plain",src:"https://example.com/notes.txt"};};
  await expect(storeBlockFiles(editor,[file],abort.signal,progress)).rejects.toMatchObject({name:"AbortError"});
});
it("allows a consumer to disable the full rich-content bundle",()=>{
  const instance=createBlockEditor({preset:{richContent:false}});sessions.push(instance);
  expect(blockInsertItems(instance.editor).map(item=>item.id)).not.toContain("columns");
  expect(instance.editor.schema.nodes.webCard).toBeUndefined();
});
