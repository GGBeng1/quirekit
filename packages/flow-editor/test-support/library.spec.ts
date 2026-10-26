import { openFlowLibrary } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Isolated preview context. @returns Ready authoring canvas. */
async function ready(page:Page):Promise<void>{await page.goto("/");await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();}
/** @param page - Current canvas. Opens its existing shared library. */
async function open(page:Page):Promise<void>{await openFlowLibrary(page);await expect(page.getByRole("dialog",{name:"我的图形库",exact:true})).toBeVisible();}
/** @param page - Current dialog. @param name - Literal record name. Saves a captured graph or selection. */
async function save(page:Page,name:string):Promise<void>{await page.getByRole("textbox",{name:"图形名称",exact:true}).fill(name);await page.getByRole("button",{name:"保存到图形库",exact:true}).click();await expect(page.getByRole("button",{name,exact:true})).toBeVisible();}

test("library captures components and templates, previews, persists, inserts fresh IDs and supports undo",async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem("quirekit-flow-editor-preview-v1",JSON.stringify({format:"quirekit-flowchart",version:1,revision:6,nodes:[],edges:[]})));
  await ready(page);await page.evaluate(()=>{const e=window.flowFixture.editor();e.replaceDocument({format:"quirekit-flowchart",version:1,revision:6,nodes:[{id:"a",shape:"note",x:120,y:180,width:180,height:110,text:"Reusable",rotation:15,flipX:true,style:{drawing:"pencil"}},{id:"b",shape:"process",x:410,y:180,width:160,height:90,text:"Result",style:{}}],edges:[{id:"ab",source:{node:"a",port:"right"},target:{node:"b",port:"left"},routing:"orthogonal",vertices:[],label:"",labelPosition:0.5,style:{}}]});e.select(["a","b"]);});
  const original=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "保存到图形库", exact: true }).hover();await page.getByRole("menuitem",{name:"选区存为组件",exact:true}).click();await save(page,"手绘组件");
  await expect(page.getByAltText("所选图形预览")).toBeVisible();await expect(page.getByRole("dialog",{name:"我的图形库",exact:true})).toHaveCSS("opacity","1");await page.screenshot({path:info.outputPath("library-component.png"),animations:"disabled"});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("quirekit-flow-library-v1")!));expect(saved.library.items[0].document.nodes[0]).toMatchObject({rotation:15,flipX:true});expect(saved.library.items[0].document.edges).toHaveLength(1);expect(saved.library.items[0].document.revision).toBe(0);
  await page.getByRole("button",{name:"插入组件",exact:true}).click();await expect(page.getByRole("dialog",{name:"我的图形库",exact:true})).toBeHidden();
  const inserted=await page.evaluate(()=>window.flowFixture.editor().getDocument());expect(inserted.nodes).toHaveLength(4);expect(new Set(inserted.nodes.map(n=>n.id)).size).toBe(4);expect(inserted.edges).toHaveLength(2);
  await page.getByRole("button",{name:"撤销",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(original);
  await open(page);await page.getByRole("button",{name:"保存整图为模板",exact:true}).click();await save(page,"我的模板一");await page.getByRole("button",{name:"关闭",exact:true}).last().click();
  await page.reload();await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();const baseline=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  await open(page);await page.getByRole("button",{name:"我的模板一",exact:true}).click();await page.getByRole("button",{name:"使用模板",exact:true}).click();
  const applied=await page.evaluate(()=>window.flowFixture.editor().getDocument());expect(applied.nodes.map(n=>n.text)).toEqual(["Reusable","Result"]);expect(applied.nodes[0]!.id).not.toBe("a");expect(applied.revision).toBe(baseline.revision);
  await page.getByRole("button",{name:"撤销",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(baseline);
});

test("library synchronizes tabs, renames, filters, imports atomically and migrates via JSON",async({page,context},info)=>{
  await ready(page);await open(page);await page.getByRole("button",{name:"保存整图为模板",exact:true}).click();await save(page,"发布模板");
  const other=await context.newPage();await ready(other);await open(other);await expect(other.getByRole("button",{name:"发布模板",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"重命名",exact:true}).click();await save(page,"项目发布");await expect(other.getByRole("button",{name:"项目发布",exact:true})).toBeVisible();
  await other.getByRole("textbox",{name:"搜索我的图形"}).fill("不会找到");await expect(other.getByText("没有匹配的图形")).toBeVisible();await other.getByRole("textbox",{name:"搜索我的图形"}).fill("");
  const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"导出库文件",exact:true}).click();const download=await downloadPromise;await download.saveAs(info.outputPath("library.json"));
  const before=await page.evaluate(()=>localStorage.getItem("quirekit-flow-library-v1"));
  await page.locator('input[type="file"]').setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from('{"format":"bad"}')});await expect(page.getByRole("alert")).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem("quirekit-flow-library-v1"))).toBe(before);
  await page.locator('input[type="file"]').setInputFiles(info.outputPath("library.json"));await expect(page.getByRole("button",{name:"项目发布",exact:true})).toHaveCount(2);
  expect(await page.evaluate(()=>{const items=JSON.parse(localStorage.getItem("quirekit-flow-library-v1")!).library.items;return new Set(items.map((i:{id:string})=>i.id)).size;})).toBe(2);
  await page.getByRole("button",{name:"删除",exact:true}).click();await page.getByRole("button",{name:"确认删除",exact:true}).click();await expect(other.getByRole("button",{name:"项目发布",exact:true})).toHaveCount(1);
  await other.getByRole("button",{name:"关闭",exact:true}).last().click();await other.getByRole("button",{name:"切换明暗主题"}).click();await other.setViewportSize({width:560,height:900});await open(other);await expect(other.getByAltText("所选图形预览")).toBeVisible();
  expect(await other.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(560);await expect(other.getByRole("dialog",{name:"我的图形库",exact:true})).toHaveCSS("opacity","1");await other.screenshot({path:info.outputPath("library-dark-narrow.png"),animations:"disabled"});
});

