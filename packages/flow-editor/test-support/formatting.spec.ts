import { openFlowLine } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import type {} from "./types";

/** @param page - Isolated preview. @param target - Independent channel label. @param color - Arbitrary opaque HEX. @returns Completed precise selection through the public color component. */
async function chooseHex(page: Page, target: string, color: string): Promise<void> {
  await page.getByRole("button", { name: `选择${target}`, exact: true }).click();
  await page.getByRole("button", { name: "更多颜色", exact: true }).click();
  const input = page.getByRole("textbox", { name: "HEX 颜色值" });
  await input.fill(color); await input.press("Tab");
  await page.getByRole("button", { name: `选择${target}`, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
});

test("split colors accept arbitrary HEX, repeat independently and survive undo and save", async ({ page }, info) => {
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n1"]));
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  await page.screenshot({ path: info.outputPath("color-palette.png"), animations: "disabled" });
  await page.getByRole("button", { name: "更多颜色", exact: true }).click();
  const input = page.getByRole("textbox", { name: "HEX 颜色值" });
  await input.fill("#C8E4D6"); await input.press("Tab");
  await page.screenshot({ path: info.outputPath("color-precise.png"), animations: "disabled" });
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  const filled = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(filled.nodes[1]!.style).toEqual({ ...before.nodes[1]!.style, fill: "#C8E4D6" });
  await expect(page.locator('.x6-node[data-cell-id="publish-n1"] > path').first()).toHaveAttribute("fill", "#C8E4D6");
  expect(filled.edges).toEqual(before.edges);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "应用填充颜色", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[1]?.style.fill).toBe("#C8E4D6");
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n2"]));
  await page.getByRole("button", { name: "应用填充颜色", exact: true }).click();
  await chooseHex(page, "描边颜色", "#286F58"); await chooseHex(page, "文字颜色", "#174633");
  const styled = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(styled.nodes[2]?.style).toMatchObject({ fill: "#C8E4D6", stroke: "#286F58", color: "#174633" });
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  await expect(page.getByText("最近使用", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "#C8E4D6", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(styled.nodes);
});

test("mixed stroke is atomic and color drafts expire when selection or permission changes", async ({ page }) => {
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n1", "publish-e0"]));
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await chooseHex(page, "描边颜色", "#A65788");
  const changed = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(changed.nodes[1]?.style.stroke).toBe("#A65788"); expect(changed.edges[0]?.style.stroke).toBe("#A65788");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n1"]));
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  await page.getByRole("button", { name: "更多颜色", exact: true }).click();
  await page.getByRole("textbox", { name: "HEX 颜色值" }).fill("#102030");
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n2"]));
  await expect(page.getByRole("textbox", { name: "HEX 颜色值" })).not.toBeVisible();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  await page.evaluate(() => window.flowFixture.editor().setReadOnly(true));
  await expect(page.getByRole("button", { name: "更多颜色", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "应用填充颜色", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});

test("unified line menu retains distinct previews, mixed values and keyboard navigation", async ({ page }, info) => {
  await page.evaluate(() => window.flowFixture.editor().select(["publish-e0"]));
  const trigger = page.getByRole("button", { name: "连线设置", exact: true });
  await openFlowLine(page, "连线路径");
  const paths = page.getByRole("menuitemradio"); await expect(paths).toHaveCount(4);
  const samples = await paths.locator(".qk-flow-style-preview > path:first-child").evaluateAll(items => items.map(p => p.getAttribute("d")));
  expect(new Set(samples).size).toBe(4);
  await page.screenshot({ path: info.outputPath("lines-light.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.getByRole("menuitem", { name: "线宽", exact: true }).hover();
  await expect(page.getByRole("menuitemradio", { name: "默认 · 1.5 px", exact: true })).toBeChecked();
  await expect(page.getByRole("menuitemradio", { name: "粗线 · 3 px", exact: true }).locator(".qk-flow-style-preview > path")).toHaveAttribute("stroke-width", "3");
  await page.keyboard.press("Escape");
  await page.getByRole("menuitem", { name: "线型", exact: true }).hover();
  const dash = page.getByRole("menuitemradio", { name: "虚线", exact: true });
  await expect(dash.locator(".qk-flow-style-preview > path")).toHaveAttribute("stroke-dasharray", "6 4"); await dash.click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[0]?.style.dashed).toBe(true);
  await openFlowLine(page, "线型"); await expect(dash).toBeChecked();
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  await openFlowLine(page, "常用箭头");
  await expect(page.getByRole("menuitemradio")).toHaveCount(6);
  await expect(page.getByRole("menuitemradio", { name: "双向箭头", exact: true }).locator(".qk-flow-style-preview path")).toHaveCount(3);
  await expect(page.getByRole("menuitemradio", { name: "圆形端点", exact: true }).locator(".qk-flow-style-preview g path")).toHaveAttribute("d", /a3.5/);
  await page.screenshot({ path: info.outputPath("arrows-light.png"), animations: "disabled" });
  await page.keyboard.press("Escape"); await page.getByRole("menuitem", { name: "终点", exact: true }).click();
  await expect(page.getByRole("menuitemradio")).toHaveCount(12);
  await page.keyboard.press("End"); await page.keyboard.press("Enter");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[0]?.style.targetArrow).toBe("er-zero-many");
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["publish-e1"]); e.setEdgeStyle({ dashed: false }); e.select(["publish-e0", "publish-e1"]); });
  await openFlowLine(page, "线型"); await expect(page.locator('[role=menuitemradio][aria-checked=true]')).toHaveCount(0);
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "切换明暗主题" }).click(); await openFlowLine(page, "连线路径");
  await expect(page.getByRole("menuitemradio", { name: "直线", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("lines-dark.png"), animations: "disabled" });
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 740, height: 820 }); await openFlowLine(page, "常用箭头");
  const choice = page.getByRole("menuitemradio", { name: "单向箭头", exact: true }); await expect(choice).toBeVisible();
  await page.screenshot({ path: info.outputPath("arrows-narrow.png"), animations: "disabled" });
  const box = (await choice.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(740);
});
