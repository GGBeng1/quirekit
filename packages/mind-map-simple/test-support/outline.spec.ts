import { expect, test } from "./browser";

test("on-demand outline is cached across selection and viewport; hidden reveal is a single undoable change", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness; await h.mount(1000);
    const editor = h.editors[0]!;
    h.trace.start();
    const outline = editor.getOutline();
    editor.select("n2"); editor.setZoom(0.8);
    const cached = editor.getOutline() === outline;
    const trace = h.trace.read(); h.trace.stop();
    await editor.execute("collapse-all");
    const folded = editor.getOutline(), before = h.notifications[0]!;
    const revealed = await editor.reveal("n21", false);
    const unfolded = editor.getOutline();
    const changes = h.notifications[0]! - before;
    const selected = editor.getState().selectedId;
    await editor.execute("undo");
    const undone = editor.getOutline().find(entry => entry.id === "n21");
    await editor.destroy();
    let closed = false; try { editor.getOutline(); } catch { closed = true; }
    return { count: outline.length, cached, trace, folded: folded.find(entry => entry.id === "n21")?.hidden,
      revealed, hidden: unfolded.find(entry => entry.id === "n21")?.hidden, changes, selected, undone: undone?.hidden, closed };
  });
  expect(result).toMatchObject({ count: 1000, cached: true, folded: true, revealed: true, hidden: false, changes: 1, selected: "n21", undone: true, closed: true });
  expect(result.trace.sourceReads).toBe(0);
  expect(result.trace.events).toEqual([]);
});

test("readonly search includes hidden/free topics but reveals only visible nodes without changes", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness; await h.mount(21);
    const editor = h.editors[0]!;
    await editor.execute("add-free");
    await editor.execute("collapse-all");
    editor.setReadOnly(true);
    const before = h.notifications[0], outline = editor.getOutline();
    const hidden = await editor.reveal("n5"), visible = await editor.reveal("n1");
    return { hidden, visible, count: outline.length, free: outline.filter(entry => entry.free).length,
      unchanged: before === h.notifications[0], selected: editor.getState().selectedId, missing: await editor.reveal("missing") };
  });
  expect(result).toEqual({ hidden: false, visible: true, count: 22, free: 1, unchanged: true, selected: "n1", missing: false });
});
