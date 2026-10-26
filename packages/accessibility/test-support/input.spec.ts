import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

for (const mode of ["canvas", "svg"] as const) {
  test(`${mode}: native typing, selection, undo and reading entry`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/test-support/");
    await page.waitForFunction(() => !!window.accessibilityFixture);
    await page.evaluate((backend) => {
      const { editor } = window.accessibilityFixture;
      if (editor.view.mode !== backend) editor.changeMode(backend);
      editor.commands.setTextSelection(2);
      editor.view.focus();
    }, mode);
    const input = page.locator("[data-qk-input-proxy]");
    await expect(input).toBeFocused();
    await page.keyboard.type("ABC");
    await expect.poll(() => page.evaluate(() => window.accessibilityFixture.editor.state.doc.firstChild!.textContent)).toBe("CABCanvas and SVG document");
    // The accepted caret and native text host must stay co-located after real keyboard input.
    await expect.poll(() => page.evaluate(() => {
      const editor = window.accessibilityFixture.editor;
      const anchor = editor.view.coordsAtPos(editor.state.pm.selection.head);
      const rect = editor.view.elements.inputProxy!.getBoundingClientRect();
      return Math.abs(anchor.left - rect.left);
    })).toBeLessThan(8);
    await expect(input).toHaveValue("CABCanvas and SVG document");
    expect((await input.boundingBox())!.width).toBeLessThanOrEqual(1.1);
    await page.keyboard.press("Shift+ArrowLeft");
    expect(await page.evaluate(() => window.accessibilityFixture.editor.state.pm.selection.empty)).toBe(false);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => page.evaluate(() => window.accessibilityFixture.editor.state.doc.firstChild!.textContent)).toBe("Canvas and SVG document");
    await page.getByRole("button", { name: "阅读文档", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Canvas and SVG document", level: 2 })).toBeVisible();
    await page.getByRole("button", { name: "下一段阅读内容", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("阅读分段 2");
    await page.getByRole("button", { name: "编辑此段", exact: true }).first().click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(/Paragraph 4:/);
    await page.keyboard.type("EDIT ");
    expect(await page.evaluate(() => window.accessibilityFixture.editor.state.doc.child(4).textContent)).toMatch(/^EDIT Paragraph 4:/);
    await page.locator("#editor").screenshot({ path: info.outputPath(`${mode}-editing.png`) });
    await page.getByRole("button", { name: "阅读文档", exact: true }).click();
    const next = page.getByRole("button", { name: "下一段阅读内容", exact: true });
    for (let segment = 0; segment < 8 && await next.isEnabled(); segment++) await next.click();
    await expect(next).toBeDisabled();
    await page.getByRole("button", { name: "编辑此段", exact: true }).last().click();
    await expect(input).toHaveValue(/Paragraph 29:/);
    await expect.poll(() => page.locator("#editor").evaluate((host) => host.scrollTop)).toBeGreaterThan(0);
    await expect(input).toBeFocused();
    expect(errors).toEqual([]);
  });

  test(`${mode}: composition policy survives toggles and cancels stale external edits`, async ({ page }) => {
    await page.goto("/test-support/");
    await page.waitForFunction(() => !!window.accessibilityFixture);
    await page.evaluate((backend) => {
      const fixture = window.accessibilityFixture;
      fixture.create(backend);
      fixture.editor.commands.setTextSelection(2);
      fixture.editor.view.focus();
      const input = fixture.editor.view.elements.inputProxy!;
      input.dispatchEvent(new CompositionEvent("compositionstart"));
      input.value = "Cnianvas and SVG document";
      input.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));
      fixture.controller!.setEnabled(false);
      fixture.controller!.setEnabled(true);
      input.value = "C你anvas and SVG document";
      input.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
      input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertFromComposition", data: "你", cancelable: true }));
    }, mode);
    expect(await page.evaluate(() => window.accessibilityFixture.editor.state.doc.firstChild!.textContent)).toBe("C你anvas and SVG document");
    expect(await page.evaluate(() => window.accessibilityFixture.controller!.getDiagnostics()[0]!.composing)).toBe(false);
    await page.evaluate(() => {
      const { editor } = window.accessibilityFixture;
      const input = editor.view.elements.inputProxy!;
      input.dispatchEvent(new CompositionEvent("compositionstart"));
      editor.commands.insertContent("X");
      input.dispatchEvent(new CompositionEvent("compositionend", { data: "坏" }));
      input.value = "C你坏anvas and SVG document";
      input.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "坏" }));
    });
    expect(await page.evaluate(() => window.accessibilityFixture.editor.state.doc.firstChild!.textContent)).toBe("C你Xanvas and SVG document");
  });
}

test("absent, disabled, enabled-edit and enabled-reading have bounded work", async ({ page }, info) => {
  await page.goto("/test-support/");
  await page.waitForFunction(() => !!window.accessibilityFixture);
  const evidence = await page.evaluate(async () => {
    const results = [];
    for (const state of ["absent", "disabled", "enabled", "reading"] as const) {
      const fixture = window.accessibilityFixture;
      fixture.create("svg", state === "reading" ? "enabled" : state);
      if (state === "reading") fixture.controller!.focusReading();
      await new Promise(requestAnimationFrame);
      const before = fixture.controller?.getDiagnostics()[0];
      const start = performance.now();
      for (let position = 2; position < 20; position++) {
        fixture.editor.commands.setTextSelection(position);
        await new Promise(requestAnimationFrame);
      }
      const elapsed = performance.now() - start;
      const after = fixture.controller?.getDiagnostics()[0];
      results.push({ state, before, after, elapsed, surfaces: document.querySelectorAll("[data-qk-accessibility]").length });
    }
    return results;
  });
  expect(evidence[0]!.surfaces).toBe(0);
  expect(evidence[1]!.surfaces).toBe(0);
  expect(evidence[1]!.after!.contextCompiles).toBe(0);
  for (const item of evidence.slice(2)) {
    expect(item.after!.contextCompiles - item.before!.contextCompiles).toBeLessThanOrEqual(18);
    expect(item.after!.readingCompiles).toBe(item.before!.readingCompiles);
    expect(item.after!.readingDomUpdates).toBe(item.before!.readingDomUpdates);
  }
  await info.attach("accessibility-work-counts", { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
  await writeFile(info.outputPath("work-counts.json"), JSON.stringify(evidence, null, 2));
});
