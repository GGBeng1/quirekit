import { expect, test } from "@playwright/test";
import "./types";

test("passive draft captures native text without committing, laying out or reading history", async ({ page }) => {
  await page.addInitScript(() => { window.mindMapHarnessOnly = true; }); await page.goto("/");
  await page.evaluate(async () => {
    let notices = 0, inputs = 0;
    await window.mindMapHarness.mount(21, "first", { onDraftChange: () => { notices++; } });
    document.querySelector("#first")!.addEventListener("input", () => inputs++, true);
    Object.assign(window, { draftNotices: () => notices, draftInputs: () => inputs });
    const editor = window.mindMapHarness.editors[0]!; editor.select("n0"); await editor.execute("edit-text");
    notices = 0;
    window.mindMapHarness.trace.start();
  });
  const input = page.locator('#first [contenteditable="true"]'); await expect(input).toBeFocused(); await input.fill("未提交\n原生文字");
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.trace.read().events.filter(event => event.name === "node_tree_render_end").length)).toBe(1);
  const before = await page.evaluate(() => ({ trace: window.mindMapHarness.trace.read(), undo: window.mindMapHarness.editors[0]!.getState().canUndo,
    notices: (window as unknown as { draftNotices(): number }).draftNotices(), inputs: (window as unknown as { draftInputs(): number }).draftInputs() }));
  expect(before.trace.sourceReads).toBe(0); expect(before.trace.historyReads).toBe(0);
  expect(before.inputs).toBeGreaterThan(0); expect(before.notices).toBe(before.inputs);
  const captured = await page.evaluate(() => {
    const harness = window.mindMapHarness; harness.trace.start();
    const document = harness.editors[0]!.captureDraft();
    return { document, trace: harness.trace.read(), undo: harness.editors[0]!.getState().canUndo };
  });
  expect(captured.document?.root.text).toBe("未提交\n原生文字");
  expect(captured.trace.sourceReads).toBe(1); expect(captured.trace.historyReads).toBe(0); expect(captured.trace.events).toHaveLength(0);
  expect(captured.undo).toBe(before.undo); await expect(input).toBeFocused();
  await input.dispatchEvent("compositionstart", { data: "中文" });
  const composing = await page.evaluate(() => { window.mindMapHarness.trace.start(); return { document: window.mindMapHarness.editors[0]!.captureDraft(), trace: window.mindMapHarness.trace.read() }; });
  expect(composing.document).toBeNull(); expect(composing.trace.sourceReads).toBe(0); expect(composing.trace.historyReads).toBe(0);
  await input.dispatchEvent("compositionend", { data: "中文" }); await input.press("Enter");
  const source = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument()); expect(source.root.text).toBe("未提交\n原生文字");
});
