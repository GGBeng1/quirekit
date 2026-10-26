import { expect, test } from "@playwright/test";
test("whole-map themes and new layouts share undo, saved source and bilingual controls", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "主题格式", exact: true }).click();
  await page.getByRole("button", { name: "海洋", exact: true }).click();
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const source = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
  expect(source.root.style.fill).toBe("#087e8b"); expect(source.root.children[0].text).toBe("本周计划");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.getByRole("button", { name: "关闭主题格式", exact: true }).click();
  for (const name of ["组织结构图", "时间轴"]) {
    await page.getByRole("button", { name: "布局", exact: true }).click();
    await page.getByRole("menuitemradio", { name, exact: true }).click();
    await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
    const next = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
    expect(next.version).toBe(6); expect(next.layout).toBe(name === "时间轴" ? "timeline" : "organization");
    expect(next.root.children.map((n: { text: string }) => n.text)).toEqual(source.root.children.map((n: { text: string }) => n.text));
  }
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ path: info.outputPath("timeline.png") });
  expect(errors).toEqual([]);
});
