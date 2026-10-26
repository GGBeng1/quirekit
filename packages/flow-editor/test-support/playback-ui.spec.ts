import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { FlowchartPlaybackTrace } from "@quirekit/flowchart";
import "./types";

/** @param page - Isolated test context. @returns Public menu entry ready for interaction. */
async function open(page: Page): Promise<void> {
  await page.goto("/"); await page.getByRole("button", { name: "图表", exact: true }).click();
  await page.getByRole("menuitem", { name: "演示模式…", exact: true }).click();
  await expect(page.getByRole("button", { name: "新增步骤", exact: true })).toBeVisible();
}

test("step fields fit the side panel without horizontal scrolling in either locale", async ({ page }, info) => {
  await open(page); await page.getByRole("button", { name: "新增步骤", exact: true }).click();
  const title = "一个很长的步骤名称和说明用于检查狭窄面板".repeat(12);
  await page.getByRole("textbox", { name: "步骤标题", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "步骤说明", exact: true }).fill(title);
  for (const width of [1440, 960, 620]) for (const locale of ["zh-CN", "en"]) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(value => window.flowFixture.setLocale(value), locale);
    const geometry = await page.locator(".qk-flow-playback__scroll").evaluate(element => {
      const r = element.getBoundingClientRect(); return { width: element.clientWidth, content: element.scrollWidth,
        fields: [...element.querySelectorAll('input,textarea,[role="combobox"],button[type="submit"]')].map(control => { const b = control.getBoundingClientRect(); return { left: b.left - r.left, right: b.right - r.left, width: b.width }; }) };
    });
    expect(geometry.content, `${width}/${locale} content width`).toBeLessThanOrEqual(geometry.width + 1);
    for (const field of geometry.fields) { expect(field.left).toBeGreaterThanOrEqual(0); expect(field.right).toBeLessThanOrEqual(geometry.width + 1); expect(field.width).toBeGreaterThan(60); }
  }
  await page.screenshot({ path: info.outputPath("step-fields-narrow.png") });
});

test("consumer fixture uses current revision, generic controls preserve static PNG/SVG and history", async ({ page }, info) => {
  await open(page);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.addNode("note"); e.select([]); });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.evaluate(() => window.flowFixture.loadExample("reference"));
  await expect(page.getByRole("heading", { name: "后置引用解析", exact: true })).toBeVisible();
  await expect(page.locator(".qk-flow-playback__steps > li")).toHaveCount(8);
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const svg = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  const png = await page.evaluate(() => window.flowFixture.editor().exportPng()); expect(png).toMatch(/^data:image\/png;base64,/);
  const preview = await page.evaluate(async dataUrl => { const image = new Image(); image.src = dataUrl; await image.decode(); return { dataUrl, width: image.naturalWidth, height: image.naturalHeight }; }, png);
  await writeFile(info.outputPath("algorithm-sample.json"), JSON.stringify({ type: "quirekit-flowchart-embed", version: 1, id: "flow-playback-showcase", title: "后置引用解析", document: source, preview }, null, 2));
  const changes = await page.evaluate(() => window.flowFixture.invalidations());
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.getByText("先看完整的数据路径。这个示例使用预设步骤讲解，不是解析器的实测轨迹。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "播放演示", exact: true }).click();
  await page.getByRole("button", { name: "暂停演示", exact: true }).click();
  await expect(page.getByText("已暂停", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "播放倍速", exact: true }).click();
  await page.getByRole("option", { name: "2×", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().playback.getState().rate)).toBe(2);
  await page.getByRole("button", { name: "5 标记受影响部分" }).click();
  await expect(page.locator('[data-flow-run-target$="-affected"]')).toHaveAttribute("data-state", "invalid");
  await expect(page.locator('[data-flow-run-target$="-reused"]')).toHaveAttribute("data-state", "reused");
  const mixed = await page.evaluate(() => { const p = window.flowFixture.editor().playback, trace = p.getTrace(); p.load({ ...trace, steps: trace.steps.map((step, i) => i === 4 ? { ...step, duration: 1777 } : step) }); return trace.steps[4]!.changes; });
  await page.getByRole("button", { name: "步骤操作：标记受影响部分", exact: true }).click(); await page.getByRole("menuitem", { name: "编辑步骤", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "步骤时长", exact: true })).toContainText("1.777 秒");
  await page.getByRole("textbox", { name: "步骤说明", exact: true }).fill("用户补充说明"); await page.getByRole("button", { name: "保存步骤", exact: true }).click();
  await page.getByRole("button", { name: "5 标记受影响部分", exact: true }).click();
  const edited = await page.evaluate(() => window.flowFixture.editor().playback.getTrace().steps[4]!); expect(edited.changes).toEqual(mixed); expect(edited.duration).toBe(1777); expect(edited.effects).toBeUndefined();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  expect(await page.evaluate(() => window.flowFixture.editor().exportSvg())).toEqual(svg);
  expect(await page.evaluate(() => window.flowFixture.editor().exportPng())).toBe(png);
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(changes);
  await page.getByRole("button", { name: "重播演示", exact: true }).click(); await page.getByRole("button", { name: "暂停演示", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().playback.getState().index)).toBe(1);
  await page.getByRole("button", { name: "快捷键", exact: true }).click();
  await expect(page.getByRole("heading", { name: "演示播放", exact: true })).toBeVisible(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "退出演示", exact: true }).click();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.screenshot({ path: info.outputPath("restored-source.png") });
});

