import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type {} from "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeVisible();
  await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
});

test("shared toolbar, native text, internal history and save/cancel/reopen", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await expect(page.locator(".x6-node")).toHaveCount(6);
  await page.locator(".x6-node").filter({ hasText: "编写内容" }).dblclick();
  const input = page.getByRole("textbox", { name: "图形文字" });
  await expect(input).toBeVisible(); await input.fill("编写内容\n中文测试");
  await input.press("ControlOrMeta+Enter");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.some(n => n.text.includes("中文测试"))).toBe(true);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.some(n => n.text.includes("中文测试"))).toBe(false);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "插入判断", exact: true }).click();
  await expect(page.locator(".x6-node")).toHaveCount(7);
  await page.getByRole("button", { name: "取消修改" }).click();
  await expect(page.locator(".x6-node")).toHaveCount(6);
  await page.reload(); await expect(page.locator(".x6-node").filter({ hasText: "中文测试" })).toBeVisible();
  expect((await page.evaluate(() => window.flowFixture.committed())).revision).toBe(1);
  expect(errors).toEqual([]);
});

test("real dragging, fixed-port linking, wheel viewport and source isolation", async ({ page }) => {
  const node = page.locator('.x6-node[data-cell-id="publish-n1"]');
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 28); await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(box.x + 30 + i * 12, box.y + 28 + i * 4);
    const live = await node.boundingBox(); expect(live!.x).toBeGreaterThan(box.x + i * 7);
  }
  await page.mouse.up();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[1]!.x).toBeGreaterThan(before.nodes[1]!.x + 40);
  await node.hover();
  const source = node.locator('[port="right"]');
  const targetNode = page.locator('.x6-node[data-cell-id="publish-n4"]');
  const start = (await source.boundingBox())!, end = (await targetNode.locator('[port="right"]').boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2); await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 }); await page.mouse.up();
  await expect(page.locator(".x6-edge")).toHaveCount(7);
  const graph = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(graph.edges.at(-1)?.source).toEqual({ node: "publish-n1", port: "right" });
  expect(graph.edges.at(-1)?.target).toEqual({ node: "publish-n4", port: "right" });
  const changes = await page.evaluate(() => window.flowFixture.invalidations());
  await page.mouse.move(1000, 500); await page.mouse.wheel(35, 80);
  await expect.poll(() => page.evaluate(() => window.flowFixture.editor().getState().y)).not.toBe(0);
  await page.getByRole("button", { name: "放大", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(changes);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(graph);
});

test("themes, narrow viewport and actual JSON/SVG/PNG downloads", async ({ page }, info) => {
  await page.screenshot({ path: info.outputPath("flow-light.png") });
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await page.screenshot({ path: info.outputPath("flow-dark.png") });
  const initial = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.setViewportSize({ width: 740, height: 780 });
  await expect.poll(() => page.locator(".x6-graph-svg").evaluate(e => e.getBoundingClientRect().width)).toBeLessThan(600);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ path: info.outputPath("flow-narrow.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [name, format] of [["导出源文件（JSON）", "json"], ["导出矢量图（SVG）…", "svg"], ["导出图片（PNG）…", "png"]] as const) {
    await page.getByRole("button", { name: "图表", exact: true }).click();
    const download = page.waitForEvent("download"); await page.getByRole("menuitem", { name, exact: true }).click();
    if (format !== "json") await page.getByRole("button", { name: "下载图片", exact: true }).click();
    const result = await download; const bytes = await readFile((await result.path())!);
    if (format === "json") expect(JSON.parse(bytes.toString())).toEqual(initial);
    else if (format === "svg") { expect(bytes.toString()).toContain("审核通过"); expect(bytes.toString()).not.toContain("x6-port"); }
    else expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test("composition and read-only prevent graph commands without losing native text", async ({ page }) => {
  await page.locator(".x6-node").filter({ hasText: "编写内容" }).dblclick();
  const input = page.getByRole("textbox", { name: "图形文字" });
  await input.dispatchEvent("compositionstart", { data: "" }); await input.fill("正在输入中文");
  await input.dispatchEvent("compositionupdate", { data: "中文" });
  await expect(page.getByRole("button", { name: "撤销", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByText("请完成中文输入后再操作", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("正在输入中文");
  await input.dispatchEvent("compositionend", { data: "中文" }); await input.press("ControlOrMeta+Enter");
  await page.getByRole("button", { name: "切换只读" }).click();
  await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeDisabled();
  const document = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("application").focus(); await page.keyboard.press("Delete");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(document);
});
