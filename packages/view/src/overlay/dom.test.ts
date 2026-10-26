import { describe, expect, it } from "vitest";
import { syncQuireDomOverlays } from ".";

describe("canvas DOM overlay synchronization", () => {
  it("creates, updates, and removes positioned overlay elements", () => {
    const host = new FakeOverlayHost();

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: [
        {
          id: "control",
          range: { from: 1, to: 4 },
          rect: { x: 10, y: 20, width: 80, height: 24 },
          html: "<button>Info</button>",
          ariaLabel: "Callout controls",
          role: "button",
          pointerEvents: "auto"
        },
        {
          id: "stale-next",
          range: { from: 4, to: 8 },
          rect: { x: 100, y: 20, width: 40, height: 24 },
          html: "<input />"
        }
      ]
    });

    expect(host.children).toHaveLength(2);
    expect(host.children[0]?.style).toMatchObject({
      position: "absolute",
      left: "10px",
      top: "20px",
      width: "80px",
      height: "24px",
      pointerEvents: "auto"
    });
    expect(host.children[0]?.innerHTML).toBe("<button>Info</button>");
    expect(host.children[0]?.attributes["aria-label"]).toBe("Callout controls");
    expect(host.children[0]?.attributes.role).toBe("button");

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: [
        {
          id: "control",
          range: { from: 2, to: 5 },
          rect: { x: 12, y: 24, width: 90, height: 28 },
          html: "<button>More</button>"
        }
      ]
    });

    expect(host.children).toHaveLength(1);
    expect(host.children[0]?.style.left).toBe("12px");
    expect(host.children[0]?.style.height).toBe("28px");
    expect(host.children[0]?.innerHTML).toBe("<button>More</button>");
    expect(host.children[0]?.attributes["aria-label"]).toBeUndefined();
    expect(host.children[0]?.attributes.role).toBeUndefined();
    expect(host.children[0]?.style.pointerEvents).toBe("none");
    expect(host.children[0]?.dataset.quirekitRangeFrom).toBe("2");
    expect(host.removedIds).toEqual(["stale-next"]);
  });

  it("reuses and destroys DOM node overlay content by key", () => {
    const host = new FakeOverlayHost();
    const node = new FakeNode();
    const nextNode = new FakeNode();
    const destroyed: unknown[] = [];

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: [
        {
          id: "widget",
          key: "stable",
          range: { from: 1, to: 1 },
          rect: { x: 10, y: 20, width: 1, height: 24 },
          node,
          destroy: (mountedNode) => destroyed.push(mountedNode)
        }
      ]
    });

    expect(host.children[0]?.childNodes).toEqual([node]);

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: [
        {
          id: "widget",
          key: "stable",
          range: { from: 1, to: 1 },
          rect: { x: 12, y: 20, width: 1, height: 24 },
          node: nextNode,
          destroy: (mountedNode) => destroyed.push(mountedNode)
        }
      ]
    });

    expect(host.children[0]?.childNodes).toEqual([node]);
    expect(destroyed).toEqual([]);

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: []
    });

    expect(destroyed).toEqual([node]);
  });

  it("removes duplicate existing overlay elements before synchronization", () => {
    const host = new FakeOverlayHost();

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: [
        {
          id: "control",
          range: { from: 1, to: 2 },
          rect: { x: 10, y: 10, width: 40, height: 20 },
          html: "<button>First</button>"
        },
        {
          id: "control",
          range: { from: 3, to: 4 },
          rect: { x: 60, y: 10, width: 40, height: 20 },
          html: "<button>Duplicate</button>"
        }
      ]
    });

    expect(host.children).toHaveLength(2);

    syncQuireDomOverlays({
      host: host as unknown as HTMLElement,
      overlays: [
        {
          id: "control",
          range: { from: 1, to: 2 },
          rect: { x: 12, y: 10, width: 40, height: 20 },
          html: "<button>Updated</button>"
        }
      ]
    });

    expect(host.children).toHaveLength(1);
    expect(host.children[0]?.innerHTML).toBe("<button>Updated</button>");
  });
});

/** Fake overlay host used by DOM overlay tests. */
class FakeOverlayHost {
  /** Child overlay elements. */
  readonly children: FakeOverlayElement[] = [];

  /** Removed overlay identifiers. */
  readonly removedIds: string[] = [];

  /** Owner document used by overlay synchronization. */
  readonly ownerDocument = {
    /** Fake window object that intentionally omits a Node constructor. */
    defaultView: undefined,
    /**
     * Creates a fake overlay element.
     *
     * @returns Fake overlay element.
     */
    createElement: (): FakeOverlayElement => new FakeOverlayElement(this)
  };

  /**
   * Returns current overlay children.
   *
   * @returns Fake overlay elements.
   */
  querySelectorAll(): readonly FakeOverlayElement[] {
    return this.children;
  }

  /**
   * Appends a fake overlay element.
   *
   * @param element - Element to append.
   */
  appendChild(element: FakeOverlayElement): void {
    this.children.push(element);
  }
}

/** Fake overlay element used by DOM overlay tests. */
class FakeOverlayElement {
  /** Dataset values assigned by overlay synchronization. */
  readonly dataset: Record<string, string | undefined> = {};

  /** Style values assigned by overlay synchronization. */
  readonly style: Record<string, string> = {};

  /** Attribute values assigned by overlay synchronization. */
  readonly attributes: Record<string, string | undefined> = {};

  /** CSS class name assigned by overlay synchronization. */
  className = "";

  /** HTML content assigned by overlay synchronization. */
  innerHTML = "";

  /** Text content assigned by overlay synchronization. */
  textContent = "";

  /** Child nodes appended by overlay synchronization. */
  readonly childNodes: unknown[] = [];

  /** Owner document used by node checks. */
  readonly ownerDocument: FakeOverlayHost["ownerDocument"];

  /**
   * Creates a fake overlay element.
   *
   * @param host - Host that owns this element.
   */
  constructor(private readonly host: FakeOverlayHost) {
    this.ownerDocument = host.ownerDocument;
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

  /**
   * Removes an attribute value.
   *
   * @param name - Attribute name.
   */
  removeAttribute(name: string): void {
    delete this.attributes[name];
  }

  /** Removes this fake element from its host. */
  remove(): void {
    this.host.removedIds.push(this.dataset.quirekitOverlayId ?? "");
    this.host.children.splice(this.host.children.indexOf(this), 1);
  }

  /** Removes all child nodes. */
  replaceChildren(): void {
    this.childNodes.splice(0);
  }

  /**
   * Appends a child node.
   *
   * @param node - Node to append.
   */
  appendChild(node: unknown): void {
    this.childNodes.push(node);
  }
}

/** Fake DOM node used by overlay synchronization tests. */
class FakeNode {
  /** DOM-like node type marker. */
  readonly nodeType = 1;
}
