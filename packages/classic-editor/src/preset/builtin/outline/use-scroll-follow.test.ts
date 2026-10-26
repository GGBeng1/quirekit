// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { useClassicEditorOutlineHostVisible } from "./use-host-visible";
import { useClassicEditorOutlineScrollFollow } from "./use-scroll-follow";

const observers: Array<(entries: { contentRect: { width: number; height: number } }[]) => void> = [];
afterEach(() => { observers.length = 0; vi.unstubAllGlobals(); });

it("defers heading tracking while the outline host is collapsed and resolves it when shown", () => {
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: (entries: { contentRect: { width: number; height: number } }[]) => void) { observers.push(callback); }
    observe(): void {}
    disconnect(): void {}
  });
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  /** Runs queued animation frames. */
  const flush = (): void => { for (const callback of frames.splice(0)) callback(0); };
  const scroller = document.createElement("div");
  const dom = document.createElement("div");
  scroller.appendChild(dom);
  document.body.appendChild(scroller);
  const coordsAtPos = vi.fn((position: number) => ({ top: position }));
  const editor = shallowRef({ view: { dom, coordsAtPos } } as unknown as ClassicEditorRenderContext["editor"]);
  const anchors = shallowRef([{ id: "a", position: 0 }, { id: "b", position: 500 }]);
  const activate = vi.fn();
  const host = document.createElement("div");
  const app = createApp(defineComponent({ setup() {
    useClassicEditorOutlineScrollFollow(editor, anchors, activate, useClassicEditorOutlineHostVisible());
    return () => h("div");
  } }));
  app.mount(host);
  flush();
  const settled = activate.mock.calls.length;

  observers[0]!([{ contentRect: { width: 0, height: 0 } }]);
  coordsAtPos.mockClear();
  scroller.dispatchEvent(new Event("scroll"));
  scroller.dispatchEvent(new Event("scroll"));
  flush();
  expect(coordsAtPos).not.toHaveBeenCalled();
  expect(activate).toHaveBeenCalledTimes(settled);

  observers[0]!([{ contentRect: { width: 240, height: 600 } }]);
  flush();
  expect(coordsAtPos).toHaveBeenCalled();
  expect(activate).toHaveBeenCalledTimes(settled + 1);
  app.unmount();
  scroller.remove();
});

it("re-resolves the highlight once after a burst of heading moves", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", undefined);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  const dom = document.createElement("div");
  document.body.appendChild(dom);
  const coordsAtPos = vi.fn((position: number) => ({ top: position }));
  const editor = shallowRef({ view: { dom, coordsAtPos } } as unknown as ClassicEditorRenderContext["editor"]);
  const anchors = shallowRef([{ id: "a", position: 0 }, { id: "b", position: 500 }]);
  const app = createApp(defineComponent({ setup() {
    useClassicEditorOutlineScrollFollow(editor, anchors, () => {}, useClassicEditorOutlineHostVisible());
    return () => h("div");
  } }));
  app.mount(document.createElement("div"));
  for (const callback of frames.splice(0)) callback(0);
  coordsAtPos.mockClear();

  for (let shift = 1; shift <= 5; shift += 1) {
    anchors.value = [{ id: "a", position: shift }, { id: "b", position: 500 + shift }];
    await nextTick();
  }
  expect(frames).toHaveLength(0);
  vi.advanceTimersByTime(400);
  expect(frames).toHaveLength(1);
  for (const callback of frames.splice(0)) callback(0);
  expect(coordsAtPos).toHaveBeenCalled();
  app.unmount();
  dom.remove();
  vi.useRealTimers();
});
