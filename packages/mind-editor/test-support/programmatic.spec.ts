import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));

test("programmatic outlines and XMind content mount, edit and reopen through the public editor", async ({ page }, info) => {
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  await page.goto("/");
  await expect(page.locator(".smm-node")).toHaveCount(14);
  const result = await page.evaluate(async base => {
    const { createMindMapDocument, parseMindMap, serializeMindMap } = await import(/* @vite-ignore */ `${base}packages/mind-map/dist/index.mjs`);
    const { parseXmindContent } = await import(/* @vite-ignore */ `${base}packages/mind-map/dist/xmind/index.mjs`);
    const { createMindEditor } = await import(/* @vite-ignore */ `${base}packages/mind-editor/src/index.ts`);
    const container = document.createElement("div");
    container.id = "programmatic-mind-map";
    Object.assign(container.style, { position: "fixed", inset: "0", zIndex: "10000", background: "#f2f5fc" });
    document.body.append(container);
    // Use the same public source contract a third-party host receives from a model.
    const generated = createMindMapDocument({ text: "AI 项目计划", children: [{ text: "用户调研", children: [] }] });
    const first = await createMindEditor({ container, document: generated });
    first.select(generated.root.id);
    await first.execute("add-child");
    const edited = await first.getDocument();
    const source = serializeMindMap(edited);
    await first.destroy();
    const reopened = await createMindEditor({ container, document: parseMindMap(source) });
    const generatedText = container.textContent;
    const reopenedCount = (await reopened.getDocument()).root.children.length;
    await reopened.destroy();
    // Import a free topic and a folded subtree; both remain editable canonical data.
    const imported = parseXmindContent([{ title: "XMind 工作计划", rootTopic: { title: "工作计划", children: {
      attached: [{ title: "发布准备", branch: "folded", children: { attached: [{ title: "验收清单" }] } }],
      detached: [{ title: "独立想法", position: { x: 250, y: 170 } }],
    } } }]);
    const editor = await createMindEditor({ container, document: imported.sheets[0].document });
    const branch = imported.sheets[0].document.root.children[0];
    editor.select(branch.id);
    await editor.execute("toggle-collapse");
    await editor.fit();
    const saved = await editor.getDocument();
    const svg = await editor.exportSvg();
    return { generatedText, reopenedCount, text: container.textContent, svg: svg.svg, snapshotMatches: svg.source === serializeMindMap(saved),
      free: saved.floatingTopics.length, collapsed: saved.root.children[0].collapsed };
  }, `/@fs${root}`);
  expect(result.generatedText).toContain("AI 项目计划");
  expect(result.reopenedCount).toBe(2);
  expect(result.text).toContain("验收清单");
  expect(result.text).toContain("独立想法");
  expect(result.free).toBe(1);
  expect(result.collapsed).toBe(false);
  expect(result.svg).toContain("验收清单");
  expect(result.snapshotMatches).toBe(true);
  expect(failures).toEqual([]);
  await page.screenshot({ path: info.outputPath("programmatic-xmind.png") });
});
