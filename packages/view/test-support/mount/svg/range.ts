import type { FakeSvgMountElement } from "./element";

/** Deterministic detached DOM Range used by mounted browser-view tests. */
export class FakeSvgMountRange {
  private startNode: FakeSvgMountElement | undefined;
  private startOffset = 0;
  private endNode: FakeSvgMountElement | undefined;
  private endOffset = 0;

  /**
   * Assigns the retained start point.
   *
   * @param node - Fake retained DOM node.
   * @param offset - DOM offset inside the node.
   */
  setStart(node: Node, offset: number): void {
    this.startNode = node as unknown as FakeSvgMountElement;
    this.startOffset = offset;
  }

  /**
   * Assigns the retained end point.
   *
   * @param node - Fake retained DOM node.
   * @param offset - DOM offset inside the node.
   */
  setEnd(node: Node, offset: number): void {
    this.endNode = node as unknown as FakeSvgMountElement;
    this.endOffset = offset;
  }

  /** Collapses the fake range to its start point. */
  collapse(): void {
    this.endNode = this.startNode;
    this.endOffset = this.startOffset;
  }

  /**
   * Returns deterministic inline geometry for the retained offsets.
   *
   * @returns One DOMRect-like line fragment.
   */
  getClientRects(): DOMRectList {
    return [this.createRect()] as unknown as DOMRectList;
  }

  /**
   * Returns the deterministic range bounding rectangle.
   *
   * @returns DOMRect-like range bounds.
   */
  getBoundingClientRect(): DOMRect {
    return this.createRect();
  }

  /**
   * Creates one eight-pixel-per-offset fake inline rectangle.
   *
   * @returns Deterministic DOMRect-like range bounds.
   */
  private createRect(): DOMRect {
    const origin = resolveFakeRangeOrigin(this.startNode);
    const left = origin.left + this.startOffset * 8;
    const sameNode = this.startNode === this.endNode;
    const width = sameNode ? Math.max((this.endOffset - this.startOffset) * 8, 0) : 8;
    return {
      x: left,
      y: origin.top,
      left,
      right: left + width,
      top: origin.top,
      bottom: origin.top + 20,
      width,
      height: 20,
      toJSON: () => ({})
    } as DOMRect;
  }
}

/**
 * Resolves surface origin and top-level flow line for one fake DOM point.
 *
 * @param node - Fake retained DOM point.
 * @returns Client-space origin for its top-level block.
 */
function resolveFakeRangeOrigin(node: FakeSvgMountElement | undefined): {
  readonly left: number;
  readonly top: number;
} {
  let surface: FakeSvgMountElement | null = null;
  let documentRoot: FakeSvgMountElement | null = null;
  let topBlock: FakeSvgMountElement | null = null;

  for (let current = node; current; current = current.parentNode ?? undefined) {
    if (current.parentNode?.className === "qk-html-editor__document") {
      topBlock = current;
      documentRoot = current.parentNode;
    }
    if (current.dataset.qkSurface === "content") {
      surface = current;
      break;
    }
  }
  const surfaceRect = surface?.getBoundingClientRect();
  const blockIndex = documentRoot && topBlock
    ? Math.max(documentRoot.children.indexOf(topBlock), 0)
    : 0;
  return {
    left: surfaceRect?.left ?? 0,
    top: (surfaceRect?.top ?? 0) + blockIndex * 20
  };
}
