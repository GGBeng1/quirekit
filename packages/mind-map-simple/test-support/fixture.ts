import { readMindMapDocument, type MindMapNode } from "@quirekit/mind-map";
import { createSimpleMindMapEditor } from "@quirekit/mind-map-simple";
import { initializePreview, reportPreviewError } from "./preview";
import type { MindMapHarness } from "./types";
import { renderTrace } from "./render-trace";

/** @param count - Exact node count. @returns A balanced deterministic map with Chinese labels. */
function documentFixture(count: number) {
  const nodes: Array<{ id: string; text: string; collapsed: boolean; children: MindMapNode[] }> = [];
  for (let i = 0; i < count; i++) nodes.push({ id: `n${i}`, text: i === 0 ? "时间管理" : `主题 ${i} · 本周计划`, collapsed: false, children: [] });
  for (let i = 1; i < nodes.length; i++) nodes[Math.floor((i - 1) / 4)]!.children.push(nodes[i]!);
  return readMindMapDocument({ version: 1, revision: 4, layout: "mind-map", root: nodes[0] });
}

const harness: MindMapHarness = {
  editors: [], notifications: [], errors: [], document: documentFixture, trace: renderTrace,
  /** @param count - Fixture size. @param host - Container id. @param options - Overrides. @returns New instance index. */
  async mount(count = 21, host = "first", options = {}) {
    const index = harness.editors.length;
    harness.notifications[index] = 0;
    const editor = await createSimpleMindMapEditor({ container: document.getElementById(host)!, document: documentFixture(count),
      onChange: value => { harness.notifications[index] = value; },
      onError: error => { harness.errors.push(String(error)); }, ...options });
    harness.editors.push(editor);
    return index;
  },
};
window.mindMapHarness = harness;
if (!window.mindMapHarnessOnly) void initializePreview(harness).catch(reportPreviewError);
