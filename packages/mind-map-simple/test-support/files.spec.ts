import { expect, test } from "./browser";

test("complete document replacement is one undo step and never adopts an imported host revision", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness, e = h.editors[0]!;
    e.select("n1"); await e.format({ bold: true, fill: "#eef2ff" }); await e.setDetails({ note: "原始备注", marker: "priority-1" });
    await e.putAnnotation({ id: "relation", kind: "relation", from: "n1", to: "n2", text: "原始关系" });
    await e.execute("add-free");
    const before = await e.getDocument();
    // Reopen the richest source as the host baseline before applying older content.
    const index = await h.mount(1, "second", { document: before }); const reopened = h.editors[index]!;
    const count = h.notifications[index]!;
    const imported = { version: 2 as const, revision: 999, layout: "logical-left" as const,
      root: { id: "imported-root", text: "新画布", collapsed: false, children: [] }, floatingTopics: [] };
    await reopened.replaceDocument(imported); const replaced = await reopened.getDocument(), writes = h.notifications[index]! - count;
    await reopened.replaceDocument(imported); const unchanged = h.notifications[index]! - count;
    await reopened.execute("undo"); const restored = await reopened.getDocument();
    await reopened.execute("redo");
    return { before, replaced, writes, unchanged, restored, redone: await reopened.getDocument() };
  });
  expect(result.writes).toBe(1); expect(result.unchanged).toBe(1);
  expect(result.replaced.version).toBe(2); expect(result.replaced.revision).toBe(4);
  expect(result.replaced.root.text).toBe("新画布"); expect(result.replaced.annotations).toBeUndefined();
  expect(result.restored).toEqual(result.before); expect(result.redone).toEqual(result.replaced);
});

test("replacement rejects malformed source, composing input, and readonly without changing the draft", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const e = window.mindMapHarness.editors[0]!, source = await e.getDocument(); let rejected = 0;
    const replacement = { ...source, root: { ...source.root, text: "外部内容" } };
    try { await e.replaceDocument({ ...replacement, version: 99 as 1 }); } catch { rejected++; }
    const surface = document.querySelector("#first [data-quirekit-mind-map]")!;
    surface.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    try { await e.replaceDocument(replacement); } catch { rejected++; }
    surface.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    e.setReadOnly(true); try { await e.replaceDocument(replacement); } catch { rejected++; }
    return { rejected, source, after: await e.getDocument() };
  });
  expect(result.rejected).toBe(3); expect(result.after).toEqual(result.source);
});

test("permission is rechecked after imported image decoding before publishing", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const e = window.mindMapHarness.editors[0]!, before = await e.getDocument();
    const canvas = document.createElement("canvas"); canvas.width = 10; canvas.height = 10;
    const source = { ...before, version: 5 as const, floatingTopics: [], annotations: [], root: { ...before.root,
      details: { image: { dataUrl: canvas.toDataURL(), width: 10, height: 10, alt: "导入图片" } } } };
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () { await decode.call(this); e.setReadOnly(true); };
    let rejected = false;
    try { await e.replaceDocument(source); } catch { rejected = true; }
    finally { HTMLImageElement.prototype.decode = decode; }
    return { rejected, before, after: await e.getDocument() };
  });
  expect(result.rejected).toBe(true); expect(result.after).toEqual(result.before);
});
