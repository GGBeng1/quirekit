// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { applySourceScrollStep, sourceScrollStep, sourceViewport } from "./viewport";

afterEach(() => { vi.restoreAllMocks(); Reflect.deleteProperty(window, "visualViewport"); document.body.replaceChildren(); });

/** @param element - Owner whose native dimensions are explicit in this fixture. @param values - Native layout/scroll metrics. */
function metrics(element: Element, values: Record<string, number>): void {
  for (const [key, value] of Object.entries(values)) Object.defineProperty(element, key, { configurable: true, value });
}

it("intersects visual offsets, nested clips and actual host margins", () => {
  const scrollDOM = document.createElement("div"); scrollDOM.style.overflowY = "auto"; scrollDOM.style.overflowX = "auto"; document.body.append(scrollDOM);
  metrics(scrollDOM, { offsetHeight: 500, clientHeight: 500, scrollHeight: 1000, offsetWidth: 300, clientWidth: 300, scrollWidth: 600, clientTop: 0, clientLeft: 0 });
  vi.spyOn(scrollDOM, "getBoundingClientRect").mockReturnValue({ top: 50, left: 20, height: 500, width: 300 } as DOMRect);
  Object.defineProperty(window, "visualViewport", { configurable: true, value: { offsetTop: 100, offsetLeft: 0, width: 393, height: 400 } });
  const state = EditorState.create({ extensions: EditorView.scrollMargins.of(() => ({ top: 30, bottom: 56 })) });
  const view = { state, scrollDOM, dom: scrollDOM } as unknown as EditorView;
  expect(sourceViewport(view)).toEqual({ top: 130, bottom: 444, left: 20, right: 320 });
});

it("scrolls the nearest scaled owner and hands off only when it reaches an edge", () => {
  const scrollDOM = document.createElement("div"); scrollDOM.style.overflowY = "auto"; document.body.append(scrollDOM);
  metrics(scrollDOM, { offsetHeight: 100, clientHeight: 100, scrollHeight: 300 });
  vi.spyOn(scrollDOM, "getBoundingClientRect").mockReturnValue({ height: 200 } as DOMRect);
  const view = { scrollDOM, dom: scrollDOM } as unknown as EditorView;
  const step = sourceScrollStep(view, 20)!;
  expect(step.owner).toBe(scrollDOM); expect(step.top).toBe(10);
  applySourceScrollStep(step); expect(scrollDOM.scrollTop).toBe(10);
  scrollDOM.scrollTop = 200;
  metrics(document.documentElement, { scrollHeight: 1200, clientHeight: 600 });
  expect(sourceScrollStep(view, 20)?.owner).toBe(window);
  expect(sourceScrollStep(view, -20)?.owner).toBe(scrollDOM);
});

it("does not treat a non-scrolling document-height auto box as an inner viewport", () => {
  const scrollDOM = document.createElement("div"); scrollDOM.style.overflowY = "auto"; document.body.append(scrollDOM);
  metrics(scrollDOM, { offsetHeight: 200, clientHeight: 200, scrollHeight: 200, clientTop: 0 });
  vi.spyOn(scrollDOM, "getBoundingClientRect").mockReturnValue({ top: 100, height: 200 } as DOMRect);
  Object.defineProperty(window, "visualViewport", { configurable: true, value: { offsetTop: 0, offsetLeft: 0, width: 393, height: 430 } });
  const state = EditorState.create({ extensions: EditorView.scrollMargins.of(() => ({ top: 20, bottom: 56 })) });
  const view = { state, scrollDOM, dom: scrollDOM } as unknown as EditorView;
  expect(sourceViewport(view)).toMatchObject({ top: 20, bottom: 374 });
});
