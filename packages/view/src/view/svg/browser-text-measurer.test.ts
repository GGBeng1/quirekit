import { describe, expect, it } from "vitest";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { createSvgBrowserTextMeasurer } from "./browser-text-measurer";

describe("SVG browser text measurer", () => {
  it("avoids accumulating coarse SVG device rounding without changing the source font", () => {
    const ownerDocument = new FakeBrowserTextMeasurerDocument();
    const measurer = createSvgBrowserTextMeasurer({ ownerDocument: ownerDocument as unknown as Document });
    const probe = ownerDocument.lastTextElement!;
    probe.pixelsPerCharacter = 21.333333;
    probe.deviceQuantum = 1 / 64;
    const width = measurer.measureText("甲", "21.333333px FangSong").width;
    expect(width * 28).toBeCloseTo(21.333333 * 28, 2);
    expect(probe.style.font).toBe("21.333333px FangSong");
    expect(measurer.measureText("甲", "21.333333px FangSong").width).toBe(width);
    expect(probe.computedTextLengthCalls).toBe(1);
    measurer.measureText("甲", "128px FangSong");
    expect(probe.attributes.transform).toBe("scale(32)");
    measurer.destroy();
  });

  it("shares browser Canvas vertical metrics with Canvas layout", () => {
    const ownerDocument = new FakeBrowserTextMeasurerDocument();
    ownerDocument.canvasContext = {
      font: "",
      measureText: () => ({
        width: 40,
        fontBoundingBoxAscent: 13,
        fontBoundingBoxDescent: 5
      })
    } as unknown as CanvasRenderingContext2D;
    const measurer = createSvgBrowserTextMeasurer({
      ownerDocument: ownerDocument as unknown as Document
    });

    expect(measurer.measureText("abcd", "16px Verdana")).toEqual({
      width: 44,
      ascent: 13,
      descent: 5
    });

    measurer.destroy();
  });

  it("measures width through hidden SVG text while preserving fallback metrics", () => {
    const ownerDocument = new FakeBrowserTextMeasurerDocument();
    const shapeRun: NonNullable<QuireTextMeasurer["shapeRun"]> = () => ({
      clusters: [],
      width: 999,
      ascent: 12,
      descent: 4
    });
    const fallbackMeasurer: QuireTextMeasurer = {
      version: 7,
      shapeRun,
      measureText: () => ({
        width: 999,
        ascent: 12,
        descent: 4
      })
    };

    const measurer = createSvgBrowserTextMeasurer({
      ownerDocument: ownerDocument as unknown as Document,
      fallbackMeasurer
    });

    expect(measurer.version).toBe(7);
    expect(measurer.shapeRun).toBeUndefined();
    expect(measurer.measureText("abcd", "16px Verdana")).toEqual({
      width: 44,
      ascent: 12,
      descent: 4
    });
    expect(ownerDocument.lastTextElement?.textContent).toBe("abcd");
    expect(ownerDocument.lastTextElement?.style.font).toBe("16px Verdana");
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(1);
    expect(measurer.measureText("abcd", "16px Verdana").width).toBe(44);
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(1);
    expect(ownerDocument.body.children).toHaveLength(1);

    measurer.destroy();

    expect(ownerDocument.body.children).toHaveLength(0);
  });

  it("evicts least-recently used browser width reads when the cache is full", () => {
    const ownerDocument = new FakeBrowserTextMeasurerDocument();
    const measurer = createSvgBrowserTextMeasurer({
      ownerDocument: ownerDocument as unknown as Document,
      widthCacheSize: 2
    });

    expect(measurer.measureText("a", "16px Verdana").width).toBe(11);
    expect(measurer.measureText("bb", "16px Verdana").width).toBe(22);
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(2);

    expect(measurer.measureText("a", "16px Verdana").width).toBe(11);
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(2);

    expect(measurer.measureText("ccc", "16px Verdana").width).toBe(33);
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(3);

    expect(measurer.measureText("bb", "16px Verdana").width).toBe(22);
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(4);

    measurer.destroy();
  });

  it("remeasures cached widths when the document font set finishes loading", () => {
    const ownerDocument = new FakeBrowserTextMeasurerDocument();
    const measurer = createSvgBrowserTextMeasurer({
      ownerDocument: ownerDocument as unknown as Document
    });

    expect(measurer.measureText("abc", "16px Carlito").width).toBe(33);
    expect(measurer.version).toBe(0);
    ownerDocument.lastTextElement!.pixelsPerCharacter = 7;
    ownerDocument.fonts.dispatch("loadingdone");

    expect(measurer.version).toBe(1);
    expect(measurer.measureText("abc", "16px Carlito").width).toBe(21);
    expect(ownerDocument.lastTextElement?.computedTextLengthCalls).toBe(2);

    measurer.destroy();
    ownerDocument.fonts.dispatch("loadingdone");
    expect(measurer.version).toBe(1);
  });
});

