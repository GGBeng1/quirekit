import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { flowchartSvgImage } from "@quirekit/flowchart";
import type {} from "./types";

const sourceSvg = '<svg viewBox="0 0 300 180"><rect width="100" height="180" fill="#ef4444"/><rect x="100" width="100" height="180" fill="#10b981"/><rect x="200" width="100" height="180" fill="#3b82f6"/></svg>';
/** @param page - Ready fixture. @returns Public image editing dialog. */
async function editImage(page: Page) {
  await page.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "编辑图片…", exact: true }).click();
  return page.getByRole("dialog", { name: "编辑图片", exact: true });
}
test.beforeEach(async ({ page }) => { await page.goto("/"); await expect(page.getByRole("application")).toBeVisible(); });

test("non-destructive asymmetric crop clips both fit modes in canvas, SVG, PNG and vector PDF", async ({ page }, info) => {
  await page.evaluate(image => {
    const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [{ id: "crop", shape: "image", x: -40, y: -20, width: 200, height: 200, text: "", style: {}, image: { ...image, crop: { top: .1, right: 1 / 3, bottom: .1, left: 1 / 3 }, fit: "contain", lockAspectRatio: true } }], edges: [] }); e.select(["crop"]); e.fit();
  }, flowchartSvgImage(sourceSvg));
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const snapshot = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(snapshot.width).toBeCloseTo(232); expect(snapshot.height).toBeCloseTo(232);
  await writeFile(info.outputPath("crop-contain.svg"), snapshot.svg);
  const pixels = await page.evaluate(async () => {
    const dataUrl = await window.flowFixture.editor().exportPng({ scale: 1 }), image = new Image(); image.src = dataUrl; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height).data; let red = 0, blue = 0, green = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 240) {
      if (data[i]! > 220 && data[i + 1]! < 100) red++; if (data[i + 2]! > 220 && data[i]! < 100) blue++; if (data[i + 1]! > 160 && data[i]! < 40) green++;
    }
    return { dataUrl, red, blue, green };
  });
  expect(pixels.red).toBe(0); expect(pixels.blue).toBe(0); expect(pixels.green).toBeGreaterThan(1000);
  await writeFile(info.outputPath("crop-contain.png"), Buffer.from(pixels.dataUrl.split(",")[1]!, "base64"));
  const dialog = await editImage(page); await dialog.getByText("填满图框", { exact: true }).click(); await dialog.getByRole("button", { name: "应用图片", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.image!.fit).toBe("cover");
  const png = await page.evaluate(() => window.flowFixture.editor().exportPng({ scale: 1 })); await writeFile(info.outputPath("crop-cover.png"), Buffer.from(png.split(",")[1]!, "base64"));
  await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "页面与打印…", exact: true }).click();
  const printing = page.getByRole("dialog", { name: "页面与打印", exact: true }); const downloading = page.waitForEvent("download"); await printing.getByRole("button", { name: "下载 PDF", exact: true }).click(); await (await downloading).saveAs(info.outputPath("crop-cover.pdf"));
  await printing.getByRole("contentinfo").getByRole("button", { name: "关闭", exact: true }).click(); await page.evaluate(() => window.flowFixture.editor().execute("undo"));
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});

