import { describe, expect, it } from "vitest";
import type { QuireMountedEditorView } from "../types";
import { scrollMountedViewRectIntoAncestorChain } from "./rect";

describe("mounted selection scroll ancestor traversal", () => {
  it("starts at the editor root instead of a fixed input proxy", () => {
    const ownerDocument = createFakeScrollDocument();
    const body = createFakeScrollElement(ownerDocument, null, 600);
    const scrollport = createFakeScrollElement(ownerDocument, body, 100);
    const root = createFakeScrollElement(ownerDocument, scrollport, 1000);
    const inputProxy = createFakeScrollElement(ownerDocument, root, 1, "fixed");
    ownerDocument.body = body;
    const view = {
      elements: { root, inputProxy },
      someProp() {
        return undefined;
      }
    } as unknown as QuireMountedEditorView;

    scrollMountedViewRectIntoAncestorChain(view, {
      left: 20,
      right: 21,
      top: 300,
      bottom: 320
    });

    expect(scrollport.scrollTop).toBeGreaterThan(0);
    expect(inputProxy.scrollTop).toBe(0);
  });

  it("keeps the configured threshold and margin around the active endpoint", () => {
    const ownerDocument = createFakeScrollDocument();
    const body = createFakeScrollElement(ownerDocument, null, 600);
    const scrollport = createFakeScrollElement(ownerDocument, body, 100);
    const root = createFakeScrollElement(ownerDocument, scrollport, 1000);
    ownerDocument.body = body;
    const view = {
      elements: { root },
      someProp(propName: string) {
        return propName === "scrollThreshold"
          ? { top: 20, right: 10, bottom: 20, left: 10 }
          : propName === "scrollMargin"
            ? { top: 30, right: 12, bottom: 30, left: 12 }
            : undefined;
      }
    } as unknown as QuireMountedEditorView;

    scrollMountedViewRectIntoAncestorChain(view, {
      left: 20,
      right: 21,
      top: 75,
      bottom: 95
    });

    expect(scrollport.scrollTop).toBe(25);
  });

  it("scrolls the window once when both body and html are ancestors", () => {
    const ownerDocument = createFakeScrollDocument();
    const html = createFakeScrollElement(ownerDocument, null, 600);
    const body = createFakeScrollElement(ownerDocument, html, 600);
    const root = createFakeScrollElement(ownerDocument, body, 1000);
    ownerDocument.body = body;
    ownerDocument.documentElement = html;

    scrollMountedViewRectIntoAncestorChain(createFakeScrollView(root), {
      left: 20,
      right: 21,
      top: 700,
      bottom: 720
    });

    expect(ownerDocument.defaultView.scrollCalls).toEqual([{ x: 0, y: 125 }]);
  });

  it("stops after an ancestor that declares itself the scroll boundary", () => {
    const ownerDocument = createFakeScrollDocument();
    const body = createFakeScrollElement(ownerDocument, null, 600);
    const shell = createFakeScrollElement(ownerDocument, body, 1000);
    const root = createFakeScrollElement(ownerDocument, shell, 1000);
    shell.attributes.add("data-qk-scroll-boundary");
    ownerDocument.body = body;

    // The shell is taller than the window, as when a keyboard covers its lower part.
    scrollMountedViewRectIntoAncestorChain(createFakeScrollView(root), {
      left: 20,
      right: 21,
      top: 700,
      bottom: 720
    });

    expect(ownerDocument.defaultView.scrollCalls).toEqual([]);
  });
});

/**
 * Creates a mounted view whose PM props keep the scroll defaults.
 *
 * @param root - Fake editor root where traversal starts.
 * @returns Mounted view surface consumed by scroll traversal.
 */
function createFakeScrollView(root: FakeScrollElement): QuireMountedEditorView {
  return {
    elements: { root },
    someProp() {
      return undefined;
    }
  } as unknown as QuireMountedEditorView;
}

