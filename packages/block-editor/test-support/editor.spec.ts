import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#first .qk-html-editor__document")).toBeVisible();
  await expect(page.locator("#second .qk-html-editor__document")).toBeVisible();
});

test("built package accepts native input and undo/redo in a continuous HTML view", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await page.evaluate(() => window.blockFixture.first.editor.state.doc.toJSON());
  await page.locator("#first .qk-html-editor__document p").first().click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("A fresh block document");
  await expect.poll(() => page.evaluate(() => window.blockFixture.first.editor.getText())).toBe("A fresh block document");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => page.evaluate(() => window.blockFixture.first.editor.state.doc.toJSON())).toEqual(before);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect.poll(() => page.evaluate(() => window.blockFixture.first.editor.getText())).toBe("A fresh block document");
  expect(await page.evaluate(() => ({
    mode: window.blockFixture.first.editor.mountedView?.mode,
    ...window.blockFixture.diagnostics
  }))).toMatchObject({ mode: "html", paginationProducts: 0, jsonReads: 0 });
  expect(errors).toEqual([]);
});

test("read-only state and destruction are isolated between product instances", async ({ page }) => {
  const before = await page.evaluate(() => {
    window.blockFixture.first.editor.setEditable(false);
    return window.blockFixture.first.editor.getText();
  });
  await page.locator("#first .qk-html-editor__document p").first().click();
  await page.keyboard.type("forbidden");
  expect(await page.evaluate(() => window.blockFixture.first.editor.getText())).toBe(before);
  await page.evaluate(() => window.blockFixture.first.destroy());
  await expect(page.locator("#first .qk-html-editor")).toHaveCount(0);
  await page.locator("#second .qk-html-editor__document p").first().click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Independent editor");
  await expect.poll(() => page.evaluate(() => window.blockFixture.second.editor.getText())).toBe("Independent editor");
});

test("drag selection tracks pointer movement and retains SVG paint after blur", async ({ page }, testInfo) => {
  const paragraph = page.locator("#first .qk-html-editor__document p").first();
  const points = await paragraph.evaluate((element) => {
    const text = element.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 18);
    const rect = range.getBoundingClientRect();
    return { left: rect.left + 1, right: rect.right - 1, top: rect.top, y: rect.top + rect.height / 2 };
  });
  const before = await page.evaluate(() => window.blockFixture.first.editor.state.doc.toJSON());
  await page.mouse.move(points.left, points.y);
  await page.mouse.down();
  const heads: number[] = [];
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(points.left + (points.right - points.left) * step / 6, points.y);
    await expect.poll(() => page.evaluate(() => window.blockFixture.first.editor.state.pm.selection.empty)).toBe(false);
    heads.push(await page.evaluate(() => window.blockFixture.first.editor.state.pm.selection.head));
  }
  await page.mouse.up();
  expect(new Set(heads).size).toBeGreaterThan(2);
  const rectangles = page.locator("#first [data-qk-selection-rect]");
  await expect(rectangles.first()).toBeVisible();
  const paint = await rectangles.evaluateAll((elements) => elements.map((element) => ({
    svg: element instanceof SVGRectElement,
    fill: getComputedStyle(element).fill,
    box: element.getBoundingClientRect().toJSON()
  })));
  expect(paint.every((rectangle) => rectangle.svg)).toBe(true);
  expect(paint.every((rectangle) => rectangle.fill === "rgba(96, 165, 250, 0.32)")).toBe(true);
  // An SVG can exist and be visible while painting outside its editor. Compare
  // actual client boxes with the selected text instead of only checking nodes.
  expect(paint[0]!.box.x).toBeCloseTo(points.left - 1, 1);
  expect(paint[0]!.box.y).toBeCloseTo(points.top, 1);
  expect(paint[0]!.box.right).toBeCloseTo(points.right + 1, 1);
  const selected = await page.evaluate(() => window.blockFixture.first.editor.state.pm.selection.toJSON());
  await page.getByRole("button", { name: "Outside editor" }).click();
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(await rectangles.evaluateAll((elements) => elements.map((element) => ({
    svg: element instanceof SVGRectElement,
    fill: getComputedStyle(element).fill,
    box: element.getBoundingClientRect().toJSON()
  })))).toEqual(paint);
  expect(await page.evaluate(() => window.blockFixture.first.editor.state.pm.selection.toJSON())).toEqual(selected);
  expect(await page.evaluate(() => window.blockFixture.first.editor.state.doc.toJSON())).toEqual(before);
  expect(await page.evaluate(() => window.blockFixture.diagnostics)).toMatchObject({ paginationProducts: 0, jsonReads: 0 });
  await expect(page.locator("#first [data-qk-input-proxy]")).toHaveCSS("position", "absolute");
  await page.locator("#first").screenshot({ path: testInfo.outputPath("selection-blur.png") });
  await testInfo.attach("selection-paint", {
    contentType: "application/json",
    body: JSON.stringify({ paint, selected, dpr: await page.evaluate(() => devicePixelRatio) })
  });
});

test("unmount and host replacement preserve the Core session and undo history", async ({ page }) => {
  const before = await page.evaluate(() => {
    const { first, host } = window.blockFixture;
    const original = first.editor.getText();
    first.editor.commands.insertContent("Preserved ");
    first.unmount();
    first.mount(host("replacement"));
    return original;
  });
  await expect(page.locator("#first .qk-html-editor")).toHaveCount(0);
  await expect(page.locator("#replacement .qk-html-editor__document")).toContainText("Preserved");
  expect(await page.evaluate(() => window.blockFixture.first.editor.commands.undo())).toBe(true);
  expect(await page.evaluate(() => window.blockFixture.first.editor.getText())).toBe(before);
  await page.evaluate(() => window.blockFixture.first.mount(window.blockFixture.host("first")));
  await expect(page.locator("#replacement .qk-html-editor")).toHaveCount(0);
  await expect(page.locator("#first .qk-html-editor")).toHaveCount(1);
  await page.evaluate(() => { window.blockFixture.first.destroy(); window.blockFixture.first.destroy(); });
  await expect(page.locator("#first .qk-html-editor")).toHaveCount(0);
});

test("formatting uses feature commands and renders the existing font and link attributes", async ({ page }, testInfo) => {
  expect(await page.evaluate(() => window.blockFixture.first.editor.chain()
    .setTextSelection({ from: 1, to: 6 })
    .toggleBold()
    .setFontSize("18pt")
    .setFontFamily("Arial")
    .setLink({ href: "https://example.com" }).run())).toBe(true);
  await testInfo.attach("format-state", {
    contentType: "application/json",
    body: JSON.stringify(await page.evaluate(() => ({
      doc: window.blockFixture.first.editor.state.doc.toJSON(),
      selection: window.blockFixture.first.editor.state.pm.selection.toJSON(),
      html: document.querySelector("#first .qk-html-editor__document")!.innerHTML
    })))
  });
  const link = page.locator("#first .qk-html-editor__document a");
  await expect(link).toHaveText("Hello");
  await expect(link).toHaveAttribute("href", "https://example.com");
  const textPaint = await link.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const text = walker.nextNode()!;
    const style = getComputedStyle(text.parentElement!);
    return { size: style.fontSize, weight: Number(style.fontWeight), family: style.fontFamily };
  });
  expect(textPaint.size).toBe("24px");
  expect(textPaint.weight).toBeGreaterThanOrEqual(600);
  expect(textPaint.family).toContain("Arial");
  expect(await page.evaluate(() => window.blockFixture.diagnostics.paginationProducts)).toBe(0);
});