test("read-only browsing and stale source guards prevent unintended graph writes",async({page})=>{
  await ready(page);await open(page);await page.getByRole("button",{name:"保存整图为模板",exact:true}).click();await save(page,"不会覆盖新草稿");
  await page.evaluate(()=>window.flowFixture.editor().addNode("cloud"));const changed=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  await page.getByRole("button",{name:"使用模板",exact:true}).click();await expect(page.getByRole("alert")).toContainText("画布已改变");expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(changed);
  await page.getByRole("button",{name:"关闭",exact:true}).last().click();await page.getByRole("button",{name:"切换只读"}).click();await open(page);await expect(page.getByRole("button",{name:"使用模板",exact:true})).toBeDisabled();
});

test("closing a pending storage write cancels before commit and keeps the original library",async({page})=>{
  await ready(page);await open(page);await page.getByRole("button",{name:"保存整图为模板",exact:true}).click();await page.getByRole("textbox",{name:"图形名称",exact:true}).fill("已取消的保存");
  await page.evaluate(()=>{void navigator.locks.request("quirekit-flow-library-v1",async()=>{await new Promise<void>(resolve=>{Object.assign(window,{releaseLibraryLock:resolve});});});});
  await page.waitForFunction(()=>"releaseLibraryLock" in window);await page.getByRole("button",{name:"保存到图形库",exact:true}).click();await expect(page.getByRole("button",{name:"保存到图形库",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"关闭",exact:true}).last().click();
  await page.evaluate(async()=>{(window as unknown as {releaseLibraryLock:()=>void}).releaseLibraryLock();await navigator.locks.request("quirekit-flow-library-v1",()=>{});});
  expect(await page.evaluate(()=>localStorage.getItem("quirekit-flow-library-v1"))).toBeNull();
});
