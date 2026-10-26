import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const browser = await chromium.launch();
try {
  // A fresh context renders the canonical example without touching the user's draft.
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  await page.goto("http://127.0.0.1:8993/");
  const sample = await page.evaluate(async base => {
    const { createMindMapTemplate, createMindMapEmbed, prepareMindMapSave, formatMindMapTopics, putMindMapAnnotation, setMindMapTopicDetails } = await import(`${base}packages/mind-map/src/index.ts`);
    const { createMindEditor } = await import(`${base}packages/mind-editor/src/index.ts`);
    const { rasterizeMindMap } = await import(`${base}packages/mind-editor/src/runtime/raster.ts`);
    const document = createMindMapTemplate("project");
    const source = { ...document, floatingTopics: [{ root: { id: "free-idea", text: "待讨论的想法", collapsed: false, children: [] },
      position: { x: 50, y: 260 }, side: "right" }] };
    const container = window.document.createElement("div");
    container.style.cssText = "position:fixed;inset:0;z-index:10000;background:white";
    window.document.body.append(container);
    const styled = formatMindMapTopics(source, [source.root.children[0].id], {
      bold: true, fontSize: 18, shape: "rounded", fill: "#eef2ff", color: "#243a87", borderColor: "#4855ec", lineColor: "#4855ec", lineWidth: 2,
    });
    const [goals, work, review] = source.root.children;
    let annotated = putMindMapAnnotation(styled, { id: "goal-review", kind: "relation", from: goals.id, to: review.id, text: "检验目标" });
    annotated = putMindMapAnnotation(annotated, { id: "goal-summary", kind: "summary", topicIds: goals.children.map(topic => topic.id), text: "明确方向" });
    annotated = putMindMapAnnotation(annotated, { id: "work-boundary", kind: "boundary", topicIds: [work.id], text: "协作阶段" });
    let detailed = setMindMapTopicDetails(annotated, [goals.children[0].id], { marker: "priority-1", link: "https://example.com/requirements",
      note: "先确认用户需要解决的问题，再整理验收标准。示例链接可替换为项目资料地址。" });
    const drawing = window.document.createElement("canvas"); drawing.width = 240; drawing.height = 80;
    const context = drawing.getContext("2d"); context.fillStyle = "#eef2ff"; context.fillRect(0, 0, 240, 80);
    context.strokeStyle = "#4855ec"; context.lineWidth = 2; context.beginPath(); context.moveTo(35, 40); context.lineTo(205, 40); context.stroke();
    for (const x of [35, 120, 205]) { context.fillStyle = "#4855ec"; context.beginPath(); context.arc(x, 40, 12, 0, Math.PI * 2); context.fill(); }
    detailed = setMindMapTopicDetails(detailed, ["free-idea"], { image: { dataUrl: drawing.toDataURL(), width: 180, height: 60, alt: "推进过程示意" } });
    const editor = await createMindEditor({ container, document: detailed });
    const image = await rasterizeMindMap(await editor.exportSvg(), window.document, "#ffffff");
    await editor.destroy(); container.remove();
    return prepareMindMapSave(createMindMapEmbed("showcase-mind-map", "项目推进思维导图"), image);
  }, `/@fs${root}`);
  const output = new URL("../../../apps/classic-editor-demo/src/showcase/mind-map/", import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL("sample.json", output), `${JSON.stringify(sample, null, 2)}\n`);
  console.log("Created editable mind map example and its matching PNG.");
} finally { await browser.close(); }