test("the public cropper accepts ratio, pointer and keyboard edits with cancel, undo, replacement and reopening", async ({ page }, info) => {
  await page.evaluate(() => window.flowFixture.editor().replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [], edges: [] }));
  await page.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "图片 / SVG…", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "插入图片与图标", exact: true });
  await dialog.getByLabel("选择图片文件", { exact: true }).setInputFiles({ name: "colors.svg", mimeType: "image/svg+xml", buffer: Buffer.from(sourceSvg) });
  await dialog.getByRole("button", { name: "裁剪图片…", exact: true }).click(); await expect(dialog.getByRole("button", { name: "完成裁剪", exact: true })).toBeEnabled();
  await dialog.getByRole("combobox", { name: "裁剪比例", exact: true }).click(); await page.getByRole("option", { name: "1:1", exact: true }).click();
  const handle = dialog.locator('.qk-image-cropper [data-part="handle"]').nth(5), bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down(); await page.mouse.move(bounds.x - 24, bounds.y - 18, { steps: 4 }); await page.mouse.up();
  const selection = dialog.locator('.qk-image-cropper [data-part="selection"]'); await selection.focus(); await selection.press("Alt+Shift+ArrowLeft"); await selection.press("Shift+ArrowRight");
  await page.screenshot({ path: info.outputPath("public-cropper.png"), animations: "disabled" }); await dialog.getByRole("button", { name: "插入图片", exact: true }).click();
  const original = await page.evaluate(() => window.flowFixture.editor().getDocument()), node = original.nodes[0]!;
  expect(node.image!.crop!.left).toBeGreaterThan(0); expect(node.image!.crop!.right).toBeGreaterThan(0); expect(node.image!.lockAspectRatio).toBe(true);
  expect(300 * (1 - node.image!.crop!.left - node.image!.crop!.right) / (180 * (1 - node.image!.crop!.top - node.image!.crop!.bottom))).toBeCloseTo(1, 3);
  dialog = await editImage(page); await dialog.getByRole("button", { name: "裁剪图片…", exact: true }).click(); await expect(dialog.getByRole("button", { name: "完成裁剪", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "重置", exact: true }).click(); await dialog.getByRole("button", { name: "取消", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(original);
  dialog = await editImage(page); await dialog.getByLabel("选择图片文件", { exact: true }).setInputFiles({ name: "replacement.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 80 40"><rect width="80" height="40" fill="#ff4400"/></svg>') });
  await dialog.getByRole("button", { name: "应用图片", exact: true }).click(); const replaced = (await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!;
  expect(replaced.image!.crop).toBeUndefined(); expect(replaced.width).toBe(node.width); expect(replaced.height).toBe(node.height); expect(replaced.image!.lockAspectRatio).toBe(true);
  await page.evaluate(() => window.flowFixture.editor().execute("undo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(original);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click(); await page.reload(); await expect(page.getByRole("application")).toBeVisible(); expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.image).toEqual(node.image);
});

test("locked image resizing tracks every step, transforms and dark English narrow crop controls stay source-neutral", async ({ page }, info) => {
  await page.evaluate(image => { const editor = window.flowFixture.editor(); editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [{ id: "resize", shape: "image", x: 100, y: 150, width: 240, height: 144, text: "", style: {}, image: { ...image, lockAspectRatio: true } }], edges: [] }); editor.fit(); }, flowchartSvgImage(sourceSvg, "Crop sample"));
  const node = page.locator('.x6-node[data-cell-id="resize"]'); await node.locator("path").first().click();
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), grip = page.locator('.x6-widget-transform-resize[data-position="bottom-right"]'), box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  const widths = [];
  for (let step = 1; step <= 4; step++) {
    await page.mouse.move(box.x + box.width / 2 + step * 40, box.y + box.height / 2 + step * 24);
    await expect.poll(() => page.locator(".x6-widget-transform").evaluate(element => parseFloat((element as HTMLElement).style.width))).toBeGreaterThan(widths.at(-1) ?? before.nodes[0]!.width);
    const size = await page.locator(".x6-widget-transform").evaluate(element => ({ width: parseFloat((element as HTMLElement).style.width), height: parseFloat((element as HTMLElement).style.height) }));
    expect(size.width / size.height).toBeCloseTo(240 / 144, 1); widths.push(size.width);
  }
  await page.mouse.up(); expect(new Set(widths).size).toBe(4);
  const resized = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(resized.nodes[0]!.width / resized.nodes[0]!.height).toBeCloseTo(240 / 144, 3);
  await page.evaluate(() => window.flowFixture.editor().execute("undo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.execute("rotate-right"); e.execute("flip-horizontal"); });
  expect(await node.locator('g[clip-path]').evaluate(n => { const m = (n as SVGGraphicsElement).getScreenCTM()!; return m.a * m.d - m.b * m.c; })).toBeLessThan(0);
  const transformed = await page.evaluate(() => window.flowFixture.editor().getDocument()), svg = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  expect(svg.width).toBeCloseTo(144 + 32); expect(svg.height).toBeCloseTo(240 + 32);
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click(); await page.evaluate(() => window.flowFixture.setLocale("en")); await page.setViewportSize({ width: 740, height: 800 });
  await page.getByRole("button", { name: "Insert and structure", exact: true }).click(); await page.getByRole("menuitem", { name: "Edit image…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit image", exact: true }); await dialog.getByRole("button", { name: "Crop image…", exact: true }).click(); await expect(dialog.getByRole("button", { name: "Finish crop", exact: true })).toBeEnabled();
  expect(await dialog.innerText()).not.toMatch(/\p{Script=Han}/u); await page.screenshot({ path: info.outputPath("crop-dark-english-narrow.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(transformed);
});
