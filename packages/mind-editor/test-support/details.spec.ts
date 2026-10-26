import { expect, test } from "@playwright/test";

test("content panel stores literal notes, links, priority and normalized local images", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await page.getByRole("button", { name: "编辑", exact: true }).click(); await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  await page.getByRole("textbox", { name: "主题链接", exact: true }).fill("https://example.com/plan");
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("会议前复核\n<script>纯文本</script>");
  await page.getByRole("combobox", { name: "优先级标记", exact: true }).click();
  await page.getByRole("option", { name: "优先级 1", exact: true }).click();
  await page.getByRole("button", { name: "应用主题内容", exact: true }).click();
  await expect(page.locator(".smm-node-note")).toHaveCount(1);
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 450;
    const context = canvas.getContext("2d")!; context.fillStyle = "#4855ec"; context.fillRect(0, 0, 900, 450);
    context.fillStyle = "white"; context.font = "60px sans-serif"; context.fillText("QK", 360, 250); return canvas.toDataURL().split(",")[1]!;
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "计划.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByRole("button", { name: "替换主题图片", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const source = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
  expect(source.version).toBe(5); expect(source.root.children[0].details).toMatchObject({ link: "https://example.com/plan", marker: "priority-1", image: { width: 256, height: 128, alt: "计划.png" } });
  await page.getByRole("combobox", { name: "图片显示宽度", exact: true }).click();
  await page.getByRole("option", { name: "192 px", exact: true }).click();
  await expect(page.locator(".smm-node image")).toHaveAttribute("width", "192");
  await expect(page.locator("[data-icon-missing]")).toHaveCount(0);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ path: info.outputPath("topic-details.png") });
  await page.getByRole("button", { name: "移除主题图片", exact: true }).click();
  await expect(page.locator(".smm-node image")).toHaveCount(0);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".smm-node image")).toHaveCount(1);
  await page.reload(); await expect(page.locator(".smm-node image")).toHaveCount(1);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await page.getByRole("button", { name: "编辑", exact: true }).click(); await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "主题备注", exact: true })).toHaveValue("会议前复核\n<script>纯文本</script>");
  expect(errors).toEqual([]);
});

test("a delayed image upload never writes to a newly selected topic", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await page.getByRole("button", { name: "编辑", exact: true }).click(); await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 20; canvas.height = 10;
    const data = canvas.toDataURL().split(",")[1]!;
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      const original = decode.call(this);
      if (!this.src.startsWith("blob:")) return original;
      return original.then(() => new Promise<void>(resolve => { Object.assign(window, { releaseMindImage: resolve }); }));
    };
    return data;
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "迟到.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  await expect(page.getByRole("button", { name: "正在读取图片…", exact: true })).toBeVisible();
  await page.waitForFunction(() => "releaseMindImage" in window);
  await nodes.filter({ hasText: /^周工作总结$/ }).click();
  await page.evaluate(() => (window as unknown as { releaseMindImage(): void }).releaseMindImage());
  await expect(page.getByRole("button", { name: "添加主题图片", exact: true })).toBeEnabled();
  await expect(page.locator(".smm-node image")).toHaveCount(0);
});
