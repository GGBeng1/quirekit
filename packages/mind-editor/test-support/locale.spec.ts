import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

test("language changes preserve the canvas, history and an unapplied form", async ({ page }) => {
  await page.goto("/");
  const nodes = page.locator(".smm-node");
  await expect(nodes).toHaveCount(14);
  await page.getByRole("button", { name: "新增子主题", exact: true }).click();
  await expect(nodes).toHaveCount(15);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("尚未应用的备注");
  const geometry = await nodes.allTextContents();
  const surface = page.locator("[data-quirekit-mind-map]");
  await surface.evaluate(element => element.setAttribute("data-locale-lifetime", "retained"));
  await page.getByRole("button", { name: "语言", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.getByRole("toolbar", { name: "Mind map toolbar", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Topic note", exact: true })).toHaveValue("尚未应用的备注");
  await expect(surface).toHaveAttribute("data-locale-lifetime", "retained");
  expect(await nodes.allTextContents()).toEqual(geometry);
  await expect(page.getByRole("status")).toHaveText("Unsaved changes");
  await page.getByRole("button", { name: "Close topic content", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(nodes).toHaveCount(15);
  await expect(page.locator(".smm-node-note")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(nodes).toHaveCount(15);
  await page.getByRole("button", { name: "Templates & import", exact: true }).click();
  await expect(page.getByRole("button", { name: "Project planning", exact: true })).toBeVisible();
  await page.getByLabel("Import mind map file", { exact: true }).setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{") });
  await expect(page.getByRole("alertdialog", { name: "Import failed", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page.getByRole("button", { name: "Close templates & import", exact: true }).click();
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved locally", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("toolbar", { name: "Mind map toolbar", exact: true })).toBeVisible();
  await expect(nodes).toHaveCount(15);
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("时间管理");
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "中文", exact: true }).click();
  await expect(page.getByRole("toolbar", { name: "思维导图工具栏", exact: true })).toBeVisible();
});

test("new topics follow the current language and appearance follows the system at narrow widths", async ({ page }, info) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "语言", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Add subtopic", exact: true }).click();
  await expect(page.locator(".smm-node").filter({ hasText: /^Branch topic$/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByRole("menuitem", { name: "Floating topic", exact: true }).click();
  await expect(page.locator(".smm-node").filter({ hasText: /^Floating topic$/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Insert parent topic/ }).click();
  await expect(page.locator(".smm-node").filter({ hasText: /^Parent topic$/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "System", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("[data-qk-scheme='dark']").first()).toBeVisible();
  await page.setViewportSize({ width: 640, height: 820 });
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "English", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(640);
  await page.screenshot({ path: info.outputPath("english-dark-narrow.png") });
  await expect(page.locator("[data-icon-missing]")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("adapter locale updates preserve IME ownership and perform no source, history or layout work", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const result = await page.evaluate(async urls => {
    const { adapterUrl, traceUrl } = urls;
    const { createSimpleMindMapEditor } = await import(adapterUrl);
    const { renderTrace } = await import(traceUrl);
    const host = document.createElement("div"); host.style.cssText = "width:800px;height:500px;position:fixed;inset:0"; document.body.append(host);
    let changes = 0;
    const editor = await createSimpleMindMapEditor({ container: host,
      document: { version: 1, revision: 0, layout: "mind-map", root: { id: "root", text: "我的草稿", collapsed: false, children: [] } },
      onChange: () => changes++,
    });
    editor.select("root"); await editor.execute("edit-text");
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const input = host.querySelector<HTMLElement>("[contenteditable=true]")!;
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    const before = editor.getState(), beforeChanges = changes;
    renderTrace.start(); editor.setLocale("en-US");
    const after = editor.getState(), trace = renderTrace.read(); renderTrace.stop();
    const sameInput = input === host.querySelector("[contenteditable=true]") && input === document.activeElement;
    const invalidations = changes - beforeChanges;
    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "" }));
    await editor.destroy(); host.remove();
    return { before, after, trace, sameInput, invalidations };
  }, { adapterUrl: `/@fs${fileURLToPath(new URL("../../mind-map-simple/src/index.ts", import.meta.url))}`,
    traceUrl: `/@fs${fileURLToPath(new URL("../../mind-map-simple/test-support/render-trace.ts", import.meta.url))}` });
  expect(result.after).toEqual(result.before);
  expect(result.after.composing).toBe(true);
  expect(result.sameInput).toBe(true);
  expect(result.invalidations).toBe(0);
  expect(result.trace.sourceReads).toBe(0);
  expect(result.trace.historyReads).toBe(0);
  expect(result.trace.events).toEqual([]);
});

test("detached authoring dialogs keep their host language through conflict feedback and cancellation", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.evaluate(async ({ dialogUrl, modelUrl }) => {
    const { openMindMapDialog } = await import(dialogUrl), { createMindMapEmbed } = await import(modelUrl);
    openMindMapDialog({ ownerDocument: document, locale: "en", request: {
      document: createMindMapEmbed("locale-test"), commit: () => "conflict", release: () => {},
    } });
  }, { dialogUrl: `/@fs${fileURLToPath(new URL("../src/runtime/dialog.ts", import.meta.url))}`,
    modelUrl: `/@fs${fileURLToPath(new URL("../../mind-map/src/index.ts", import.meta.url))}` });
  const task = page.getByRole("dialog", { name: "Edit mind map", exact: true });
  await expect(task.getByRole("toolbar", { name: "Mind map toolbar", exact: true })).toBeVisible();
  await expect(task.getByRole("button", { name: "Save mind map", exact: true })).toBeEnabled();
  await task.getByRole("button", { name: "Save mind map", exact: true }).click();
  const feedback = page.getByRole("alertdialog", { name: "Unable to save mind map", exact: true });
  await expect(feedback).toContainText("Your draft is retained");
  await feedback.getByRole("button", { name: "Got it", exact: true }).click();
  await task.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(task).toBeHidden();
  await expect(page.getByRole("toolbar", { name: "思维导图工具栏", exact: true })).toBeVisible();
});
