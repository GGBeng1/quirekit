import { expect, test } from "@playwright/test";
import "./types";

test("automatic layout menu arranges branches and has one-step undo", async ({page},info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(()=>{
    const e=window.flowFixture.editor(); e.replaceDocument({format:"quirekit-flowchart",version:1,revision:0,
      nodes:["a","b","c","d"].map((id,i)=>({id,shape:"process",x:80+i*200,y:500-i*110,width:120,height:60,text:["提交申请","业务审批","财务审批","归档"][i]!,style:{}})),
      edges:[["a","b"],["a","c"],["b","d"],["c","d"]].map(([a,b],i)=>({id:`e${i}`,source:{node:a!},target:{node:b!},vertices:[],routing:"orthogonal",label:"",labelPosition:0.5,style:{}}))}); e.fit();
  });
  const before=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  await page.getByRole("button",{name:"排列图形",exact:true}).click();
  await page.getByRole("menuitem",{name:"自动布局",exact:true}).hover();
  await page.getByRole("menuitem",{name:"从上到下",exact:true}).click();
  const after=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  expect(after.nodes[1]!.y).toBe(after.nodes[2]!.y); expect(after.nodes[0]!.y+60).toBeLessThan(after.nodes[1]!.y);
  await page.getByRole("button",{name:"适应画布",exact:true}).click();
  const boxes=await page.locator('.x6-node').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
  expect(Math.abs(boxes[1]!.y-boxes[2]!.y)).toBeLessThan(1);
  await page.screenshot({path:info.outputPath("layout-down.png")});
  await page.getByRole("button",{name:"撤销",exact:true}).click(); expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button",{name:"重做",exact:true}).click(); expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(after);
  await page.getByRole("button",{name:"保存到本机"}).click(); await page.reload(); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(()=>window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});

test("automatic layout respects instance read-only permissions",async({page})=>{
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(()=>{const e=window.flowFixture.editor();e.select([]);e.setReadOnly(true);});
  expect(await page.evaluate(()=>{try{window.flowFixture.editor().execute("layout-right");return "changed";}catch{return "readonly";}})).toBe("readonly");
});
