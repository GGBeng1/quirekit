import { expect, test } from "./browser";
import type {} from "./types";

test("refused native paste preserves final LF, caret position and one fallback input", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    await window.mindMapHarness.mount(); const editor = window.mindMapHarness.editors[0]!;
    editor.setZoom(1); await editor.center();
    const source = document.createElement("textarea"); source.id = "fallback-copy"; document.body.append(source);
    const original = document.execCommand.bind(document);
    document.execCommand = (command, ui, value) => command === "insertText" ? false : original(command, ui, value);
  });
  const source = page.locator("#fallback-copy"); await source.fill("第一行\n");
  await source.press("ControlOrMeta+a"); await source.press("ControlOrMeta+c");
  await page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  const input = page.locator('#first [contenteditable="true"]');
  await expect(input).toBeVisible();
  await page.evaluate(() => {
    window.mindMapHarness.trace.start();
    const input = document.querySelector('#first [contenteditable="true"]')!;
    input.addEventListener("input", event => {
      if ((event as InputEvent).inputType === "insertFromPaste") input.setAttribute("data-paste-inputs", String(Number(input.getAttribute("data-paste-inputs")) + 1));
    });
  });
  await input.press("ControlOrMeta+v"); await expect(input).toHaveAttribute("data-paste-inputs", "1");
  await page.keyboard.insertText("末行追加"); await input.press("Enter");
  expect((await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).root.text).toBe("第一行\n末行追加");
  await page.evaluate(() => window.mindMapHarness.trace.stop());
});
