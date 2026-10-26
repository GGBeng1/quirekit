import { expect, test, type Page } from "@playwright/test";
import type {} from "./types";
test.use({ actionTimeout: 10_000 });

/** @param page - Real preview page. Selects the shared radio menu through its icon button. */
async function english(page: Page): Promise<void> {
  await page.getByRole("button", { name: "界面语言：中文", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(page.getByRole("application", { name: "Diagram editor" })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "English", exact: true })).toBeHidden();
}
/** @param page - Mounted preview. Opens the actual catalog entry. */
async function templates(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Diagram", exact: true }).click();
  await page.getByRole("menuitem", { name: "Create from template…", exact: true }).click();
}

test.beforeEach(async ({ page }) => { await page.goto("/"); await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeVisible(); });

test("Classic language icon and menu preserve graph identity, dirty content, history, selection and viewport", async ({ page }) => {
  const before = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(); editor.addNode("process"); editor.setZoom(0.7);
    (window as unknown as { localeEditor: unknown }).localeEditor = editor;
    return { source: await editor.getDocument(), state: editor.getState(), changes: window.flowFixture.invalidations() };
  });
  await english(page);
  await expect(page.getByRole("textbox", { name: "Search shapes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Interface language: English" })).toBeVisible();
  expect(await page.evaluate(async () => ({ same: (window as unknown as { localeEditor: unknown }).localeEditor === window.flowFixture.editor(), source: await window.flowFixture.editor().getDocument(), state: window.flowFixture.editor().getState(), changes: window.flowFixture.invalidations() })))
    .toEqual({ same: true, ...before });
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await expect(page.locator(".x6-node")).toHaveCount(6);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await expect(page.locator(".x6-node")).toHaveCount(7);
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await page.reload(); await expect(page.getByRole("application", { name: "Diagram editor" })).toBeVisible();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(before.source.nodes);
});

test("host language changes during native composition retain the input and do no document work", async ({ page }) => {
  await page.locator('.x6-node[data-cell-id="publish-n1"]').dblclick();
  const input = page.getByRole("textbox", { name: "图形文字" });
  await input.dispatchEvent("compositionstart", { data: "" }); await input.fill("输入中的中文草稿"); await input.dispatchEvent("compositionupdate", { data: "中文" });
  const count = await page.evaluate(() => window.flowFixture.invalidations());
  await page.evaluate(() => window.flowFixture.setLocale("en-GB"));
  const renamed = page.getByRole("textbox", { name: "Shape text", exact: true });
  await expect(renamed).toBeFocused(); await expect(renamed).toHaveValue("输入中的中文草稿");
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(count);
  expect(await page.evaluate(() => window.flowFixture.editor().getState().composing)).toBe(true);
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(page.getByText("Finish text composition before continuing.", { exact: true })).toBeVisible();
  await expect(renamed).toHaveValue("输入中的中文草稿");
  await renamed.dispatchEvent("compositionend", { data: "中文" }); await renamed.press("ControlOrMeta+Enter");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.find(node => node.id === "publish-n1")!.text).toBe("输入中的中文草稿");
});

test("English creation, gallery previews and persisted content survive language changes", async ({ page }) => {
  await english(page);
  await page.getByRole("button", { name: "Insert Process", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.at(-1)!.text).toBe("New shape");
  await templates(page);
  const dialog = page.getByRole("dialog", { name: "Choose a diagram template", exact: true });
  expect(await dialog.innerText()).not.toMatch(/\p{Script=Han}/u);
  await dialog.getByRole("button", { name: "User sign-in sequence", exact: true }).click();
  await expect(dialog.locator(".qk-flow-templates__large-preview img")).toBeVisible();
  await dialog.getByRole("button", { name: "Use template", exact: true }).click();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(source.nodes.map(node => node.text).join()).not.toMatch(/\p{Script=Han}/u);
  await page.evaluate(() => { window.flowFixture.editor().execute("sequence-participant"); });
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.at(-1)!.text).toBe("New participant");
  const created = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "Interface language: English" }).click();
  await page.getByRole("menuitemradio", { name: "中文", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(created);
});

test("localized formatting, public color picker, shortcuts, library and export work in light, dark and narrow layouts", async ({ page }, info) => {
  await english(page);
  await page.locator('.x6-node[data-cell-id="publish-n1"]').click();
  await page.getByRole("button", { name: "Choose Fill color", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.getByRole("dialog").innerText()).not.toMatch(/\p{Script=Han}/u);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Shape properties", exact: true }).click();
  expect(await page.locator(".qk-flow-object-panel").innerText()).not.toMatch(/\p{Script=Han}/u); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
  expect(await page.getByRole("dialog", { name: "Shortcuts and gestures" }).innerText()).not.toMatch(/\p{Script=Han}/u);
  await page.screenshot({ path: info.outputPath("flow-english-shortcuts.png") }); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Diagram", exact: true }).click(); await page.getByRole("menuitem", { name: "My library…" }).click();
  expect(await page.getByRole("dialog", { name: "My library", exact: true }).innerText()).not.toMatch(/\p{Script=Han}/u); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Diagram", exact: true }).click(); await page.getByRole("menuitem", { name: "Export image (PNG)…" }).click();
  const dialog = page.getByRole("dialog", { name: "Export image", exact: true });
  await expect(dialog.getByRole("button", { name: "Download image", exact: true })).toBeEnabled();
  expect(await dialog.innerText()).not.toMatch(/\p{Script=Han}/u);
  const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download image", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Flowchart.png");
  await page.screenshot({ path: info.outputPath("flow-english-light.png") });
  await page.getByRole("button", { name: "Toggle light / dark theme", exact: true }).click();
  await page.setViewportSize({ width: 740, height: 780 }); await page.screenshot({ path: info.outputPath("flow-english-dark-narrow.png") });
  await expect(page.getByRole("button", { name: "Interface language: English" })).toBeInViewport();
});
