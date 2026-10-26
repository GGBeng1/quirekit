import {expect,test,type Page} from "@playwright/test";
import "./types";
/** @param page - Test-owned canvas. */
async function setup(page:Page):Promise<void>{
  await page.goto("/");await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(()=>{const e=window.flowFixture.editor();e.replaceDocument({format:"quirekit-flowchart",version:1,revision:0,nodes:[{id:"a",shape:"note",x:200,y:250,width:160,height:100,text:"文档标题",style:{fill:"#fff8e7"}}],edges:[
    {id:"anchor",source:{node:"a",anchor:{x:1,y:0.5}},target:{x:620,y:300},vertices:[],routing:"straight",label:"相对锚点",labelPosition:0.5,style:{}},
    {id:"port",source:{node:"a",port:"right"},target:{x:620,y:500},vertices:[],routing:"straight",label:"固定端口",labelPosition:0.5,style:{}}
  ]});e.select(["a"]);e.fit();});
}
/** @param page - Current instance. @param label - Transform intent. */
async function transform(page:Page,label:string):Promise<void>{await page.getByRole("button",{name:"排列图形",exact:true}).click();await page.getByRole("menuitem",{name:"旋转与翻转",exact:true}).hover();await page.getByRole("menuitem",{name:label,exact:true}).click();}
test("rotation and mirror preserve readable text, ports, relative anchors, undo and exported source",async({page},info)=>{
  await setup(page);const before=await page.evaluate(()=>window.flowFixture.editor().getDocument());
  await transform(page,"向右旋转 90°");await transform(page,"水平翻转");
  const after=await page.evaluate(()=>window.flowFixture.editor().getDocument());expect(after.nodes[0]).toMatchObject({rotation:90,flipX:true});
  const alignment=await page.evaluate(()=>{
    const port=document.querySelector<SVGGraphicsElement>('.x6-node [port="right"]')!.getBoundingClientRect();
    const paths=["anchor","port"].map(id=>document.querySelectorAll<SVGPathElement>(`.x6-edge[data-cell-id="${id}"] path`)[1]!);
    const points=paths.map(p=>{const start=p.getPointAtLength(0),m=p.getScreenCTM()!;return {x:start.x*m.a+start.y*m.c+m.e,y:start.x*m.b+start.y*m.d+m.f};});
    const label=document.querySelector<SVGGraphicsElement>('.x6-node text')!.getScreenCTM()!,body=document.querySelector<SVGGraphicsElement>('.x6-node path')!.getScreenCTM()!;
    return {port:{x:port.x+port.width/2,y:port.y+port.height/2},points,labelDet:label.a*label.d-label.b*label.c,bodyDet:body.a*body.d-body.b*body.c};
  });
  expect(alignment.points[0]!.x).toBeCloseTo(alignment.port.x,0);expect(alignment.points[0]!.y).toBeCloseTo(alignment.port.y,0);
  // X6 attaches fixed-port lines to the four-pixel magnet circle boundary.
  expect(Math.hypot(alignment.points[1]!.x-alignment.port.x,alignment.points[1]!.y-alignment.port.y)).toBeLessThan(5);
  expect(alignment.labelDet).toBeGreaterThan(0);expect(alignment.bodyDet).toBeLessThan(0);
  await page.screenshot({path:info.outputPath("rotated-mirror.png")});
  await page.getByRole("button",{name:"撤销",exact:true}).click();expect((await page.evaluate(()=>window.flowFixture.editor().getDocument())).nodes[0]).not.toHaveProperty("flipX");
  await page.getByRole("button",{name:"重做",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(after);
  await page.evaluate(()=>{const e=window.flowFixture.editor();e.execute("edit-text");});
  const input=page.getByRole("textbox",{name:"图形文字"});await expect(input).toBeFocused();expect(await input.evaluate(n=>n.style.transform)).toBe("rotate(90deg)");
  await input.fill("旋转文字");await input.press("ControlOrMeta+Enter");
  for(const drawing of ["standard","sketch","pencil"] as const){const exported=await page.evaluate(async drawing=>{const e=window.flowFixture.editor();e.setDrawingStyle(drawing);const svg=await e.exportSvg(),png=await e.exportPng(),image=new Image();image.src=png;await image.decode();return {source:JSON.parse(svg.source),svg:svg.svg,width:image.width};},drawing);expect(exported.source.nodes[0]).toMatchObject({rotation:90,flipX:true,text:"旋转文字"});expect(exported.svg).not.toMatch(/NaN|Infinity/);expect(exported.width).toBeGreaterThan(100);}
  await page.getByRole("button",{name:"保存到本机"}).click();await page.reload();await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();expect((await page.evaluate(()=>window.flowFixture.editor().getDocument())).nodes[0]).toMatchObject({rotation:90,flipX:true,text:"旋转文字"});
  expect(before.nodes[0]).not.toHaveProperty("rotation");
});

test("native rotation handle tracks movement, preserves theme changes and creates one undo step",async({page})=>{
  await setup(page);await page.evaluate(()=>window.flowFixture.editor().select([]));const node=page.locator('.x6-node[data-cell-id="a"]');await node.locator('path').first().click();
  const grip=page.locator('.x6-widget-transform-rotate');await expect(grip).toBeVisible();const handle=(await grip.boundingBox())!,box=(await node.boundingBox())!;
  const before=await page.evaluate(()=>window.flowFixture.editor().getDocument());const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
  const matrices:string[]=[];
  for(const angle of [-60,-45,-25]){const radians=angle*Math.PI/180;await page.mouse.move(cx+Math.cos(radians)*100,cy+Math.sin(radians)*100);matrices.push(await node.evaluate(n=>{const m=(n.querySelector("text") as SVGGraphicsElement).getScreenCTM()!;return `${m.a},${m.b}`;}));}
  await page.mouse.up();expect(new Set(matrices).size).toBeGreaterThan(1);
  const rotated=await page.evaluate(()=>window.flowFixture.editor().getDocument());expect(rotated.nodes[0]!.rotation).toBeGreaterThan(0);
  await page.getByRole("button",{name:"切换明暗主题"}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(rotated);
  await page.getByRole("button",{name:"撤销",exact:true}).click();expect(await page.evaluate(()=>window.flowFixture.editor().getDocument())).toEqual(before);
});
