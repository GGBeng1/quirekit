import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

/** @param page - Live workspace. @returns The latest committed local checkpoint, without touching editor source. */
async function record(page: Page): Promise<unknown> {
  return page.evaluate(async () => new Promise((resolve, reject) => {
    const request = indexedDB.open("quirekit-mind-map-recovery", 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drafts")) { db.close(); resolve(null); return; }
      const transaction = db.transaction("drafts", "readonly"), rows = transaction.objectStore("drafts").getAll();
      transaction.oncomplete = () => { db.close(); resolve(rows.result[0] ?? null); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
    request.onerror = () => reject(request.error);
  }));
}
/** @param page - Workspace. @returns Visible content form. */
async function content(page: Page): Promise<void> {
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
}

test("native text survives reload without Enter, preserving focus and undo before recovery", async ({ page }) => {
  await page.goto("/"); const root = page.locator(".smm-node").filter({ hasText: /^时间管理$/ }); await expect(root).toBeVisible();
  await root.dblclick(); const input = page.locator('[contenteditable="true"]'); await expect(input).toBeFocused();
  await page.keyboard.insertText("刷新前没有回车");
  await expect.poll(() => record(page)).toMatchObject({ checkpoint: { document: { root: { text: "刷新前没有回车" } } } });
  await expect(input).toBeFocused(); await expect(input).toContainText("刷新前没有回车");
  await page.reload(); const popup = page.getByRole("dialog", { name: "恢复未保存的脑图", exact: true }); await expect(popup).toBeVisible();
  await expect(page.getByRole("button", { name: "保存到本机", exact: true, includeHidden: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("quirekit-mind-editor-preview-v1"))).toBeNull();
  await popup.getByRole("button", { name: "恢复草稿", exact: true }).click(); await expect(popup).toBeHidden();
  await expect(page.locator(".smm-node").filter({ hasText: /^刷新前没有回车$/ })).toBeVisible();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await expect.poll(() => record(page)).toBeNull();
  await page.reload(); await expect(popup).toBeHidden();
  await expect(page.locator(".smm-node").filter({ hasText: /^刷新前没有回车$/ })).toBeVisible();
});

test("unfinished URL and note recover as fields and still require valid source admission", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.locator(".smm-node").filter({ hasText: /^本周计划$/ }).click(); await content(page);
  await page.getByRole("textbox", { name: "主题链接", exact: true }).fill("https://");
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("尚未应用的备注");
  await expect.poll(async () => JSON.stringify(await record(page))).toContain("尚未应用的备注");
  await page.reload(); await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "主题链接", exact: true })).toHaveValue("https://");
  await expect(page.getByRole("textbox", { name: "主题备注", exact: true })).toHaveValue("尚未应用的备注");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "无法保存到本机", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("quirekit-mind-editor-preview-v1"))).toBeNull();
});

test("stale host source blocks restore and discard preserves the newer source", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "新增子主题", exact: true }).click();
  await expect.poll(async () => await record(page) !== null).toBe(true);
  await page.evaluate(() => localStorage.setItem("quirekit-mind-editor-preview-v1", JSON.stringify({ version: 1, revision: 0, layout: "mind-map", root: { id: "new-main", text: "后来保存的正文", collapsed: false, children: [] } })));
  await page.reload(); const popup = page.getByRole("dialog", { name: "草稿与当前正文不同", exact: true }); await expect(popup).toBeVisible();
  await expect(popup.getByRole("button", { name: "恢复草稿", exact: true })).toHaveCount(0);
  await popup.getByRole("button", { name: "丢弃草稿", exact: true }).click(); await expect(popup).toBeHidden();
  await expect(page.locator(".smm-node")).toHaveText("后来保存的正文"); await expect.poll(() => record(page)).toBeNull();
});

test("two pages use transaction-CAS and show storage conflict in a popup", async ({ page, context }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const second = await context.newPage(); await second.goto("/"); await expect(second.locator(".smm-node")).toHaveCount(14);
  await page.locator(".smm-node").filter({ hasText: /^时间管理$/ }).dblclick(); await expect(page.locator('[contenteditable="true"]')).toBeFocused(); await page.keyboard.insertText("第一页版本");
  await expect.poll(async () => JSON.stringify(await record(page))).toContain("第一页版本");
  await second.locator(".smm-node").filter({ hasText: /^时间管理$/ }).dblclick(); await expect(second.locator('[contenteditable="true"]')).toBeFocused(); await second.keyboard.insertText("第二页版本");
  await expect(second.getByRole("alertdialog", { name: "操作未完成", exact: true })).toBeVisible();
  expect(JSON.stringify(await record(page))).toContain("第一页版本");
  expect(JSON.stringify(await record(page))).not.toContain("第二页版本"); await second.close();
});

