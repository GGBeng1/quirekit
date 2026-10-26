import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { mountSmartGraph } from "./performance/fixture";
import { observeWork, observedWork } from "./performance/observer";
import "./types";

test("100/500/1000 graphs update only two running overlays without full reads or image work", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "画布缩略图", exact: true }).click(); await page.getByRole("button", { name: "查找图形", exact: true }).click();
  const evidence = [];
  for (const count of [100, 500, 1000]) {
    await page.evaluate(() => window.flowFixture.editor().playback.close()); const mountMs = await mountSmartGraph(page, count);
    await expect(page.locator("[data-overview-node]")).toHaveCount(count);
    await observeWork(page);
    const frames = await page.evaluate(async () => {
      const e = window.flowFixture.editor(), player = e.playback; let semantic = 0, images = 0, traceReads = 0;
      const read = player.getTrace; player.getTrace = () => { traceReads++; return read(); };
      const off = player.subscribe(() => semantic++);
      const observer = new MutationObserver(records => { images += records.filter(record => (record.target as Element).closest('.x6-node[data-cell-id="n0"]')).length; });
      observer.observe(document.querySelector(".qk-flow-editor__surface")!, { subtree: true, attributes: true });
      player.load({ title: "Scale run", steps: [{ id: "one", title: "Only active paths", duration: 60000, changes: [{ id: "e0", state: "running" }, { id: "e1", state: "running" }, { id: "n3", state: "reused" }] }] });
      player.play();
      // Observe settled frames: semantic entry/step work is counted separately;
      // the animation itself must leave source geometry and resources untouched.
      await new Promise(requestAnimationFrame); images = semantic = traceReads = 0;
      const phases = [];
      for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); phases.push(document.querySelector('[data-flow-run-edge="e0"]')!.getAttribute("stroke-dashoffset")); }
      const result = { semantic, images, traceReads, phases, running: document.querySelectorAll("[data-flow-run-edge]").length };
      observer.disconnect(); off(); player.getTrace = read; player.pause(); return result;
    });
    expect(new Set(frames.phases).size).toBeGreaterThan(4); expect(frames).toMatchObject({ semantic: 0, images: 0, traceReads: 0, running: 2 });
    const work = await observedWork(page); expect(work).toEqual({ sourceReads: 0, serializations: 0, searches: 0, paths: {}, overview: [] });
    evidence.push({ count, mountMs, ...frames, work }); await page.evaluate(() => window.flowWorkProbe?.restore());
  }
  await writeFile(info.outputPath("playback-work.json"), JSON.stringify(evidence, null, 2));
});

test("reduced-motion dark narrow panel preserves explanations and hiding pauses the logical run", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.setViewportSize({ width: 780, height: 850 });
  await page.goto("/"); await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "演示模式…", exact: true }).click();
  await page.evaluate(() => window.flowFixture.loadExample("reference")); await page.getByRole("button", { name: "切换明暗主题", exact: true }).click();
  await page.getByRole("button", { name: "2 新片段进入", exact: true }).click(); await page.getByRole("button", { name: "播放演示", exact: true }).click();
  await expect(page.getByText("已按系统偏好减少动效，状态与步骤仍可查看。", { exact: true })).toBeVisible();
  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector(".qk-flow-editor__canvas")!.getBoundingClientRect(), panel = document.querySelector(".qk-flow-playback")!.getBoundingClientRect();
    return { bottom: canvas.bottom, top: panel.top, width: panel.width, viewport: innerWidth };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.bottom - 1); expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
  await page.screenshot({ path: info.outputPath("dark-narrow-reduced.png") });
  // This verifies the page-visibility handler contract, not native tab switching.
  const state = await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange"));
    const result = window.flowFixture.editor().playback.getState(); delete (document as unknown as { hidden?: boolean }).hidden; return result;
  });
  expect(state.status).toBe("paused");
});
