import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

/** @param page - Preview. @param label - Public insertion command. @returns Open media dialog. */
async function chooser(page: Page, label = "图片 / SVG…") {
  await page.getByRole("button", { name: "插入与结构", exact: true }).click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
  return page.getByRole("dialog", { name: label === "编辑图片…" ? "编辑图片" : "插入图片与图标", exact: true });
}
test.beforeEach(async ({ page }) => { await page.goto("/"); await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeVisible(); });

test("public upload picker, drop and rejection feedback keep the image draft reversible", async ({ page, browserName }, info) => {
  const initial = await page.evaluate(() => window.flowFixture.editor().getDocument()), dialog = await chooser(page);
  const source = await dialog.getByRole("radiogroup", { name: "图片来源", exact: true }).boundingBox(), bounds = await dialog.boundingBox();
  expect(source!.width).toBeLessThan(bounds!.width / 2);
  await page.screenshot({ path: info.outputPath("flow-upload-light.png"), animations: "disabled" });
  const file = { name: "chosen.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 80 40"><rect width="80" height="40" fill="#ff4400"/></svg>') };
  const first = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "选择文件", exact: true }).click(); await (await first).setFiles(file);
  await expect(dialog.getByRole("textbox", { name: "图片说明", exact: true })).toHaveValue(file.name);
  await expect(dialog.getByRole("button", { name: "插入图片", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: `移除 ${file.name}`, exact: true }).click();
  await expect(dialog.getByRole("button", { name: "插入图片", exact: true })).toBeDisabled();
  const again = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "选择文件", exact: true }).focus(); await page.keyboard.press("Enter"); await (await again).setFiles(file);
  await expect(dialog.getByRole("textbox", { name: "图片说明", exact: true })).toHaveValue(file.name);
  await dialog.getByRole("button", { name: "清空全部", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "插入图片", exact: true })).toBeDisabled();
  const dropped = { name: "dropped.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 20 10"><path d="M0 0H20V10H0Z"/></svg>') };
  if (browserName === "chromium") {
    // The browser creates real file entries; a synthetic DataTransfer has no file-system entries.
    const filePath = info.outputPath(dropped.name); await writeFile(filePath, dropped.buffer);
    const dropzone = dialog.getByRole("button", { name: "拖放图片到这里，或点击选择", exact: true }); await dropzone.scrollIntoViewIfNeeded();
    const bounds = await dropzone.boundingBox(), cdp = await page.context().newCDPSession(page);
    const position = { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 }, data = { items: [], files: [filePath], dragOperationsMask: 1 };
    try { for (const type of ["dragEnter", "dragOver", "drop"] as const) await cdp.send("Input.dispatchDragEvent", { type, ...position, data }); }
    finally { await cdp.detach(); }
  } else {
    const chooser = page.waitForEvent("filechooser"); await dialog.getByRole("button", { name: "选择文件", exact: true }).click(); await (await chooser).setFiles(dropped);
  }
  await expect(dialog.getByRole("textbox", { name: "图片说明", exact: true })).toHaveValue("dropped.svg");
  await expect(dialog.getByRole("button", { name: "插入图片", exact: true })).toBeEnabled();
  const invalid = page.waitForEvent("filechooser"); await dialog.getByRole("button", { name: "选择文件", exact: true }).click();
  await (await invalid).setFiles({ name: "unsupported.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") });
  await expect(dialog.getByText("不支持此文件类型", { exact: true })).toBeVisible();
  const oversized = page.waitForEvent("filechooser"); await dialog.getByRole("button", { name: "选择文件", exact: true }).click();
  await (await oversized).setFiles({ name: "oversized.png", mimeType: "image/png", buffer: Buffer.alloc(8e6 + 1) });
  await expect(dialog.getByText("文件超过大小上限", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "图片说明", exact: true })).toHaveValue("dropped.svg");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(initial);
});

