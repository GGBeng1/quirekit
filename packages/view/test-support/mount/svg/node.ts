import type { FakeSvgMountDocument } from "./document";
import type { FakeSvgMountElement } from "./element";

/** Shared fake DOM node behavior used by SVG mount test elements. */
export class FakeSvgMountNode {
  /** Child elements appended to this fake node. */
  readonly children: FakeSvgMountElement[] = [];
  /** Text content assigned by renderer tests. */
  textContent = "";
  /** HTML content assigned by foreignObject overlay tests. */
  innerHTML = "";
  /** Input value assigned by text input tests. */
  value = "";
  /** Namespace assigned by createElementNS. */
  namespace = "";
  private parent: FakeSvgMountElement | null = null;

  /** DOM node value used by retained text patch tests. */
  get nodeValue(): string | null {
    return this.nodeType === 3 ? this.textContent : null;
  }

  /**
   * Assigns a DOM node value with browser text-node semantics.
   *
   * @param value - Text value, or null to clear a text node.
   */
  set nodeValue(value: string | null) {
    if (this.nodeType === 3) {
      this.textContent = value ?? "";
    }
  }

  /**
   * Creates a fake DOM-like node.
   *
   * @param tagName - Element tag name.
   * @param ownerDocument - Fake owner document.
   * @param nodeType - DOM nodeType exposed for PM DOMSerializer compatibility.
   */
  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeSvgMountDocument,
    readonly nodeType = 1
  ) {}

  /** Child nodes exposed for DOM-like mounted view tests. */
  get childNodes(): readonly FakeSvgMountElement[] {
    return this.children;
  }

  /** First child node exposed for DOM-like mounted view tests. */
  get firstChild(): FakeSvgMountElement | null {
    return this.children[0] ?? null;
  }

  /** First element child exposed for DOM-like mounted view tests. */
  get firstElementChild(): FakeSvgMountElement | null {
    return this.children.find((child) => child.nodeType === 1) ?? null;
  }

  /** Parent node exposed for DOM-like mounted view tests. */
  get parentNode(): FakeSvgMountElement | null {
    return this.parent;
  }

  /** Parent element exposed for DOM-like mounted view tests. */
  get parentElement(): FakeSvgMountElement | null {
    return this.parent?.nodeType === 1 ? this.parent : null;
  }

  /**
   * Checks inclusive descendant ownership with native Node.contains semantics.
   * @param node - Candidate descendant or null.
   * @returns Whether this node is the candidate or one of its ancestors.
   */
  contains(node: FakeSvgMountNode | null): boolean {
    for (let current = node; current !== null; current = current.parentNode) {
      if (current === this) return true;
    }
    return false;
  }

  /**
   * Appends a fake child element.
   *
   * @param child - Child element to append.
   * @returns Appended child element.
   */
  appendChild(child: FakeSvgMountElement): FakeSvgMountElement {
    child.remove();
    child.setParent(this as unknown as FakeSvgMountElement);
    this.children.push(child);
    return child;
  }

  /**
   * Inserts or moves a fake child before a retained reference child.
   *
   * @param child - Child node to insert or move.
   * @param reference - Existing child to insert before, or null to append.
   * @returns Inserted child node.
   */
  insertBefore(
    child: FakeSvgMountElement,
    reference: FakeSvgMountElement | null
  ): FakeSvgMountElement {
    if (child === reference) {
      return child;
    }
    if (reference === null) {
      return this.appendChild(child);
    }
    const referenceIndex = this.children.indexOf(reference);

    if (referenceIndex < 0) {
      throw new RangeError("insertBefore reference is not a child of this fake node.");
    }
    child.remove();
    const nextReferenceIndex = this.children.indexOf(reference);

    child.setParent(this as unknown as FakeSvgMountElement);
    this.children.splice(nextReferenceIndex, 0, child);
    return child;
  }

  /**
   * Removes one retained fake child.
   *
   * @param child - Existing child node to remove.
   * @returns Removed child node.
   */
  removeChild(child: FakeSvgMountElement): FakeSvgMountElement {
    const index = this.children.indexOf(child);

    if (index < 0) {
      throw new RangeError("removeChild target is not a child of this fake node.");
    }
    this.children.splice(index, 1);
    child.setParent(null);
    return child;
  }

  /**
   * Appends one or more fake child elements.
   *
   * @param children - Child elements to append.
   */
  append(...children: FakeSvgMountElement[]): void {
    for (const child of children) {
      this.appendChild(child);
    }
  }

  /**
   * Replaces all fake child elements.
   *
   * @param children - Replacement child elements.
   */
  replaceChildren(...children: FakeSvgMountElement[]): void {
    for (const child of this.children) {
      child.setParent(null);
    }

    this.children.length = 0;
    this.append(...children);
  }

  /** Removes this node from its parent. */
  remove(): void {
    if (!this.parent) {
      return;
    }

    this.parent.removeChild(this as unknown as FakeSvgMountElement);
  }

  /**
   * Updates the parent pointer for fake tree maintenance.
   *
   * @param parent - New parent element, or null when detached.
   */
  setParent(parent: FakeSvgMountElement | null): void {
    this.parent = parent;
  }
}