test("step drafts keep captured IDs, contextual reorder and bilingual labels do not rewrite user text", async ({ page }) => {
  await open(page);
  await page.getByRole("combobox", { name: "表现方式", exact: true }).click(); await page.getByRole("option", { name: "状态高亮", exact: true }).click();
  const ids = await page.evaluate(() => { const e = window.flowFixture.editor(); e.select([]); e.addNode("process"); const a = e.getState().selectedIds[0]!; e.addNode("decision"); const b = e.getState().selectedIds[0]!; e.select([a]); return [a, b]; });
  await page.getByRole("button", { name: "新增步骤", exact: true }).click(); await page.getByRole("button", { name: "使用当前选择", exact: true }).click();
  await page.getByRole("textbox", { name: "步骤标题", exact: true }).fill("用户的解析步骤");
  await page.evaluate(id => window.flowFixture.editor().select([id]), ids[1]!);
  await page.getByRole("button", { name: "添加步骤", exact: true }).click(); await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.locator(`[data-flow-run-target="${ids[0]}"]`)).toHaveAttribute("data-state", "running");
  await expect(page.locator(`[data-flow-run-target="${ids[1]}"]`)).toHaveCount(0);
  await page.getByRole("button", { name: "新增步骤", exact: true }).click(); await page.getByRole("button", { name: "使用当前选择", exact: true }).click();
  await page.getByRole("textbox", { name: "步骤标题", exact: true }).fill("第二步"); await page.getByRole("button", { name: "添加步骤", exact: true }).click();
  await page.getByRole("button", { name: "步骤操作：第二步", exact: true }).click(); await page.getByRole("menuitem", { name: "步骤上移", exact: true }).click();
  await expect(page.locator(".qk-flow-playback__step-title")).toHaveText(["第二步", "用户的解析步骤"]);
  await page.evaluate(() => window.flowFixture.setLocale("en"));
  await expect(page.getByRole("button", { name: "New step", exact: true })).toBeVisible();
  await expect(page.locator(".qk-flow-playback__step-title")).toHaveText(["第二步", "用户的解析步骤"]);
  await page.getByRole("button", { name: "Step actions: 第二步", exact: true }).click(); await page.getByRole("menuitem", { name: "Remove step", exact: true }).click();
  await expect(page.locator(".qk-flow-playback__step-title")).toHaveText(["用户的解析步骤"]);
});

test("live records are read on demand and presentation-only consumer mounts without authoring controls", async ({ page }) => {
  await open(page);
  const trace: FlowchartPlaybackTrace = { title: "Live run", steps: [] };
  const counts = await page.evaluate(async value => {
    const e = window.flowFixture.editor(), id = (await e.getDocument()).nodes[0]!.id, p = e.playback, read = p.getTrace;
    let reads = 0; p.getTrace = () => { reads++; return read(); };
    const feed = p.beginLive(value.title); p.pause();
    for (let i = 0; i < 60; i++) feed.append({ id: `event-${i}`, title: `Event ${i}`, duration: 60000, changes: [{ id, state: "running" }] });
    feed.finish(); return reads;
  }, trace);
  expect(counts).toBe(0); await expect(page.getByText("0 / 60 步", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "查看执行记录", exact: true }).click(); await expect(page.locator(".qk-flow-playback__steps > li")).toHaveCount(40);
  await page.getByRole("button", { name: "下一页步骤", exact: true }).click(); await expect(page.locator(".qk-flow-playback__steps > li")).toHaveCount(20);
  await page.getByRole("button", { name: "下一步", exact: true }).click(); await expect(page.getByRole("heading", { name: "Event 0", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "退出演示", exact: true }).click();
  await page.evaluate(async () => {
    const document = await window.flowFixture.editor().getDocument(), id = document.nodes[0]!.id;
    const consumer = await window.flowFixture.mountPresentation(document, { title: "Host sequence", steps: [{ id: "one", title: "Host-authored step", changes: [{ id, state: "completed" }] }] });
    consumer.playback.step();
  });
  const consumer = page.locator("[data-presentation-consumer]");
  await expect(consumer.getByRole("heading", { name: "Host-authored step", exact: true })).toBeVisible();
  await expect(consumer.getByRole("toolbar", { name: "Diagram toolbar", exact: true })).toHaveCount(0);
  await expect(consumer.getByRole("button", { name: "New step", exact: true })).toHaveCount(0);
  await expect(consumer.getByRole("button", { name: "Load algorithm example", exact: true })).toHaveCount(0);
  await page.evaluate(() => window.flowFixture.disposePresentation()); await expect(consumer).toHaveCount(0);
});