test("uploaded SVG remains vector through image replacement, connections, transform, undo, copy and saved reopen", async ({ page }) => {
  const dialog = await chooser(page);
  await dialog.getByLabel("选择图片文件", { exact: true }).setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 80 40"><rect width="80" height="40" fill="#ff4400"/></svg>') });
  await dialog.getByRole("textbox", { name: "图片说明", exact: true }).fill("我的 Logo");
  await dialog.getByRole("button", { name: "插入图片", exact: true }).click();
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), node = before.nodes.at(-1)!;
  expect(node.image?.alt).toBe("我的 Logo"); expect(node.width / node.height).toBe(2);
  await expect(page.locator(`[data-cell-id="${node.id}"] image`)).toHaveAttribute("href", node.image!.dataUrl);
  await page.locator(`.x6-widget-selection-box[data-cell-id="${node.id}"]`).dblclick();
  await expect(page.getByRole("dialog", {name:"编辑图片",exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(id => {
    const editor = window.flowFixture.editor(); editor.select([id]); editor.execute("rotate-right");
    return editor.getDocument().then(source => editor.replaceDocument({ ...source, edges: [...source.edges, { id: "image-edge", source: { node: id, port: "right" }, target: { node: "publish-n1", port: "left" }, vertices: [], label: "Logo", labelPosition: .5, routing: "straight", style: {} }] }));
  }, node.id);
  await page.evaluate(id => window.flowFixture.editor().select([id]), node.id);
  const edit = await chooser(page, "编辑图片…");
  await edit.getByRole("textbox", { name: "图片说明", exact: true }).fill("更新说明"); await edit.getByRole("button", { name: "应用图片", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.at(-1)!.image!.alt).toBe("更新说明");
  await page.evaluate(() => window.flowFixture.editor().execute("undo"));
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.at(-1)!.image!.alt).toBe("我的 Logo");
  const output = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), svg = await editor.exportSvg(), png = await editor.exportPng();
    const image = new Image(); image.src = png; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext("2d")!; ctx.drawImage(image,0,0);
    const data = ctx.getImageData(0,0,image.width,image.height).data; let orange=0; for(let i=0;i<data.length;i+=4) if(data[i]!>240 && data[i+1]!>40 && data[i+1]!<110 && data[i+2]!<20 && data[i+3]!>0) orange++;
    return { svg: svg.svg, source: svg.source, orange };
  });
  expect(output.svg).toContain("data:image/svg+xml"); expect(output.svg).not.toContain("x6-port"); expect(output.orange).toBeGreaterThan(100);
  const copied = await page.evaluate(() => { const editor=window.flowFixture.editor(); editor.insertDocument(editor.getSelection(), {x:20,y:30}); return editor.getDocument(); });
  expect(copied.nodes.at(-1)!.image).toEqual(node.image);
  await page.getByRole("button", { name: "保存到本机", exact:true }).click(); await page.reload(); await expect(page.getByRole("application")).toBeVisible();
  const saved = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(saved.nodes).toEqual(copied.nodes); expect(saved.edges).toEqual(copied.edges);
});

test("uploading PNG and canceling malicious SVG leaves the graph unchanged", async ({ page }) => {
  const initial = await page.evaluate(() => window.flowFixture.editor().getDocument()), dialog = await chooser(page);
  await dialog.getByLabel("选择图片文件", {exact:true}).setInputFiles({ name:"pixel.png", mimeType:"image/png", buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=","base64") });
  await expect(dialog.getByRole("button", { name:"插入图片",exact:true })).toBeEnabled();
  await dialog.getByRole("button", {name:"取消",exact:true}).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(initial);
  const next=await chooser(page);
  await next.getByLabel("选择图片文件", {exact:true}).setInputFiles({name:"unsafe.svg",mimeType:"image/svg+xml",buffer:Buffer.from('<svg viewBox="0 0 24 24"><image href="https://example.com/p.png"/><script>alert(1)</script></svg>')});
  await expect(next.getByText("SVG 含不支持的内容，请使用静态路径图标或转为 PNG", {exact:true})).toBeVisible();
  await expect(next.getByRole("button", {name:"插入图片",exact:true})).toBeDisabled();
  await page.keyboard.press("Escape"); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(initial);
});

test("bilingual icons, dark and narrow chooser, stale draft guards and read-only permissions", async ({page},info) => {
  const dialog=await chooser(page,"常用图标…"); await dialog.getByRole("button", {name:"服务器",exact:true}).click();
  await page.screenshot({path:info.outputPath("flow-icons-light.png")});
  await page.evaluate(() => window.flowFixture.editor().addNode("rectangle"));
  await dialog.getByRole("button", {name:"插入图片",exact:true}).click(); await expect(dialog.getByText("编辑目标已改变，请重新打开",{exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", {name:"切换明暗主题",exact:true}).click(); await page.evaluate(() => window.flowFixture.setLocale("en")); await page.setViewportSize({width:740,height:780});
  await page.getByRole("button", {name:"Insert and structure",exact:true}).click(); await page.getByRole("menuitem", {name:"Diagram icons…",exact:true}).click();
  const en=page.getByRole("dialog", {name:"Insert images and icons",exact:true}); await en.getByRole("button", {name:"Cloud",exact:true}).click();
  expect(await en.innerText()).not.toMatch(/\p{Script=Han}/u); await page.screenshot({path:info.outputPath("flow-icons-dark-narrow.png"), animations:"disabled"});
  await en.getByText("Upload image", {exact:true}).click();
  await expect(en.getByRole("button", {name:"Drop an image here, or click to choose",exact:true})).toBeVisible();
  expect(await en.innerText()).not.toMatch(/\p{Script=Han}/u);
  const segment = await en.getByRole("radiogroup", {name:"Image source",exact:true}).boundingBox(), bounds = await en.boundingBox();
  expect(segment!.width).toBeLessThan(bounds!.width / 2);
  expect(await en.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({path:info.outputPath("flow-upload-dark-narrow.png"), animations:"disabled"});
  await en.getByRole("button", {name:"Insert image",exact:true}).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.at(-1)!.image!.alt).toBe("Cloud");
  await page.getByRole("button", {name:"Make read only",exact:true}).click();
  await expect(page.getByRole("button", {name:"Insert and structure",exact:true})).toBeDisabled();
});
