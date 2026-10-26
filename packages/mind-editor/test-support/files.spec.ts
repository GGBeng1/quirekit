import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

// Use the importer's declared archive dependency to build producer fixtures.
const require = createRequire(new URL("../../mind-map/package.json", import.meta.url));
const { zipSync, strToU8 } = require("fflate") as typeof import("../../mind-map/node_modules/fflate");

test("templates preview before replacing, save across reopening, and download complete PNG", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.getByRole("button", { name: "项目推进", exact: true }).click();
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.screenshot({ path: info.outputPath("files-light.png") });
  await toggleMindPreviewTheme(page);
  await expect(page.getByRole("button", { name: "模板与导入", exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("files-dark.png") });
  await toggleMindPreviewTheme(page);
  await page.getByRole("button", { name: "使用此画布", exact: true }).click();
  await expect(page.locator(".smm-node")).toHaveCount(10);
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("项目推进");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.locator(".smm-node")).toHaveCount(10);
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator(".smm-node")).toHaveCount(10);
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("项目推进");
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const downloaded = page.waitForEvent("download"); await page.getByRole("menuitem", { name: "图片（PNG）", exact: true }).click();
  const download = await downloaded; expect(download.suggestedFilename()).toBe("项目推进.png");
  const image = await readFile((await download.path())!);
  expect(image.subarray(1, 4).toString()).toBe("PNG");
  const dimensions = await page.evaluate(async bytes => {
    const image = new Image(); image.src = `data:image/png;base64,${bytes}`; await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, image.toString("base64"));
  expect(dimensions.width).toBeGreaterThan(500); expect(dimensions.width).toBeLessThanOrEqual(4096);
  expect(dimensions.width * dimensions.height).toBeLessThanOrEqual(8000000);
  await expect(page.locator("[data-icon-missing]")).toHaveCount(0); expect(errors).toEqual([]);
});

test("XMind archives ask only for a canvas and import the keyboard choice immediately", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  const modern = zipSync({ "content.json": strToU8(JSON.stringify([
    { title: "方案甲", rootTopic: { title: "主方案", labels: ["需要提示"] } },
    { title: "方案乙", rootTopic: { title: "备选方案", children: { attached: [{ title: "验证步骤" }] } } },
  ])) });
  const input = page.getByLabel("导入脑图文件", { exact: true });
  await input.setInputFiles({ name: "多画布.xmind", mimeType: "application/octet-stream", buffer: Buffer.from(modern) });
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await expect(page.getByRole("region", { name: "选择导入画布", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "使用此画布", exact: true })).toHaveCount(0);
  const choice = page.getByRole("button", { name: "导入 2. 方案乙", exact: true });
  await expect(choice.locator("img")).toBeVisible();
  await page.screenshot({ path: info.outputPath("import-canvas-choice.png") });
  await choice.press("Enter");
  await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0);
  const warning = page.getByRole("alertdialog", { name: "导入完成，部分内容未保留", exact: true });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(warning).toBeHidden();
  await expect(page.locator(".smm-node")).toHaveCount(2);
  await expect(page.locator(".smm-node").filter({ hasText: /^备选方案$/ })).toBeVisible();
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("备选方案");
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await input.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":99}') });
  const failure = page.getByRole("alertdialog", { name: "导入失败", exact: true });
  await expect(failure).toContainText("无法读取文件");
  await page.keyboard.press("Escape");
  await expect(failure).toBeHidden();
  await expect(page.locator(".smm-node")).toHaveCount(2);
  const legacy = zipSync({ "content.xml": strToU8(`<xmap-content xmlns:svg="http://www.w3.org/2000/svg">
    <sheet id="s"><title svg:width="100">旧画布</title><topic id="r"><title svg:width="160">旧版主题</title>
      <children><topics type="attached"><topic><title svg:width="100">001 &amp; 中文</title></topic></topics></children>
    </topic></sheet></xmap-content>`) });
  await input.setInputFiles({ name: "旧版.xmind", mimeType: "application/octet-stream", buffer: Buffer.from(legacy) });
  await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0);
  await expect(page.getByText(/无法读取文件/)).toHaveCount(0);
  await expect(page.locator(".smm-node")).toHaveCount(2);
  await expect(page.locator(".smm-node").filter({ hasText: /^旧版主题$/ })).toBeVisible();
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("旧版主题");
  await expect(page.locator(".smm-node").filter({ hasText: /^001 & 中文$/ })).toBeVisible();
});

