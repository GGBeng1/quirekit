// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classicEditorFontGateAttribute, gateClassicEditorFirstPaint } from "./first-paint";

/** @returns Font set stand-in whose `ready` settles when `settle` is called. */
function loadingFonts() {
  let settle!: () => void;
  const ready = new Promise<void>(resolve => { settle = resolve; });
  const fonts = { status: "loading", ready } as unknown as FontFaceSet;
  return { fonts, settle: () => { (fonts as { status: string }).status = "loaded"; settle(); } };
}

/** @returns Frame subscription that tests trigger with `commit`. */
function frames() {
  const listeners = new Set<() => void>();
  return {
    onGeometryUpdate: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    commit: () => { for (const listener of [...listeners]) listener(); }
  };
}

describe("first-paint font gate", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("reveals right after the first frame when no font is loading", () => {
    const element = document.createElement("div");
    const view = frames();
    gateClassicEditorFirstPaint({ element, fonts: { status: "loaded" } as FontFaceSet, onGeometryUpdate: view.onGeometryUpdate });
    expect(element.getAttribute(classicEditorFontGateAttribute)).toBe("pending");
    view.commit();
    expect(element.hasAttribute(classicEditorFontGateAttribute)).toBe(false);
  });

  it("waits for loading fonts and the relayout they trigger", async () => {
    const element = document.createElement("div");
    const view = frames();
    const { fonts, settle } = loadingFonts();
    gateClassicEditorFirstPaint({ element, fonts, onGeometryUpdate: view.onGeometryUpdate });
    view.commit();
    expect(element.getAttribute(classicEditorFontGateAttribute)).toBe("pending");
    settle();
    await vi.advanceTimersByTimeAsync(0);
    expect(element.getAttribute(classicEditorFontGateAttribute)).toBe("pending");
    view.commit();
    await vi.advanceTimersByTimeAsync(0);
    expect(element.hasAttribute(classicEditorFontGateAttribute)).toBe(false);
  });

  it("reveals the fallback layout after the timeout", async () => {
    const element = document.createElement("div");
    const view = frames();
    gateClassicEditorFirstPaint({ element, fonts: loadingFonts().fonts, onGeometryUpdate: view.onGeometryUpdate, timeoutMs: 3000 });
    view.commit();
    await vi.advanceTimersByTimeAsync(2999);
    expect(element.getAttribute(classicEditorFontGateAttribute)).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(element.hasAttribute(classicEditorFontGateAttribute)).toBe(false);
  });

  it("stops touching the element once released", async () => {
    const element = document.createElement("div");
    const view = frames();
    const { fonts, settle } = loadingFonts();
    const release = gateClassicEditorFirstPaint({ element, fonts, onGeometryUpdate: view.onGeometryUpdate });
    view.commit();
    release();
    expect(element.hasAttribute(classicEditorFontGateAttribute)).toBe(false);
    element.setAttribute(classicEditorFontGateAttribute, "other");
    settle();
    view.commit();
    await vi.advanceTimersByTimeAsync(3000);
    expect(element.getAttribute(classicEditorFontGateAttribute)).toBe("other");
  });
});
