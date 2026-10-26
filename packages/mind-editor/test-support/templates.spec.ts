import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const base = `/@fs${fileURLToPath(new URL("../../../", import.meta.url))}`;

/** @param page - Gallery browser. @returns Completion of visible snapshots, ignoring genuinely offscreen cards. */
async function visiblePreviews(page: Page): Promise<void> {
  await expect.poll(() => page.locator(".qk-mind-editor__templates").evaluate(gallery => {
    const viewport = gallery.parentElement!.getBoundingClientRect();
    return Array.from(gallery.querySelectorAll(".qk-mind-editor__template-preview")).filter(element => {
      const box = element.getBoundingClientRect(); return box.bottom > viewport.top && box.top < viewport.bottom;
    }).every(element => { const image = element.querySelector("img"); return image?.complete && image.naturalWidth > 0; });
  })).toBe(true);
}

test("every template uses complete centered renderer output, one job at a time, with bounded lifetime", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const result = await page.evaluate(async base => {
    const { createMindEditorPreviewRenderer } = await import(`${base}packages/mind-editor/src/ui/files/preview.ts`);
    const { createMindMapTemplate, mindMapTemplates } = await import(`${base}packages/mind-map/src/index.ts`);
    const { createTheme } = await import(`${base}packages/ui/src/index.ts`);
    const renderer = createMindEditorPreviewRenderer(), theme = createTheme(), lifetime = new AbortController();
    let maximum = 0, created = 0;
    const observer = new MutationObserver(records => {
      for (const record of records) for (const element of record.addedNodes) {
        if (element instanceof HTMLElement && element.hasAttribute("data-mind-map-preview-renderer")) created++;
      }
      maximum = Math.max(maximum, document.querySelectorAll("[data-mind-map-preview-renderer]").length);
    });
    observer.observe(document.body, { childList: true });
    try {
      const previews = await Promise.all(mindMapTemplates.map(async (template: { id: string }) => {
        const source = createMindMapTemplate(template.id), url = await renderer.render(source, theme, lifetime.signal);
        const xml = new DOMParser().parseFromString(decodeURIComponent(url.split(",")[1]!), "image/svg+xml");
        const count = (node: { children: unknown[] }): number => 1 + node.children.reduce<number>((sum, child) => sum + count(child as { children: unknown[] }), 0);
        // Measure occupied pixels, not a repeated thumbnail-layout formula. The
        // renderer's natural bounds must center blank, asymmetric and nested trees.
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3]! > 30) {
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
        return { id: template.id, nodes: xml.querySelectorAll(".smm-node").length, expected: count(source.root),
          dx: Math.abs(left - (canvas.width - right - 1)), dy: Math.abs(top - (canvas.height - bottom - 1)),
          clipped: left < 10 || top < 10 || right > canvas.width - 10 || bottom > canvas.height - 10 };
      }));
      const beforeCache = created;
      await renderer.render(createMindMapTemplate("project"), theme, lifetime.signal);
      const cacheHits = created === beforeCache;
      const abort = new AbortController(), canceled = renderer.render(createMindMapTemplate("weekly"), theme, abort.signal);
      abort.abort(); const rejected = await canceled.then(() => false, () => true);
      const active = createMindEditorPreviewRenderer();
      const interrupted = active.render(createMindMapTemplate("weekly"), theme, lifetime.signal);
      await Promise.resolve(); active.dispose();
      const activeCanceled = await interrupted.then(() => false, () => true);
      renderer.dispose();
      const afterClose = await renderer.render(createMindMapTemplate("blank"), theme, lifetime.signal).then(() => false, () => true);
      return { previews, maximum, created, cacheHits, rejected, afterClose, activeCanceled };
    } finally { renderer.dispose(); observer.disconnect(); }
  }, base);
  expect(result.previews).toHaveLength(20);
  for (const preview of result.previews) {
    expect(preview.nodes, preview.id).toBe(preview.expected);
    expect(preview.clipped, preview.id).toBe(false);
    expect(preview.dx, preview.id).toBeLessThanOrEqual(3);
    expect(preview.dy, preview.id).toBeLessThanOrEqual(3);
  }
  expect(result.maximum).toBe(1); expect(result.created).toBe(21);
  expect(result.cacheHits && result.rejected && result.afterClose && result.activeCanceled).toBe(true);
  await expect(page.locator("[data-mind-map-preview-renderer]")).toHaveCount(0);
  await expect(page.locator(".smm-node")).toHaveCount(14);
});

