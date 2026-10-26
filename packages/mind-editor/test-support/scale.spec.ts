import { expect, test } from "@playwright/test";

test("focus folds peers without losing content and undo restores the complete forest", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitem", { name: "聚焦当前分支", exact: true }).click();
  await expect(nodes).toHaveCount(8);
  await expect(nodes.filter({ hasText: /^确定三个优先目标$/ })).toBeVisible();
  await page.getByRole("button", { name: "撤销", exact: true }).click(); await expect(nodes).toHaveCount(14);
});

test("minimap follows pointer and keyboard navigation without moving source topics", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "导航缩略图", exact: true }).click();
  const minimap = page.getByRole("application", { name: "拖动定位；方向键移动视图", exact: true });
  await expect(minimap).toBeVisible();
  const initial = await page.locator(".smm-node").first().boundingBox(), box = (await minimap.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .7, { steps: 8 }); await page.mouse.up();
  const moved = await page.locator(".smm-node").first().boundingBox(); expect(moved?.x).not.toBe(initial?.x);
  await expect(page.getByText("就绪", { exact: true })).toBeVisible();
  await minimap.press("ArrowLeft");
  await expect.poll(async () => (await page.locator(".smm-node").first().boundingBox())?.x).not.toBe(moved?.x);
  await minimap.press("Escape"); await expect(minimap).toBeHidden();
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "导航缩略图", exact: true }).click();
  await page.setViewportSize({ width: 680, height: 600 });
  const bounds = (await minimap.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(680);
});