test("native files retain the complete versioned example and closing a pending read leaves it unchanged", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  const sample = JSON.parse(await readFile(new URL("../../../apps/classic-editor-demo/src/showcase/mind-map/sample.json", import.meta.url), "utf8"));
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: "原生.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sample.document)) });
  await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0);
  await expect(page.locator(".smm-node image")).toHaveCount(1);
  await expect(page.locator(".qk-mind-editor__surface [data-quirekit-mind-map]")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+z"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect(page.locator(".smm-node image")).toHaveCount(1);
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
  expect(saved).toEqual({ ...sample.document, revision: saved.revision });
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.evaluate(() => {
    File.prototype.text = () => new Promise<string>(resolve => Object.assign(window, { finishMindFileRead: resolve }));
  });
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: "迟到.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("button", { name: "正在读取文件…", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭模板与导入", exact: true }).click();
  await page.evaluate(value => (window as unknown as { finishMindFileRead(value: string): void }).finishMindFileRead(value),
    JSON.stringify({ ...sample.document, root: { ...sample.document.root, text: "过期的导入" } }));
  await expect(page.locator(".smm-node image")).toHaveCount(1);
  await expect(page.getByText(/无法读取文件/)).toHaveCount(0);
  await expect(page.locator(".smm-node").filter({ hasText: /^过期的导入$/ })).toHaveCount(0);
});

test("single-canvas imports report differences in a dialog without changing canvas geometry", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  for (const archive of [true, false]) {
    if (!archive) {
      await page.setViewportSize({ width: 640, height: 820 });
      await toggleMindPreviewTheme(page);
    }
    const surface = page.locator(".qk-mind-editor__surface");
    const bounds = await surface.boundingBox();
    const data = JSON.stringify([{ title: "产品规划", rootTopic: { title: "产品规划", labels: ["转换提示"],
      children: { attached: [{ title: "需求调研" }, { title: "迭代开发" }, { title: "验收发布" }] } } }]);
    await page.getByRole("button", { name: "模板与导入", exact: true }).click();
    await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({
      name: archive ? "产品规划.xmind" : "content.json", mimeType: archive ? "application/octet-stream" : "application/json",
      buffer: Buffer.from(archive ? zipSync({ "content.json": strToU8(data) }) : data),
    });
    await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0);
    // Content is already imported before the result is acknowledged.
    await expect(page.locator(".smm-node")).toHaveCount(4);
    const warning = page.getByRole("alertdialog", { name: "导入完成，部分内容未保留", exact: true });
    await expect(warning).toBeVisible();
    await warning.getByText("查看转换详情", { exact: true }).click();
    await expect(warning.getByText(/labels/)).toBeVisible();
    expect(await surface.boundingBox()).toEqual(bounds);
    const root = page.locator(".smm-node").filter({ hasText: /^产品规划$/ });
    const position = await root.boundingBox();
    await page.screenshot({ path: info.outputPath(archive ? "import-warning-light.png" : "import-warning-dark-narrow.png") });
    if (archive) await page.keyboard.press("Escape");
    else await warning.getByRole("button", { name: "返回编辑", exact: true }).click();
    await expect(warning).toBeHidden();
    await expect(surface.locator("[data-quirekit-mind-map]")).toBeFocused();
    expect(await surface.boundingBox()).toEqual(bounds);
    expect(await root.boundingBox()).toEqual(position);
    await page.getByRole("button", { name: "新增子主题", exact: true }).click(); await expect(page.locator(".smm-node")).toHaveCount(5);
    await page.getByRole("button", { name: "撤销", exact: true }).click(); await expect(page.locator(".smm-node")).toHaveCount(4);
    await page.keyboard.press("ControlOrMeta+z"); await expect(page.locator(".smm-node")).toHaveCount(14);
  }
  expect(errors).toEqual([]);
});

test("a newer file choice invalidates an earlier read without adding a stale history entry", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      return this.name === "慢文件.json" ? new Promise<string>(resolve => Object.assign(window, { finishOldImport: resolve })) : read.call(this);
    };
  });
  const input = page.getByLabel("导入脑图文件", { exact: true });
  await input.setInputFiles({ name: "慢文件.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("button", { name: "正在读取文件…", exact: true })).toBeVisible();
  const newer = [{ title: "最新选择", rootTopic: { title: "最新选择" } }];
  await input.setInputFiles({ name: "新文件.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(newer)) });
  await expect(page.locator(".smm-node")).toHaveCount(1);
  await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0);
  await page.evaluate(async () => {
    (window as unknown as { finishOldImport(value: string): void }).finishOldImport(JSON.stringify([{ rootTopic: { title: "过期选择" } }]));
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
  });
  await expect(page.locator(".smm-node").filter({ hasText: /^最新选择$/ })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+z"); await expect(page.locator(".smm-node")).toHaveCount(14);
});