test("gallery searches, filters, previews the actual styled source and returns to editing on apply", async ({ page }, info) => {
  // The shared development checkout may receive unrelated HMR updates. Keep
  // this loaded document stable while exercising its public theme controls.
  await page.routeWebSocket("**", () => {});
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await expect(page.locator(".qk-mind-editor__templates button")).toHaveCount(20); await visiblePreviews(page);
  await page.screenshot({ path: info.outputPath("gallery-light.png") });
  await page.getByRole("combobox", { name: "模板分类", exact: true }).click();
  await page.getByRole("option", { name: "分析决策", exact: true }).click();
  await expect(page.locator(".qk-mind-editor__templates button")).toHaveCount(4);
  await page.getByRole("textbox", { name: "搜索模板", exact: true }).fill("SWOT");
  await expect(page.locator(".qk-mind-editor__templates button")).toHaveCount(1);
  await page.getByRole("button", { name: "SWOT 分析", exact: true }).click();
  const preview = page.locator(".qk-mind-editor__file-detail img"); await expect(preview).toBeVisible();
  await expect(page.locator(".smm-node")).toHaveCount(14);
  const drawing = await preview.getAttribute("src");
  await page.getByRole("textbox", { name: "搜索模板", exact: true }).fill("");
  await page.getByRole("combobox", { name: "模板分类", exact: true }).click();
  await page.getByRole("option", { name: "全部模板", exact: true }).click();
  await toggleMindPreviewTheme(page);
  await expect(preview).toBeVisible(); await visiblePreviews(page);
  await page.screenshot({ path: info.outputPath("gallery-dark.png") });
  await toggleMindPreviewTheme(page);
  await expect(preview).toBeVisible();
  await page.getByRole("button", { name: "使用此画布", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "模板与导入", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const saved = await page.evaluate(async base => {
    const { createMindMapTemplate } = await import(`${base}packages/mind-map/src/index.ts`);
    return { actual: JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!), expected: createMindMapTemplate("swot") };
  }, base);
  expect(saved.actual).toEqual(saved.expected);
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const download = page.waitForEvent("download"); await page.getByRole("menuitem", { name: "矢量图（SVG）", exact: true }).click();
  const { readFile } = await import("node:fs/promises");
  const exported = await readFile((await (await download).path())!, "utf8");
  // IDs and placement within the viewport can differ; natural SVG geometry and
  // node styles cannot. Compare visible primitives after root translation.
  const same = await page.evaluate(({ drawing, exported }) => {
    const primitives = (svg: string): string[] => Array.from(new DOMParser().parseFromString(svg, "image/svg+xml")
      .querySelectorAll(".smm-node")).map(node => node.innerHTML.replace(/\bid="[^"]*"/g, ""));
    return JSON.stringify(primitives(decodeURIComponent(drawing!.split(",")[1]!))) === JSON.stringify(primitives(exported));
  }, { drawing, exported });
  expect(same).toBe(true); expect(errors).toEqual([]);
});

test("narrow gallery keeps selection review and return accessible, and closing cancels previews", async ({ page }, info) => {
  await page.setViewportSize({ width: 640, height: 820 });
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click(); await visiblePreviews(page);
  await page.getByRole("button", { name: "项目推进", exact: true }).click();
  await expect(page.locator(".qk-mind-editor__file-detail img")).toBeVisible();
  await expect(page.getByRole("region", { name: "模板库", exact: true })).not.toBeVisible();
  await page.screenshot({ path: info.outputPath("gallery-narrow.png") });
  await page.getByRole("button", { name: "返回模板", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "搜索模板", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭模板与导入", exact: true }).click();
  await expect(page.locator("[data-mind-map-preview-renderer]")).toHaveCount(0);
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await expect(page.locator(".qk-mind-editor__canvas")).not.toHaveAttribute("inert");
  await expect(page.locator(".qk-mind-editor__surface [data-quirekit-mind-map]")).toBeFocused();
});