/** Fake document used by SVG browser text measurer tests. */
class FakeBrowserTextMeasurerDocument {
  /** Font loading events owned by this fake document. */
  readonly fonts = new FakeFontFaceSet();
  /** Body element that receives the hidden probe surface. */
  readonly body = new FakeBrowserTextMeasurerElement("body");
  /** Document element used as the fallback probe host. */
  readonly documentElement = new FakeBrowserTextMeasurerElement("html");
  /** Last fake text element created by this document. */
  lastTextElement: FakeBrowserTextMeasurerTextElement | undefined;
  /** Canvas context returned for shared vertical font metrics. */
  canvasContext: CanvasRenderingContext2D | null = null;

  /**
   * Creates the detached Canvas used for vertical font metrics.
   *
   * @param tagName - Requested HTML tag name.
   * @returns Canvas-like element backed by the configured fake context.
   */
  createElement(tagName: string): {
    getContext(type: string): CanvasRenderingContext2D | null;
  } {
    void tagName;
    return {
      getContext: (type) => type === "2d" ? this.canvasContext : null
    };
  }

  /**
   * Creates a fake namespaced SVG element.
   *
   * @param namespace - Requested namespace URI.
   * @param tagName - Requested tag name.
   * @returns Fake element matching the requested tag.
   */
  createElementNS(
    namespace: string,
    tagName: string
  ): FakeBrowserTextMeasurerElement {
    void namespace;

    if (tagName === "text") {
      this.lastTextElement = new FakeBrowserTextMeasurerTextElement(tagName);
      return this.lastTextElement;
    }

    return new FakeBrowserTextMeasurerElement(tagName);
  }
}

/** Fake element used by SVG browser text measurer tests. */
class FakeBrowserTextMeasurerElement {
  /** Child elements appended to this element. */
  readonly children: FakeBrowserTextMeasurerElement[] = [];
  /** Inline style values assigned by the measurer. */
  readonly style: Record<string, string | undefined> = {};
  /** Attribute values assigned by the measurer. */
  readonly attributes: Record<string, string | undefined> = {};
  /** Text content assigned by the measurer. */
  textContent = "";
  private parent: FakeBrowserTextMeasurerElement | undefined;

  /**
   * Creates a fake probe element.
   *
   * @param tagName - Element tag name.
   */
  constructor(readonly tagName: string) {}

  /**
   * Appends a fake child element.
   *
   * @param child - Child element to append.
   * @returns Appended child.
   */
  appendChild(
    child: FakeBrowserTextMeasurerElement
  ): FakeBrowserTextMeasurerElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /**
   * Assigns an attribute value.
   *
   * @param name - Attribute name.
   * @param value - Attribute value.
   */
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  /** Removes this fake element from its parent. */
  remove(): void {
    if (this.parent === undefined) {
      return;
    }

    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = undefined;
  }
}

/** Fake SVG text element with deterministic browser width reads. */
class FakeBrowserTextMeasurerTextElement extends FakeBrowserTextMeasurerElement {
  /** Number of fake browser width reads performed. */
  computedTextLengthCalls = 0;
  /** Deterministic width assigned to each source character. */
  pixelsPerCharacter = 11;
  /** Optional coarse device-space width quantum, matching SVG length reads. */
  deviceQuantum = 0;

  /**
   * Reads a deterministic browser text width.
   *
   * @returns Rendered text width.
   */
  getComputedTextLength(): number {
    this.computedTextLengthCalls += 1;
    const width = this.textContent.length * this.pixelsPerCharacter;
    const scale = Number(/scale\(([^)]+)\)/u.exec(this.attributes.transform ?? "")?.[1] ?? 1);
    return this.deviceQuantum ? Math.ceil(width * scale / this.deviceQuantum) * this.deviceQuantum / scale : width;
  }
}

/** Minimal FontFaceSet event source used by SVG measurement tests. */
class FakeFontFaceSet {
  private readonly listeners = new Map<string, Set<() => void>>();

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
   * Dispatches one fake FontFaceSet event.
   *
   * @param type - FontFaceSet event type to dispatch.
   */
  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}