test("host force-close retains insertion draft; explicit Cancel clears it without committing", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const url = `/@fs${fileURLToPath(new URL("../src/index.ts", import.meta.url))}`;
  const model = `/@fs${fileURLToPath(new URL("../../mind-map/src/index.ts", import.meta.url))}`;
  /** @returns Open captured host task with a fresh insertion identity. */
  async function open(): Promise<void> {
    await page.evaluate(async ({ url, model, id }) => {
      const { openMindMapDialog } = await import(url), { createMindMapEmbed } = await import(model);
      const handle = openMindMapDialog({ ownerDocument: document, recovery: { namespace: "host-test", documentId: "doc", targetId: "insert", insertion: true },
        request: { document: createMindMapEmbed(id), intent: "insert", commit: () => { throw new Error("Cancel must never commit"); }, release() {} } });
      Object.assign(window, { closeMindRecovery: () => handle.close() });
    }, { url, model, id: uuidv4() });
  }
  await open(); const dialog = page.getByRole("dialog", { name: "编辑思维导图", exact: true }); await expect(dialog.locator(".smm-node")).toHaveCount(1);
  await dialog.locator(".smm-node").dblclick(); await expect(dialog.locator('[contenteditable="true"]')).toBeFocused(); await page.keyboard.insertText("插入任务草稿");
  await page.evaluate(() => (window as unknown as { closeMindRecovery(): void }).closeMindRecovery()); await expect(dialog).toBeHidden();
  await expect.poll(async () => JSON.stringify(await record(page))).toContain("插入任务草稿");
  await open(); await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
  await expect(dialog.locator(".smm-node")).toHaveText("插入任务草稿");
  await dialog.getByRole("button", { name: "取消", exact: true }).click(); await expect(dialog).toBeHidden();
  await expect.poll(() => record(page)).toBeNull(); await open(); await expect(page.getByRole("button", { name: "恢复草稿", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
});

test("English dark recovery downloads the full source and pending fields without applying them", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "语言", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("menuitem", { name: "Images, links & notes…", exact: true }).click();
  await page.getByRole("textbox", { name: "Topic note", exact: true }).fill("Backup includes this pending note");
  await expect.poll(async () => JSON.stringify(await record(page))).toContain("Backup includes this pending note");
  await page.reload(); const popup = page.getByRole("dialog", { name: "Recover unsaved mind map", exact: true });
  await expect(popup).toBeVisible(); await expect(page.locator("[data-qk-scheme='dark']").first()).toBeVisible();
  const downloading = page.waitForEvent("download"); await popup.getByRole("button", { name: "Download draft backup", exact: true }).click();
  const download = await downloading; expect(download.suggestedFilename()).toBe("mind-map.mind-draft.json");
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup).toMatchObject({ version: 1, checkpoint: { document: { root: { text: "时间管理" } }, pending: { details: [{ patch: { note: "Backup includes this pending note" } }] } } });
  await expect(popup).toBeVisible(); expect(await page.evaluate(() => localStorage.getItem("quirekit-mind-editor-preview-v1"))).toBeNull();
  await page.screenshot({ path: info.outputPath("recovery-english-dark.png") });
  await popup.getByRole("button", { name: "Discard draft", exact: true }).click(); await expect.poll(() => record(page)).toBeNull();
});

test("storage failure uses a popup and still permits manual editing and saving", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(IDBFactory.prototype, "open", { value() { throw new DOMException("Storage disabled", "SecurityError"); } }); });
  await page.goto("/"); const feedback = page.getByRole("alertdialog", { name: "操作未完成", exact: true });
  await expect(feedback).toBeVisible(); await expect(feedback).toContainText("无法保存自动草稿");
  await feedback.getByRole("button", { name: "知道了", exact: true }).click();
  await page.getByRole("button", { name: "新增子主题", exact: true }).click(); await expect(page.locator(".smm-node")).toHaveCount(15);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("quirekit-mind-editor-preview-v1")))!).root.children).toHaveLength(5);
  await expect(page.locator(".qk-mind-editor__status")).toHaveText("就绪");
  await expect(feedback).toBeHidden();
});
