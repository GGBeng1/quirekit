import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument, PDFName } from "pdf-lib";
test("downloads a real complete image PDF without changing saved content", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: /保存到本机/ }).click(); await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("quirekit-mind-editor-preview-v1"));
  await page.getByRole("button", { name: "导出", exact: true }).click(); const received = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PDF 整图（图片）", exact: true }).click();
  const download = await received, path = info.outputPath("quire-mind.pdf"); await download.saveAs(path);
  const bytes = await readFile(path), pdf = await PDFDocument.load(bytes); expect(pdf.getPageCount()).toBe(1); expect(bytes.length).toBeGreaterThan(10000);
  const first = pdf.getPage(0); expect(first.node.Resources()!.get(PDFName.of("XObject"))).toBeDefined();
  expect(first.getWidth()).toBeGreaterThan(first.getHeight()); expect(first.getWidth()).toBeLessThanOrEqual(14400);
  await page.getByRole("button", { name: /保存到本机/ }).click(); expect(await page.evaluate(() => localStorage.getItem("quirekit-mind-editor-preview-v1"))).toBe(before);
  await expect(page.getByRole("alertdialog")).toHaveCount(0); await expect(page.locator("[data-icon-missing]")).toHaveCount(0);
});
test("isolated print image is decoded before print and afterprint releases its frame", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.evaluate(() => {
    // Intercept only the test's new print frame; never invoke an OS printer.
    const original = document.body.append.bind(document.body);
    document.body.append = (...nodes) => {
      original(...nodes);
      for (const node of nodes) if (node instanceof HTMLIFrameElement && node.hasAttribute("data-quirekit-mind-print")) {
        node.contentWindow!.print = () => {
          const body = node.contentDocument!.body, image = body.querySelector("img")!;
          (window as unknown as { printProof: unknown }).printProof = { decoded: image.complete && image.naturalWidth > 0, children: body.children.length, image: image.src.startsWith("data:image/png"), decorated: !!body.querySelector("button,svg,[data-quirekit-mind-map]") };
          node.contentWindow!.dispatchEvent(new Event("afterprint"));
        };
      }
    };
  });
  await page.getByRole("button", { name: "视图", exact: true }).click(); await page.getByRole("menuitem", { name: "打印脑图", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { printProof: unknown }).printProof)).toEqual({ decoded: true, children: 1, image: true, decorated: false });
  await expect(page.locator("iframe[data-quirekit-mind-print]")).toHaveCount(0); await expect(page.locator(".smm-node")).toHaveCount(14);
});
