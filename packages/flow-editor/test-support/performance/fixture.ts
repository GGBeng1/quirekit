import type { Page } from "@playwright/test";
import { flowchartSvgImage, type FlowchartEdge } from "@quirekit/flowchart";
import type {} from "../types";

/** @param page - Ready isolated workspace. @param count - Connected grid size. @returns Actual canonical-mount time; image/text source remains fully real. */
export async function mountSmartGraph(page: Page, count: number): Promise<number> {
  const image = flowchartSvgImage('<svg viewBox="0 0 300 180"><rect width="300" height="180" fill="#c7d2fe"/><circle cx="150" cy="90" r="70" fill="#4f46e5"/></svg>');
  return page.evaluate(({ count, image }) => {
    const editor = window.flowFixture.editor();
    const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${i}`, shape: "process" as const, text: `节点 ${i}`, x: (i % 20) * 240, y: Math.floor(i / 20) * 130, width: 120, height: 60, style: {} }));
    const edges: FlowchartEdge[] = nodes.slice(1).flatMap((node, i) => (i + 1) % 20 ? [{ id: `e${i}`, source: { node: `n${i}`, port: "right" as const }, target: { node: node.id, port: "left" as const }, vertices: [], routing: "orthogonal" as const, label: "", labelPosition: .5, style: {} }] : []);
    edges.push({ id: "manual", source: { node: "n1", port: "right" }, target: { node: "n2", port: "left" }, vertices: [{ x: 420, y: -50 }, { x: 440, y: -50 }], routing: "orthogonal", label: "", labelPosition: .5, style: {} });
    const source = { format: "quirekit-flowchart" as const, version: 1 as const, revision: 0, nodes: nodes.map((node, i) => i === 0
      ? { ...node, shape: "image" as const, text: "", image: { ...image, crop: { top: .1, right: .2, bottom: .1, left: .2 }, fit: "cover" as const, lockAspectRatio: true } }
      : i === 1 ? { ...node, textSpans: [{ from: 0, to: 2, italic: true, underline: true, strike: true }] } : node), edges };
    const start = performance.now(); editor.replaceDocument(source); editor.fit(); return Math.round(performance.now() - start);
  }, { count, image });
}
