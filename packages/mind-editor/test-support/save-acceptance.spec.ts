import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import type { SaveAcceptanceBridge } from "./save-acceptance/types";

test.beforeEach(async ({ page }) => { await page.routeWebSocket(/.*/, socket => socket.close()); });

test("manual save clears modified status while preserving undo and subsequent edits", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.locator(".smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  await page.locator('[contenteditable="true"]').fill("已明确保存的正文");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await expect(page.locator(".qk-mind-editor__status")).toHaveText("就绪");
  await page.screenshot({ path: info.outputPath("accepted-save-ready.png") });
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".smm-node").filter({ hasText: /^时间管理$/ })).toBeVisible();
  await expect(page.locator(".qk-mind-editor__status")).toHaveText("已修改");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.locator(".qk-mind-editor__status")).toHaveText("就绪");
});

/** @param page - Isolated browser page. @returns Test-owned public observations. */
async function observe(page: Page) {
  return page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.state());
}
/** @param page - Isolated preview context. @returns Public component mounted in an independent host. */
async function mount(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const url = `/@fs${fileURLToPath(new URL("./save-acceptance/scenario.ts", import.meta.url))}`;
  await page.evaluate(async url => {
    const { mountSaveAcceptance } = await import(url);
    Object.assign(window, { mindSaveAcceptance: await mountSaveAcceptance() });
  }, url);
}

test("save acceptance retains late native input and checkpoints it against the accepted baseline", async ({ page }) => {
  await mount(page);
  const workspace = page.locator("#save-acceptance"), input = workspace.locator('[contenteditable="true"]');
  await workspace.locator(".smm-node").dblclick(); await input.fill("保存前版本"); await input.press("Enter");
  /** @returns The host's public bridge, without inspecting component or vendor internals. */
  const observation = () => page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.state());
  await expect.poll(observation).toMatchObject({ record: { checkpoint: { document: { root: { text: "保存前版本" } } } } });
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.save());
  await expect.poll(observation).toMatchObject({ removing: true, finished: false, accepted: { root: { text: "保存前版本" } } });
  await workspace.locator(".smm-node").dblclick(); await input.fill("保存期间新输入"); await expect(input).toBeFocused();
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.release());
  await expect.poll(observation).toMatchObject({ finished: true, errors: [] });
  await expect(input).toBeVisible(); await expect(input).toBeFocused(); await expect(input).toHaveText("保存期间新输入");
  await expect(workspace.locator(".qk-mind-editor__status")).toHaveText("已修改");
  await expect.poll(observation).toMatchObject({ record: { checkpoint: { document: { root: { text: "保存期间新输入" } } } } });
  const final = await observation(); expect(final.record?.base).toBe(final.expectedBase);
  expect(final.accepted?.root.text).toBe("保存前版本");
  await input.press("Enter"); await workspace.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(workspace.locator(".smm-node")).toHaveText("保存前版本");
});

test("a delayed host response cannot mark newer native text as saved", async ({ page }) => {
  await mount(page); const workspace = page.locator("#save-acceptance"), input = workspace.locator('[contenteditable="true"]');
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.capture());
  await workspace.locator(".smm-node").dblclick(); await input.fill("宿主确认前的新输入");
  await expect.poll(() => observe(page)).toMatchObject({ record: { checkpoint: { document: { root: { text: "宿主确认前的新输入" } } } } });
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.accept());
  await expect.poll(() => observe(page)).toMatchObject({ removing: true });
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.release());
  await expect.poll(() => observe(page)).toMatchObject({ finished: true, accepted: { root: { text: "保存起点" } }, errors: [] });
  await expect(input).toBeFocused(); await expect(input).toHaveText("宿主确认前的新输入");
  await expect(workspace.locator(".qk-mind-editor__status")).toHaveText("已修改");
  await expect.poll(() => observe(page)).toMatchObject({ record: { checkpoint: { document: { root: { text: "宿主确认前的新输入" } } } } });
  const result = await observe(page); expect(result.record?.base).toBe(result.expectedBase);
});

test("a saved source does not clear unapplied property fields arriving before host acceptance", async ({ page }) => {
  await mount(page); const workspace = page.locator("#save-acceptance");
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.capture());
  await workspace.getByRole("button", { name: "编辑", exact: true }).click();
  // Public menus portal to the owning document, outside the mounted fixture.
  await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  const note = workspace.getByRole("textbox", { name: "主题备注", exact: true });
  await note.fill("宿主确认前的未应用备注");
  await expect.poll(async () => JSON.stringify((await observe(page)).record)).toContain("宿主确认前的未应用备注");
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.accept());
  await expect.poll(() => observe(page)).toMatchObject({ removing: true });
  await page.evaluate(() => (window as unknown as { mindSaveAcceptance: SaveAcceptanceBridge }).mindSaveAcceptance.release());
  await expect.poll(() => observe(page)).toMatchObject({ finished: true, errors: [] });
  await expect(workspace.locator(".qk-mind-editor__status")).toHaveText("已修改");
  await expect(note).toBeFocused(); await expect(note).toHaveValue("宿主确认前的未应用备注");
  await expect.poll(async () => JSON.stringify((await observe(page)).record)).toContain("宿主确认前的未应用备注");
  const result = await observe(page); expect(result.accepted?.root.details?.note).toBeUndefined();
  expect(result.record?.checkpoint.document.root.details?.note).toBeUndefined();
  expect(result.record?.base).toBe(result.expectedBase);
});
