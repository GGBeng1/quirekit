import type { HtmlDescriptor, HtmlDocumentDesc } from "../../descriptors";
import type { HtmlDomPoint } from "../../document/types";
import { isHtmlContainerDescriptor, walkHtmlDescriptors } from "./descriptor-tree";
import {
  clampHtmlDomOffset,
  findHtmlDeepestContainer,
  findHtmlTextDescriptor,
  findHtmlUnrepresentedDescriptor,
  htmlChildOffsetAtPosition,
  positionAtHtmlChildOffset,
  requireHtmlMountedDOM
} from "./dom-point";
import { HtmlDomMappingGapError } from "./mapping-gap";

/** Descriptor-owned DOM and canonical position index for one retained document. */
export class HtmlDescriptorPositionIndex {
  private domOwners = new WeakMap<Node, HtmlDescriptor>();
  private descriptors: HtmlDescriptor[] = [];
  private represented = new Set<HtmlDescriptor>();

  /**
   * Creates and populates an ownership index.
   *
   * @param root - Retained document root to index.
   */
  constructor(root: HtmlDocumentDesc) {
    this.rebuild(root);
  }

  /**
   * Rebuilds ownership after retained reconciliation.
   *
   * @param root - Current retained document root.
   */
  rebuild(root: HtmlDocumentDesc): void {
    const owners = new WeakMap<Node, HtmlDescriptor>();
    const descriptors: HtmlDescriptor[] = [];
    const represented = new Set<HtmlDescriptor>();

    walkHtmlDescriptors(root, (descriptor) => {
      descriptors.push(descriptor);
      const parentRepresented = descriptor.parent === null || represented.has(descriptor.parent);
      const attached = descriptor.parent === null || (
        descriptor.parent.mount?.contentDOM === descriptor.mount?.dom.parentNode
      );

      if (descriptor.mount && parentRepresented && attached) {
        represented.add(descriptor);
        owners.set(descriptor.mount.dom, descriptor);
        if (descriptor.mount.contentDOM) {
          owners.set(descriptor.mount.contentDOM, descriptor);
        }
      }
    });
    this.domOwners = owners;
    this.descriptors = descriptors;
    this.represented = represented;
  }

  /** Releases every ownership lookup held by the index. */
  clear(): void {
    this.domOwners = new WeakMap();
    this.descriptors = [];
    this.represented.clear();
  }

  /**
   * Resolves a canonical position through represented descriptor ownership.
   *
   * @param pos - Canonical document position.
   * @param side - Preferred side at a descriptor boundary.
   * @returns Descriptor-owned DOM point.
   */
  resolveDomPoint(pos: number, side: number): HtmlDomPoint {
    const gap = findHtmlUnrepresentedDescriptor(
      this.descriptors,
      this.represented,
      pos,
      side
    );

    if (gap) {
      throw new HtmlDomMappingGapError(
        `Document position ${pos} is owned by unrepresented descriptor "${gap.id}".`
      );
    }
    const text = findHtmlTextDescriptor(this.descriptors, pos, side);

    if (text) {
      this.assertRepresented(text, `Document position ${pos} is unrepresented.`);
      return {
        node: requireHtmlMountedDOM(text, `Document position ${pos} is mountless.`),
        offset: clampHtmlDomOffset(
          pos - text.range.from,
          0,
          text.range.to - text.range.from
        ),
        descriptorId: text.id
      };
    }
    const container = findHtmlDeepestContainer(this.descriptors, pos);

    if (!container?.mount?.contentDOM || !this.represented.has(container)) {
      throw new HtmlDomMappingGapError(
        `Document position ${pos} has no represented descriptor owner.`
      );
    }
    return {
      node: container.mount.contentDOM,
      offset: htmlChildOffsetAtPosition(container, pos),
      descriptorId: container.id
    };
  }

  /**
   * Resolves an owned DOM point to a canonical position.
   *
   * @param node - Directly owned DOM node.
   * @param offset - DOM offset within the node.
   * @param bias - Preferred side at a child boundary.
   * @returns Canonical document position.
   */
  resolvePosition(node: Node, offset: number, bias: number): number {
    const descriptor = this.domOwners.get(node);

    if (!descriptor) {
      throw new HtmlDomMappingGapError(
        "DOM point is not owned by the retained descriptor tree."
      );
    }
    if (descriptor.kind === "text" && descriptor.mount?.dom === node) {
      return descriptor.range.from + clampHtmlDomOffset(
        offset,
        0,
        descriptor.range.to - descriptor.range.from
      );
    }
    if (!isHtmlContainerDescriptor(descriptor) || descriptor.mount?.contentDOM !== node) {
      throw new HtmlDomMappingGapError(
        `DOM point owned by "${descriptor.id}" is not a mapped content point.`
      );
    }
    return positionAtHtmlChildOffset(descriptor, offset, bias, this.domOwners);
  }

  /**
   * Returns retained outer DOM beginning at a canonical position.
   *
   * @param pos - Position before a schema node.
   * @returns Retained outer DOM, or null when no node begins there.
   */
  resolveNodeDom(pos: number): Node | null {
    const descriptor = this.descriptors.find((candidate) => (
      (candidate.kind === "node" || candidate.kind === "node-view") &&
      candidate.range.from === pos
    ));

    if (!descriptor) {
      return null;
    }
    this.assertRepresented(descriptor, `Node at position ${pos} is unrepresented.`);
    return requireHtmlMountedDOM(descriptor, `Node at position ${pos} is mountless.`);
  }

  /**
   * Finds the nearest represented descriptor that owns a DOM target.
   *
   * @param node - Event or mutation target inside retained DOM.
   * @returns Nearest retained owner, or undefined outside the tree.
   */
  resolveOwner(node: Node): HtmlDescriptor | undefined {
    for (let current: Node | null = node; current; current = current.parentNode) {
      const owner = this.domOwners.get(current);
      if (owner) {
        return owner;
      }
    }
    return undefined;
  }

  /**
   * Resolves one retained descriptor by its document-local identity.
   *
   * @param descriptorId - Exact descriptor identity to resolve.
   * @returns Current retained descriptor, or undefined when it is stale.
   */
  resolveDescriptor(descriptorId: string): HtmlDescriptor | undefined {
    return this.descriptors.find((descriptor) => descriptor.id === descriptorId);
  }

  /**
   * Lists represented descriptors that overlap one canonical range.
   *
   * @param range - Canonical range to query.
   * @returns Ordered represented descriptors intersecting the range.
   */
  resolveDescriptorsInRange(range: { readonly from: number; readonly to: number }): readonly HtmlDescriptor[] {
    return this.descriptors.filter((descriptor) =>
      this.represented.has(descriptor) &&
      descriptor.range.from < range.to &&
      range.from < descriptor.range.to
    );
  }

  /**
   * Requires one semantic descriptor to participate in mounted ownership.
   *
   * @param descriptor - Descriptor expected to be represented.
   * @param message - Explicit mapping-gap detail.
   */
  private assertRepresented(descriptor: HtmlDescriptor, message: string): void {
    if (!this.represented.has(descriptor)) {
      throw new HtmlDomMappingGapError(message);
    }
  }
}
