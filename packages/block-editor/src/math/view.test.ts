// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import type { NodeViewRenderer, QuireNodeViewRendererProps } from "@quirekit/core";
import type { MathFormulaLayout } from "@quirekit/math";
import { createBlockEditor } from "../runtime/create";
import { renderBlockMath } from "./view";

const renderer = vi.hoisted(() => ({ render: vi.fn(), release: vi.fn() }));
vi.mock("./renderer", () => ({ acquireBlockMathRenderer: () => renderer }));

it("does no layout work for unchanged atoms and ignores stale results after updates or unmount", async () => {
  const pending: ((layout: MathFormulaLayout) => void)[] = [];
  renderer.render.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const instance = createBlockEditor(), type = instance.editor.state.schema.nodes.inlineMath!, node = type.create({ latex: "x" });
  const view = renderBlockMath({ editor: instance.editor, node, getPos: () => 1, view: { dom: document.createElement("div") } } as unknown as QuireNodeViewRendererProps) as ReturnType<NodeViewRenderer>;
  const root = view.dom as HTMLElement;
  /** @param value - Formula projection marker. @returns A small baseline-aware backend result. */
  const layout = (value: string): MathFormulaLayout => ({ svg: `<svg data-value="${value}"></svg>`, width: 2, height: 1.5, baseline: 1, slots: [] });
  for (let i = 0; i < 30; i++) view.update!(node, [], undefined as never);
  expect(renderer.render).toHaveBeenCalledTimes(1);
  view.update!(type.create({ latex: "y" }), [], undefined as never);
  pending[1]!(layout("y")); await Promise.resolve();
  const svg = root.querySelector("svg");
  expect(root.style.verticalAlign).toBe("-0.5em");
  pending[0]!(layout("x")); await Promise.resolve();
  expect(root.querySelector("svg")).toBe(svg);
  view.update!(type.create({ latex: "z" }), [], undefined as never);
  view.destroy?.(); pending[2]!(layout("z")); await Promise.resolve();
  expect(root.querySelector("svg")).toBeNull();
  expect(renderer.release).toHaveBeenCalledOnce(); instance.destroy();
});
