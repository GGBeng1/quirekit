import { openFlowTemplates } from "./toolbar";
import {expect,test,type Page} from "@playwright/test";
import type {FlowchartDocument,FlowchartTerminal} from "@quirekit/flowchart";
import "./types";
/** @param page - Current test page. @param label - Message operation. */
async function edit(page:Page,label:string):Promise<void>{await page.getByRole("button",{name:"插入与结构",exact:true}).click();await page.getByRole("menuitem",{name:"时序图",exact:true}).hover();await page.getByRole("menuitem",{name:"编辑时序消息",exact:true}).hover();await page.getByRole("menuitem",{name:label,exact:true}).click();}
/** @param source - Canonical graph. @param end - Message endpoint. @returns World Y coordinate. */
function y(source:FlowchartDocument,end:FlowchartTerminal):number{if(!("node"in end))return end.y;const n=source.nodes.find(n=>n.id===end.node)!;return n.y+n.height*end.anchor!.y;}
test("sequence menus insert, reorder and remove an interior message with exact undo and persistence",async({page},info)=>{
  await page.goto("/");await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await openFlowTemplates(page);await page.getByRole("button",{name:"用户登录时序图",exact:true}).click();await page.getByRole("button",{name:"使用模板",exact:true}).click();
  const source=await page.evaluate(()=>window.flowFixture.editor().getDocument()),middle=source.edges[2]!;
  await page.evaluate(id=>window.flowFixture.editor().select([id]),middle.id);await edit(page,"在前面插入请求");
  const inserted=await page.evaluate(()=>window.flowFixture.editor().getDocument()),request=inserted.edges.find(e=>!source.edges.some(old=>old.id===e.id))!;
  expect(inserted.edges).toHaveLength(source.edges.length+1);expect(y(inserted,request.source)).toBeCloseTo(y(source,middle.source));expect(y(inserted,inserted.edges[2]!.source)).toBeGreaterThan(y(source,middle.source));
  await page.getByRole("button",{name:"撤销",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(source);
  await page.getByRole("button",{name:"重做",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(inserted);
  await page.evaluate(id=>window.flowFixture.editor().select([id]),request.id);await edit(page,"消息行下移");
  const moved=await page.evaluate(()=>window.flowFixture.editor().getDocument());expect(y(moved,moved.edges.find(e=>e.id===request.id)!.source)).toBeGreaterThan(y(moved,moved.edges.find(e=>e.id===middle.id)!.source));
  const path=page.locator(`.x6-edge[data-cell-id="${request.id}"] path`).nth(1);
  const rendered=await path.evaluate(p=>({length:(p as SVGPathElement).getTotalLength(),stroke:p.getAttribute("stroke"),d:p.getAttribute("d")}));expect(rendered.length).toBeGreaterThan(100);expect(rendered.stroke).not.toBe("transparent");expect(rendered.d).not.toMatch(/NaN|Infinity/);
  await page.getByRole("button",{name:"适应画布",exact:true}).click();await page.screenshot({path:info.outputPath("sequence-message-edited.png")});
  await edit(page,"删除消息并收拢");const removed=await page.evaluate(()=>window.flowFixture.editor().getDocument());expect(removed.edges).toHaveLength(source.edges.length);
  await page.getByRole("button",{name:"撤销",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(moved);
  await page.getByRole("button",{name:"保存到本机"}).click();await page.reload();await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(()=>window.flowFixture.editor().getDocument())).edges).toEqual(moved.edges);
});
