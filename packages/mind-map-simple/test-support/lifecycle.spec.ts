import { expect, test } from "./browser";
import type {} from "./types";

test("repeated disposal drains pending edits and restores global listener ownership", async ({ page }) => {
  await page.addInitScript({ content: `
    const owned = new Map();
    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (this === window || this === document || this === document.body) {
        const key = (this === window ? 'window' : this === document ? 'document' : 'body') + ':' + type;
        if (!owned.has(key)) owned.set(key, new Set());
        owned.get(key).add(listener);
      }
      return originalAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      const key = (this === window ? 'window' : this === document ? 'document' : 'body') + ':' + type;
      owned.get(key)?.delete(listener);
      return originalRemove.call(this, type, listener, options);
    };
    window.listenerCounts = () => Object.fromEntries([...owned].filter(([,set]) => set.size).map(([key,set]) => [key,set.size]));
  ` });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  // Warm up svg.js's shared measurement node; compare per-instance resources thereafter.
  await page.evaluate(async () => { const h = window.mindMapHarness; await h.mount(); await h.editors[0]!.destroy(); });
  const baseline = await page.evaluate("window.listenerCounts()");
  const styles = await page.locator("head style").count();
  await page.evaluate(async () => {
    const sentinel = document.createElement("span"); sentinel.id = "host-owned";
    document.getElementById("first")!.append(sentinel);
    for (let i = 0; i < 5; i++) {
      const h = window.mindMapHarness; const index = await h.mount(); const editor = h.editors[index]!;
      editor.select("n0");
      const edit = editor.execute("add-child").catch(() => undefined);
      const first = editor.destroy();
      if (first !== editor.destroy()) throw new Error("Disposal promise changed");
      await Promise.all([edit, first]);
      await editor.destroy();
    }
  });
  expect(await page.evaluate("window.listenerCounts()")).toEqual(baseline);
  await expect(page.locator("[data-quirekit-mind-map],[contenteditable]" )).toHaveCount(0);
  await expect(page.locator("#host-owned")).toHaveCount(1);
  expect(await page.locator("head style").count()).toBe(styles);
  // Run a browser task turn after disposal so pending upstream history timers can fire.
  await page.locator("#outside").fill("销毁后继续编辑"); await page.keyboard.press("Enter");
  expect(errors).toEqual([]);
});

test("abort during mount and snapshot prevents publication and removes owned DOM", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness;
    const loading = new AbortController();
    const mount = h.mount(500, "first", { signal: loading.signal });
    loading.abort();
    let mountRejected = false; try { await mount; } catch { mountRejected = true; }
    const life = new AbortController();
    const index = await h.mount(100, "first", { signal: life.signal });
    const editor = h.editors[index]!;
    const pending = editor.exportSvg(); life.abort();
    let snapshotRejected = false; try { await pending; } catch { snapshotRejected = true; }
    await editor.destroy();
    return { mountRejected, snapshotRejected };
  });
  expect(result).toEqual({ mountRejected: true, snapshotRejected: true });
  await expect(page.locator("[data-quirekit-mind-map]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("invalid, detached and zero-size mounts leave host content intact", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  expect(await page.evaluate(async () => {
    const h = window.mindMapHarness; let rejected = 0;
    const detached = document.createElement("div");
    try { await h.mount(1, "first", { container: detached }); } catch { rejected++; }
    // A border can make the outer rect positive while the actual mount is still zero-height.
    const target = document.getElementById("first")!; target.style.height = "0";
    try { await h.mount(1); } catch { rejected++; }
    return rejected;
  })).toBe(2);
  await expect(page.locator("[data-quirekit-mind-map]")).toHaveCount(0);
});

test("abort after allocating DOM waits for the active initial layout", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  expect(await page.evaluate(async () => {
    const controller = new AbortController();
    const observer = new MutationObserver(() => {
      if (document.querySelector("[data-quirekit-mind-map]")) { observer.disconnect(); controller.abort(); }
    });
    observer.observe(document.getElementById("first")!, { childList: true });
    try { await window.mindMapHarness.mount(500, "first", { signal: controller.signal }); return false; }
    catch { return true; }
    finally { observer.disconnect(); }
  })).toBe(true);
  await expect(page.locator("[data-quirekit-mind-map]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