/** Minimal fake document used by scroll-ancestor tests. */
interface FakeScrollDocument {
  /** Fake document body assigned after construction. */
  body: FakeScrollElement;
  /** Fake document root, assigned when a test includes `html`. */
  documentElement: FakeScrollElement | null;
  /** Window APIs consumed by scroll traversal. */
  readonly defaultView: {
    /** Fake visual viewport used for document-body bounds. */
    readonly visualViewport: {
      /** Viewport width. */
      readonly width: number;
      /** Viewport height. */
      readonly height: number;
    };
    /** Window scroll deltas recorded in call order. */
    readonly scrollCalls: Array<{ readonly x: number; readonly y: number }>;
    /**
     * Records one window scroll.
     *
     * @param x - Horizontal delta.
     * @param y - Vertical delta.
     */
    scrollBy(x: number, y: number): void;
    /**
     * Reads the fake CSS position.
     *
     * @param element - Fake element to inspect.
     * @returns Position style used by fixed/sticky termination.
     */
    getComputedStyle(element: FakeScrollElement): { readonly position: string };
  };
}

/** Minimal fake element used by scroll-ancestor tests. */
interface FakeScrollElement {
  /** Element node type. */
  readonly nodeType: 1;
  /** Parent in the fake DOM tree. */
  readonly parentNode: FakeScrollElement | null;
  /** Owning fake document. */
  readonly ownerDocument: FakeScrollDocument;
  /** CSS position consumed by the fake computed-style reader. */
  readonly position: string;
  /** Visible width. */
  readonly clientWidth: number;
  /** Visible height. */
  readonly clientHeight: number;
  /** Mutable horizontal scroll offset. */
  scrollLeft: number;
  /** Mutable vertical scroll offset. */
  scrollTop: number;
  /** Attribute names present on the element. */
  readonly attributes: Set<string>;
  /**
   * Reads whether an attribute is present.
   *
   * @param name - Attribute name.
   * @returns Whether the attribute is present.
   */
  hasAttribute(name: string): boolean;
  /**
   * Reads fake viewport bounds.
   *
   * @returns Element client rectangle.
   */
  getBoundingClientRect(): FakeScrollRect;
}

/** Minimal rectangle used by fake scroll elements. */
interface FakeScrollRect {
  /** Left viewport edge. */
  readonly left: number;
  /** Right viewport edge. */
  readonly right: number;
  /** Top viewport edge. */
  readonly top: number;
  /** Bottom viewport edge. */
  readonly bottom: number;
}

/**
 * Creates the fake owner document used by scroll traversal.
 *
 * @returns Mutable fake document.
 */
function createFakeScrollDocument(): FakeScrollDocument {
  return {
    body: null as unknown as FakeScrollElement,
    documentElement: null,
    defaultView: {
      visualViewport: { width: 800, height: 600 },
      scrollCalls: [],
      scrollBy(x, y) {
        this.scrollCalls.push({ x, y });
      },
      getComputedStyle(element) {
        return { position: element.position };
      }
    }
  };
}

/**
 * Creates one fake element in a scroll ancestor chain.
 *
 * @param ownerDocument - Fake owner document.
 * @param parentNode - Parent element in the chain.
 * @param height - Visible element height.
 * @param position - Fake CSS position.
 * @returns Fake scroll element.
 */
function createFakeScrollElement(
  ownerDocument: FakeScrollDocument,
  parentNode: FakeScrollElement | null,
  height: number,
  position = "static"
): FakeScrollElement {
  return {
    nodeType: 1,
    parentNode,
    ownerDocument,
    position,
    clientWidth: 400,
    clientHeight: height,
    scrollLeft: 0,
    scrollTop: 0,
    attributes: new Set(),
    hasAttribute(name) {
      return this.attributes.has(name);
    },
    getBoundingClientRect() {
      return { left: 0, right: 400, top: 0, bottom: height };
    }
  };
}
