import { expect, it, vi } from "vitest";
import { createFlowchartNode } from "@quirekit/flowchart";
import type { FlowRuntime, FlowTextInput } from "../types";
import { setFlowLocale } from "../locale/controls";
import { mountOverview } from "./overview";
vi.mock("../../codec/read", () => ({ readNode: vi.fn(cell => cell.source) }));
import { readNode } from "../../codec/read";

// SVG layout and hit coordinates are verified in real browsers. This bounded
// element fixture counts source reads independently of rendering speed.
/** @returns An owned element with just the lifecycle used by the overview. */
function element() {
  return { style: {}, setAttribute: vi.fn(), append: vi.fn(), remove: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
}
for (const size of [100, 500, 1000]) it(`updates one outline among ${size} nodes and no source on viewport changes`, () => {
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String(i), source: createFlowchartNode(String(i), "process", { x: i * 100, y: 0 }, String(i)), isNode: () => true }));
  const listeners = new Map<string, (event: unknown) => void>(), enumerate = vi.fn(() => nodes);
  const runtime = { locale: "zh-CN", localeListeners: new Set<() => void>(), dragging: true, graph: { getNodes: enumerate, model: { hasActiveBatch: () => false }, getGraphArea: () => ({ x: 0, y: 0, width: 500, height: 300 }),
    on: (name: string, callback: (event: unknown) => void) => listeners.set(name, callback), off: (name: string) => listeners.delete(name) } } as unknown as FlowRuntime;
  const mount = { ...element(), ownerDocument: { createElementNS: () => element() } } as unknown as HTMLElement;
  vi.mocked(readNode).mockClear(); const stop = mountOverview(runtime, {} as FlowTextInput, mount);
  expect(readNode).toHaveBeenCalledTimes(size); expect(enumerate).toHaveBeenCalledTimes(1); vi.mocked(readNode).mockClear(); enumerate.mockClear();
  for (let step = 0; step < 5; step++) { nodes[0]!.source = { ...nodes[0]!.source, x: step }; listeners.get("cell:change:*")!({ cell: nodes[0], key: "position", options: {} }); }
  expect(readNode).toHaveBeenCalledTimes(5); expect(enumerate).not.toHaveBeenCalled(); vi.mocked(readNode).mockClear();
  for (const name of ["scale", "translate", "resize", "batch:stop"]) listeners.get(name)!(undefined);
  expect(readNode).not.toHaveBeenCalled(); expect(enumerate).not.toHaveBeenCalled();
  listeners.get("cell:change:*")!({ cell: nodes[0], key: "data", options: { qkDerived: true } }); expect(readNode).not.toHaveBeenCalled();
  setFlowLocale(runtime, "en");
  expect(readNode).not.toHaveBeenCalled(); expect(enumerate).not.toHaveBeenCalled();
  stop(); expect(listeners.size).toBe(0); expect(runtime.localeListeners.size).toBe(0);
});
