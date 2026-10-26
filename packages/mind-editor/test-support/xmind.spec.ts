import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importXmindFile } from "@quirekit/mind-map/xmind";

test("XMind download preserves edited content, groups and free trees and reopens as an editable file", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const source = { version: 5, revision: 0, layout: "logical-right", root: { id: "r", text: "互操作验证", collapsed: false,
    details: { note: "保留备注", link: "https://example.com", marker: "priority-1" }, style: { fontSize: 20, fill: "#4455ee", color: "#ffffff" },
    children: [{ id: "a", text: "研究", collapsed: false, children: [] }, { id: "b", text: "开发", collapsed: false, children: [] }] },
    floatingTopics: [{ root: { id: "f", text: "独立事项", collapsed: false, children: [] }, side: "left", position: { x: -250, y: 180 } }],
    annotations: [{ id: "rel", kind: "relation", from: "a", to: "b", text: "依赖", color: "#884422" }, { id: "group", kind: "boundary", topicIds: ["a", "b"], text: "阶段" }] };
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: "验证.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(source)) });
  await expect(page.locator(".smm-node")).toHaveCount(4);
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const received = page.waitForEvent("download"); await page.getByRole("menuitem", { name: "XMind 文件（.xmind）", exact: true }).click();
  const download = await received; expect(download.suggestedFilename()).toBe("互操作验证.xmind");
  const file = info.outputPath("quire-mind-roundtrip.xmind"); await download.saveAs(file);
  const result = await importXmindFile(new Uint8Array(await readFile(file)));
  expect(result.diagnostics).toEqual([]); expect(result.sheets[0]!.document.root.details).toEqual(source.root.details);
  expect(result.sheets[0]!.document.annotations).toHaveLength(2);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles(file);
  await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0); await expect(page.locator(".smm-node")).toHaveCount(4);
  await page.locator(".smm-node").filter({ hasText: /^研究$/ }).click();
  await page.getByRole("button", { name: "新增子主题", exact: true }).click(); await expect(page.locator(".smm-node")).toHaveCount(5);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); await expect(page.locator(".smm-node")).toHaveCount(4);
  await page.screenshot({ path: info.outputPath("xmind-editable-reopened.png") });
});

test("export differences open a popup and preserve the complete original source", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const source = { version: 4, revision: 0, layout: "mind-map", root: { id: "r", text: "群组差异", collapsed: false, children: [{ id: "a", text: "分支", collapsed: false, children: [] }] }, floatingTopics: [],
    annotations: [{ id: "g", kind: "boundary", topicIds: ["r", "a"], text: "跨层级外框" }] };
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: "群组.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(source)) });
  const surface = page.locator(".qk-mind-editor__surface"), bounds = await surface.boundingBox();
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const received = page.waitForEvent("download"); await page.getByRole("menuitem", { name: "XMind 文件（.xmind）", exact: true }).click(); await received;
  const warning = page.getByRole("alertdialog", { name: "导出完成，部分内容未保留", exact: true });
  await expect(warning).toBeVisible(); await expect(warning).toContainText("当前脑图未修改"); expect(await surface.boundingBox()).toEqual(bounds);
  await warning.getByRole("button", { name: "返回编辑", exact: true }).click();
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!))).annotations).toEqual(source.annotations);
});
