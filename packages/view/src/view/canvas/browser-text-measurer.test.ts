import { describe, expect, it, vi } from "vitest";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { createCanvasBrowserTextMeasurer } from "./browser-text-measurer";

describe("Canvas browser text measurer", () => {
  it("measures and caches exact browser Canvas metrics", () => {
    const measureText = vi.fn(() => ({
      width: 24,
      fontBoundingBoxAscent: 9,
      fontBoundingBoxDescent: 3
    }));
    const context = { font: "", measureText } as unknown as CanvasRenderingContext2D;
    const ownerDocument = createMeasurementDocument(context);
    const measurer = createCanvasBrowserTextMeasurer({ ownerDocument });

    expect(measurer.measureText("abc", "12px sans-serif")).toEqual({
      width: 24,
      ascent: 9,
      descent: 3
    });
    expect(measurer.measureText("abc", "12px sans-serif")).toEqual({
      width: 24,
      ascent: 9,
      descent: 3
    });
    expect(measureText).toHaveBeenCalledTimes(1);
  });

  it("measures and caches the browser normal line height for each font", () => {
    const measureText = vi.fn(() => ({
      width: 24,
      fontBoundingBoxAscent: 9,
      fontBoundingBoxDescent: 3
    }));
    const context = { font: "", measureText } as unknown as CanvasRenderingContext2D;
    const normalLineHeightSamples: string[] = [];
    const ownerDocument = createMeasurementDocument(
      context,
      undefined,
      15,
      normalLineHeightSamples
    );
    const measurer = createCanvasBrowserTextMeasurer({ ownerDocument });

    expect(measurer.measureText("abc", "12px sans-serif")).toEqual({
      width: 24,
      ascent: 9,
      descent: 3,
      lineHeight: 15
    });
    expect(measurer.measureText("def", "12px sans-serif").lineHeight).toBe(15);
    expect(measurer.measureText("中文", "12px sans-serif").lineHeight).toBe(15);
    expect(measurer.measureText("汉字", "12px sans-serif").lineHeight).toBe(15);
    expect(normalLineHeightSamples).toEqual(["Hg", "田"]);
    expect(ownerDocument.body.childElementCount).toBe(0);
  });

  it("uses the injected fallback when exact browser measurement is unavailable", () => {
    const fallback: QuireTextMeasurer = {
      measureText: vi.fn(() => ({ width: 17 }))
    };
    const measurer = createCanvasBrowserTextMeasurer({
      ownerDocument: createMeasurementDocument(null),
      fallbackMeasurer: fallback
    });

    expect(measurer.measureText("abc", "12px sans-serif")).toEqual({ width: 17 });
    expect(fallback.measureText).toHaveBeenCalledWith("abc", "12px sans-serif");
  });

  it("invalidates cached fallback widths after the document font set changes", () => {
    let width = 24;
    const measureText = vi.fn(() => ({ width }));
    const context = { font: "", measureText } as unknown as CanvasRenderingContext2D;
    const fontSet = new FakeFontFaceSet();
    const onFontSetChange = vi.fn();
    const measurer = createCanvasBrowserTextMeasurer({
      ownerDocument: createMeasurementDocument(
        context,
        fontSet as unknown as FontFaceSet
      ),
      onFontSetChange
    });

    expect(measurer.measureText("abc", "12px Carlito").width).toBe(24);
    expect(measurer.version).toBe(0);
    width = 21;
    measurer.invalidate();

    expect(measurer.version).toBe(1);
    expect(onFontSetChange).toHaveBeenCalledTimes(1);
    expect(measurer.measureText("abc", "12px Carlito").width).toBe(21);
    expect(measureText).toHaveBeenCalledTimes(2);

    width = 19;
    fontSet.dispatch("loadingdone");
    expect(measurer.version).toBe(2);
    expect(measurer.measureText("abc", "12px Carlito").width).toBe(19);

    measurer.destroy();
    fontSet.dispatch("loadingdone");
    expect(measurer.version).toBe(2);
  });

  it("keeps measurements on a conditional refresh until the loaded font set changes", () => {
    const measureText = vi.fn(() => ({ width: 24 }));
    const context = { font: "", measureText } as unknown as CanvasRenderingContext2D;
    const fontSet = new FakeFontFaceSet();
    fontSet.faces.push({ status: "loaded" });
    const onFontSetChange = vi.fn();
    const measurer = createCanvasBrowserTextMeasurer({
      ownerDocument: createMeasurementDocument(context, fontSet as unknown as FontFaceSet),
      onFontSetChange
    });

    measurer.measureText("abc", "12px Carlito");
    measurer.invalidateIfFontSetChanged();
    measurer.measureText("abc", "12px Carlito");
    expect(measurer.version).toBe(0);
    expect(onFontSetChange).not.toHaveBeenCalled();
    expect(measureText).toHaveBeenCalledTimes(1);

    // A face added already loaded fires no loading event.
    fontSet.faces.push({ status: "loaded" });
    measurer.invalidateIfFontSetChanged();
    expect(measurer.version).toBe(1);
    measurer.measureText("abc", "12px Carlito");
    expect(measureText).toHaveBeenCalledTimes(2);

    fontSet.faces.push({ status: "loaded" });
    fontSet.dispatch("loadingdone");
    measurer.invalidateIfFontSetChanged();
    expect(measurer.version).toBe(2);
  });
});

/**
 * Creates a minimal document that owns one detached measurement Canvas.
 *
 * @param context - Canvas context returned by the detached surface.
 * @param fonts - Optional fake document font set.
 * @param normalLineHeight - Height returned by the normal-line probe.
 * @param normalLineHeightSamples - Optional sink for normal-line probe text.
 * @returns Document-like browser capability for the measurer.
 */
function createMeasurementDocument(
  context: CanvasRenderingContext2D | null,
  fonts?: FontFaceSet,
  normalLineHeight?: number,
  normalLineHeightSamples?: string[]
): Document {
  const children: unknown[] = [];
  const body = {
    get childElementCount() {
      return children.length;
    },
    appendChild(child: unknown) {
      children.push(child);
      return child;
    }
  };

  return {
    fonts,
    body,
    documentElement: body,
    createElement: (tagName: string) => {
      if (tagName === "canvas") return { getContext: () => context };

      const probe = {
        style: {},
        textContent: "",
        getBoundingClientRect: () => {
          normalLineHeightSamples?.push(probe.textContent);
          return { height: normalLineHeight ?? 0 };
        },
        remove: () => {
          children.splice(0, children.length);
        }
      };
      return probe;
    }
  } as unknown as Document;
}

/** Minimal FontFaceSet event source used by cache invalidation tests. */
class FakeFontFaceSet {
  private readonly listeners = new Map<string, Set<() => void>>();
  /** Faces registered in the set. */
  readonly faces: { status: string }[] = [];

  /** @returns Registered faces in insertion order. */
  [Symbol.iterator](): IterableIterator<{ status: string }> {
    return this.faces[Symbol.iterator]();
  }

  /**
   * Registers a font loading listener.
   *
   * @param type - FontFaceSet event type.
   * @param listener - Listener invoked for the event.
   */
  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  /**
   * Removes a font loading listener.
   *
   * @param type - FontFaceSet event type.
   * @param listener - Previously registered listener.
   */
  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * Dispatches a fake FontFaceSet event.
   *
   * @param type - FontFaceSet event type to dispatch.
   */
  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}
