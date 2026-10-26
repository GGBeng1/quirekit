import { FakeSvgMountElement } from "./element";
import { FakeSvgEventListeners } from "./events";
import { FakeSvgMountRange } from "./range";

/** Fake document used by mounted SVG view tests. */
export class FakeSvgMountDocument {
  /** Currently focused fake element. */
  activeElement: FakeSvgMountElement | null = null;
  /** Fake document body used by hidden browser probe surfaces. */
  readonly body = new FakeSvgMountElement("body", this, false);
  /** Fake document root used when a test has no body host. */
  readonly documentElement = new FakeSvgMountElement("html", this, false);
  /** Minimal defaultView used by mounted resize bindings. */
  readonly defaultView = {
    innerWidth: 320,
    innerHeight: 180,
    /** Fake window subscriptions do not drive SVG test scheduling. */
    addEventListener() {},
    /** Fake window subscriptions own no external resources. */
    removeEventListener() {}
  };
  private readonly createdElements: FakeSvgMountElement[] = [];
  private readonly listeners = new FakeSvgEventListeners();

  /**
   * Creates a fake HTML element with the requested tag name.
   *
   * @param tagName - Element tag name.
   * @returns Fake mounted view element.
   */
  createElement(tagName: string): FakeSvgMountElement {
    const element = new FakeSvgMountElement(tagName, this, false);
    this.createdElements.push(element);
    return element;
  }

  /**
   * Creates a fake namespaced element with the requested tag name.
   *
   * @param namespace - Element namespace URI.
   * @param tagName - Element tag name.
   * @returns Fake mounted view element.
   */
  createElementNS(namespace: string, tagName: string): FakeSvgMountElement {
    const element = new FakeSvgMountElement(tagName, this, true);

    element.namespace = namespace;
    this.createdElements.push(element);
    return element;
  }

  /**
   * Creates a fake text node with the requested text content.
   *
   * @param text - Text node content.
   * @returns Fake mounted view text node.
   */
  createTextNode(text: string): FakeSvgMountElement {
    const element = new FakeSvgMountElement("#text", this, false, 3);

    element.textContent = text;
    this.createdElements.push(element);
    return element;
  }

  /**
   * Creates a deterministic detached DOM Range for geometry tests.
   *
   * @returns Fake browser Range.
   */
  createRange(): FakeSvgMountRange {
    return new FakeSvgMountRange();
  }

  /**
   * Resolves a deterministic fake browser caret from retained continuous flow.
   *
   * @param x - Viewport x coordinate.
   * @param y - Viewport y coordinate.
   * @returns Fake caret candidate, or null outside an HTML content surface.
   */
  caretPositionFromPoint(x: number, y: number): CaretPosition | null {
    const surface = [...this.createdElements].reverse().find((element) => {
      if (element.dataset.qkSurface !== "content") {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom;
    });
    const documentRoot = surface?.children.find(
      (element) => element.className === "qk-html-editor__document"
    );
    if (!surface || !documentRoot || documentRoot.children.length === 0) {
      return null;
    }
    const surfaceRect = surface.getBoundingClientRect();
    const blockIndex = Math.max(
      0,
      Math.min(
        Math.floor((y - surfaceRect.top) / 20),
        documentRoot.children.length - 1
      )
    );
    const textNodes = collectFakeTextNodes(documentRoot.children[blockIndex]!);
    if (textNodes.length === 0) {
      return {
        offsetNode: documentRoot.children[blockIndex] as unknown as Node,
        offset: 0,
        getClientRect: () => null
      };
    }
    let remaining = Math.max(Math.round((x - surfaceRect.left) / 8), 0);
    for (const text of textNodes) {
      if (remaining <= text.textContent.length) {
        return {
          offsetNode: text as unknown as Node,
          offset: remaining,
          getClientRect: () => null
        };
      }
      remaining -= text.textContent.length;
    }
    const last = textNodes.at(-1)!;
    return {
      offsetNode: last as unknown as Node,
      offset: last.textContent.length,
      getClientRect: () => null
    };
  }

  /**
   * Registers a fake document event listener.
   *
   * @param type - Event type.
   * @param listener - Event listener.
   */
  addEventListener(type: string, listener: EventListener): void {
    this.listeners.add(type, listener);
  }

  /**
   * Removes a fake document event listener.
   *
   * @param type - Event type.
   * @param listener - Event listener.
   */
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.remove(type, listener);
  }

  /**
   * Dispatches a fake document event to registered listeners.
   *
   * @param event - Event-like object to dispatch.
   * @returns Whether dispatch completed.
   */
  dispatchEvent(event: Event): boolean {
    return this.listeners.dispatch(this, event);
  }
}

/** Collects direct retained text descendants in DOM order. */
function collectFakeTextNodes(root: FakeSvgMountElement): FakeSvgMountElement[] {
  if (root.nodeType === 3) {
    return [root];
  }
  return root.children.flatMap(collectFakeTextNodes);
}
