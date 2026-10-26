import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Test-owned browser surface. */
async function ready(page:Page):Promise<void>{await page.goto("/");await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();}

test("native clipboard copies a nested component across diagrams, cuts atomically and preserves text editing",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"]);await ready(page);
  await page.evaluate(()=>{const e=window.flowFixture.editor();e.replaceDocument({format:"quirekit-flowchart",version:1,revision:0,nodes:[
    {id:"g",shape:"container",x:0,y:0,width:500,height:260,text:"服务模块",style:{}},
    {id:"a",parent:"g",shape:"process",x:30,y:80,width:140,height:60,text:"服务A",style:{fill:"#eef2ff"}},
    {id:"b",parent:"g",shape:"process",x:300,y:80,width:140,height:60,text:"服务B",style:{}}],edges:[{id:"e",source:{node:"a",port:"right"},target:{node:"b",port:"left"},vertices:[{x:240,y:180}],routing:"orthogonal",label:"调用",labelPosition:0.5,style:{}}]});e.select(["g"]);e.focus();});
  const original=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toContain("quirekit-flowchart-selection:v1");
  const target=await context.newPage();await ready(target);
  await target.evaluate(()=>{const e=window.flowFixture.editor();e.replaceDocument({format:"quirekit-flowchart",version:1,revision:0,nodes:[],edges:[]});e.focus();});
  await target.keyboard.press("ControlOrMeta+v");
  await expect.poll(()=>target.evaluate(async()=>(await window.flowFixture.editor().getDocument()).nodes.length)).toBe(3);
  const pasted=await target.evaluate(()=>window.flowFixture.editor().getDocument());
  expect(pasted.nodes[0]!.id).not.toBe("g");expect(pasted.nodes[1]!.parent).toBe(pasted.nodes[0]!.id);expect(pasted.edges[0]!.source).toEqual({node:pasted.nodes[1]!.id,port:"right"});
  expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(original);
  await target.keyboard.press("ControlOrMeta+x");await expect.poll(()=>target.evaluate(async()=>(await window.flowFixture.editor().getDocument()).nodes.length)).toBe(0);
  await target.keyboard.press("ControlOrMeta+z");expect(await target.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(pasted);
  // Undo may clear selection; explicitly target the known copied child.
  await target.evaluate(id=>{const e=window.flowFixture.editor();e.select([id]);e.focus();},pasted.nodes[1]!.id);
  await target.keyboard.press("F2");const input=target.getByRole("textbox",{name:"图形文字"});await expect(input).toBeFocused();await input.press("ControlOrMeta+a");await input.press("ControlOrMeta+c");
  await expect.poll(()=>target.evaluate(()=>navigator.clipboard.readText())).toBe("服务A");
  await target.evaluate(()=>navigator.clipboard.writeText("普通文字"));await input.press("ControlOrMeta+v");await expect(input).toHaveValue("普通文字");
  await input.press("ControlOrMeta+Enter");expect((await target.evaluate(()=>window.flowFixture.editor().getDocument())).nodes).toHaveLength(3);await target.close();
});

test("clipboard menu uses system text and async guards reject stale or denied mutation",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"]);await ready(page);
  await page.evaluate(()=>{const e=window.flowFixture.editor();e.execute("select-all");});
  await page.getByRole("application",{name:"流程图编辑区",exact:true}).press("Shift+F10");await page.getByRole("menuitem",{name:/^复制选区/}).click();
  const encoded=await page.evaluate(()=>navigator.clipboard.readText());expect(encoded).toContain("quirekit-flowchart-selection:v1");
  const result=await page.evaluate(async encoded=>{
    const e=window.flowFixture.editor(),before=await e.getDocument();
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw new Error("denied");}}});
    const denied=await e.copyToClipboard(true).then(()=>"changed",()=>"denied");const unchanged=JSON.stringify(before)===JSON.stringify(await e.getDocument());
    let resolve!:(s:string)=>void;Object.defineProperty(navigator,"clipboard",{configurable:true,value:{readText:()=>new Promise<string>(r=>{resolve=r;})}});
    const pending=e.pasteFromClipboard().then(()=>"changed",err=>String(err));e.addNode("circle");resolve(encoded);const stale=await pending;
    return {denied,unchanged,stale,count:(await e.getDocument()).nodes.length-before.nodes.length};
  },encoded);
  expect(result).toMatchObject({denied:"denied",unchanged:true,count:1});expect(result.stale).toContain("已变化");
});
