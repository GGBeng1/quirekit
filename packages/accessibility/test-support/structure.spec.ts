import { expect, test } from "@playwright/test";
import type {} from "./types";

for (const mode of ["canvas", "svg"] as const) {
  test(`${mode}: contributed hierarchy, marks and native nested text editing`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/test-support/");
    await page.waitForFunction(() => !!window.accessibilityFixture);
    await page.evaluate((backend) => {
      window.accessibilityFixture.createStructured(backend);
      window.accessibilityFixture.controller!.focusReading();
    }, mode);
    const reader = page.getByRole("region", { name: "阅读文档" });
    await expect(reader.getByRole("heading", { level: 3 })).toHaveText("Contributed title");
    await expect(reader.locator("blockquote").getByRole("link", { name: "Quoted link" })).toHaveAttribute("href", "https://example.com");
    await expect(reader.locator("blockquote strong")).toHaveText("Quoted link");
    await expect(reader.locator("ol > li")).toHaveAttribute("value", "7");
    await expect(reader.locator("ol > li > ul > li p")).toHaveText("Nested item");
    await info.attach("native-reading-tree", { body: await reader.ariaSnapshot(), contentType: "text/plain" });
    await page.screenshot({ path: info.outputPath(`${mode}-structure.png`) });

    // Reading activation must return through the existing view's selection and native input owner.
    await reader.locator("ol > li > ul > li").getByRole("button", { name: "编辑此段" }).click();
    const input = page.locator("[data-qk-input-proxy]");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("Nested item");
    await page.keyboard.type("Z");
    await expect.poll(() => page.evaluate(() => window.accessibilityFixture.editor.state.doc.textContent)).toContain("ZNested item");
    await expect.poll(() => page.evaluate(() => {
      const { editor } = window.accessibilityFixture;
      const caret = editor.view.coordsAtPos(editor.state.pm.selection.head);
      const rect = editor.view.elements.inputProxy!.getBoundingClientRect();
      return Math.abs(caret.left - rect.left) < 2 && Math.abs(caret.top - rect.top) < 2;
    })).toBe(true);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
    await expect(input).toHaveValue("Nested item");
    await page.evaluate(() => window.accessibilityFixture.controller!.focusReading());
    await reader.getByRole("button", { name: "下一段阅读内容" }).click();
    await expect(reader.locator("ol > li")).toHaveAttribute("value", "8");
    await expect(reader.locator("ol > li")).toHaveAttribute("aria-posinset", "2");
    await expect(reader.locator("ol > li")).toHaveAttribute("aria-setsize", "2");
    await expect(reader.getByRole("button", { name: "下一段阅读内容" })).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
