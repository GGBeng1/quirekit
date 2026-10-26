import { expect, test } from "@playwright/test";
import type {} from "./types";

test("choosing the theme's current color persists explicitly and the picker fits a narrow dark window", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n1"]));
  const initial = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(initial.nodes[1]?.style.fill).toBeUndefined();
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  await page.getByRole("button", { name: "#FFFFFF", exact: true }).click();
  const explicit = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(explicit.nodes[1]?.style.fill).toBe("#FFFFFF");
  await page.getByRole("button", { name: "应用填充颜色", exact: true }).click();
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(explicit);
  await expect(page.locator('.x6-node[data-cell-id="publish-n1"] > path').first()).toHaveAttribute("fill", "#FFFFFF");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(initial);
  await page.setViewportSize({ width: 740, height: 820 });
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click();
  await page.getByRole("button", { name: "更多颜色", exact: true }).click();
  const input = page.getByRole("textbox", { name: "HEX 颜色值" }); await expect(input).toBeVisible();
  const box = (await input.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(740);
  await page.screenshot({ path: info.outputPath("color-dark-narrow.png"), animations: "disabled" });
  await input.press("Escape"); await expect(input).not.toBeVisible();
  await expect(page.getByRole("button", { name: "更多颜色", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "选择填充颜色", exact: true })).toBeFocused();
});

for (const width of [900, 1440]) {
  test(`the precise color editor stays beside a stationary palette at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/");
    await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
    await page.evaluate(() => window.flowFixture.editor().select(["publish-n1"]));
    const trigger = page.getByRole("button", { name: "选择填充颜色", exact: true });
    await trigger.click();
    const palette = page.locator(".qk-color-picker__palette"), before = (await palette.boundingBox())!;
    await page.getByRole("button", { name: "更多颜色", exact: true }).click();
    const editor = page.locator(".qk-color-picker__editor-panel"); await expect(editor).toBeVisible();
    await expect.poll(async () => {
      const bounds = (await editor.boundingBox())!;
      const leftGap = before.x - bounds.x - bounds.width, rightGap = bounds.x - before.x - before.width;
      return bounds.x >= 0 && bounds.x + bounds.width <= width && Math.min(Math.abs(leftGap - 2), Math.abs(rightGap - 2)) <= 1;
    }).toBe(true);
    expect(await palette.boundingBox()).toEqual(before);
    await page.keyboard.press("Escape"); await expect(editor).toBeHidden(); await expect(palette).toBeVisible();
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  });
}
