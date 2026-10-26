import type { QuireLayoutDomOverlay } from "@quirekit/view-engine";
import type { QuireDomOverlaySyncOptions } from "./types";

const overlaySelector = "[data-quirekit-overlay-id]";
const mountedNodes = new WeakMap<HTMLElement, MountedOverlayNode>();

/** DOM node currently mounted into one overlay element. */
interface MountedOverlayNode {
  /** Mounted node content. */
  readonly node: unknown;
  /** Reuse key used to decide whether the node can stay mounted. */
  readonly key: string | undefined;
  /** Optional cleanup invoked when this node is replaced or removed. */
  readonly destroy: ((node: unknown) => void) | undefined;
}

/**
 * Synchronizes canvas DOM overlay descriptors into a host element.
 *
 * @param options - Overlay host and descriptors to synchronize.
 */
export function syncQuireDomOverlays(options: QuireDomOverlaySyncOptions): void {
  const existing = collectExistingOverlayElements(options.host);

  for (const overlay of options.overlays) {
    const element = existing.get(overlay.id) ?? createOverlayElement(options.host, overlay);

    existing.delete(overlay.id);
    updateOverlayElement(element, overlay);
  }

  for (const element of existing.values()) {
    destroyMountedOverlayNode(element);
    element.remove();
  }
}

/**
 * Collects existing overlay elements keyed by descriptor id.
 *
 * @param host - Overlay host element.
 * @returns Existing overlay elements keyed by id.
 */
function collectExistingOverlayElements(host: HTMLElement): Map<string, HTMLElement> {
  const elements = new Map<string, HTMLElement>();

  for (const element of Array.from(host.querySelectorAll<HTMLElement>(overlaySelector))) {
    const id = element.dataset.quirekitOverlayId;

    if (id) {
      if (elements.has(id)) {
        destroyMountedOverlayNode(element);
        element.remove();
        continue;
      }

      elements.set(id, element);
    }
  }

  return elements;
}

/**
 * Creates a new overlay element in a host.
 *
 * @param host - Overlay host element.
 * @param overlay - Overlay descriptor that needs an element.
 * @returns Created overlay element.
 */
function createOverlayElement(
  host: HTMLElement,
  overlay: QuireLayoutDomOverlay
): HTMLElement {
  const element = host.ownerDocument.createElement("div");

  element.dataset.quirekitOverlayId = overlay.id;
  element.className = "quirekit-canvas-overlay";
  host.appendChild(element);

  return element;
}

/**
 * Updates an overlay element from a descriptor.
 *
 * @param element - Overlay element to update.
 * @param overlay - Overlay descriptor to apply.
 */
function updateOverlayElement(
  element: HTMLElement,
  overlay: QuireLayoutDomOverlay
): void {
  element.dataset.quirekitOverlayId = overlay.id;
  if (overlay.key === undefined) {
    delete element.dataset.quirekitOverlayKey;
  } else {
    element.dataset.quirekitOverlayKey = overlay.key;
  }
  element.dataset.quirekitRangeFrom = `${overlay.range.from}`;
  element.dataset.quirekitRangeTo = `${overlay.range.to}`;
  element.style.position = "absolute";
  element.style.left = `${overlay.rect.x}px`;
  element.style.top = `${overlay.rect.y}px`;
  element.style.width = `${overlay.rect.width}px`;
  element.style.height = `${overlay.rect.height}px`;
  element.style.pointerEvents = overlay.pointerEvents ?? "none";
  syncOverlayContent(element, overlay);

  if (overlay.ariaLabel === undefined) {
    element.removeAttribute("aria-label");
  } else {
    element.setAttribute("aria-label", overlay.ariaLabel);
  }

  if (overlay.role === undefined) {
    element.removeAttribute("role");
  } else {
    element.setAttribute("role", overlay.role);
  }
}

/**
 * Synchronizes one overlay element's content.
 *
 * @param element - Overlay wrapper element to update.
 * @param overlay - Overlay descriptor containing HTML or DOM node content.
 */
function syncOverlayContent(
  element: HTMLElement,
  overlay: QuireLayoutDomOverlay
): void {
  if (overlay.node !== undefined) {
    syncOverlayNodeContent(element, overlay);
    return;
  }

  destroyMountedOverlayNode(element);
  element.innerHTML = overlay.html ?? "";
}

/**
 * Synchronizes DOM-node overlay content with reuse-key semantics.
 *
 * @param element - Overlay wrapper element to update.
 * @param overlay - Overlay descriptor containing a DOM node.
 */
function syncOverlayNodeContent(
  element: HTMLElement,
  overlay: QuireLayoutDomOverlay
): void {
  const mounted = mountedNodes.get(element);

  if (
    mounted &&
    mounted.node === overlay.node &&
    mounted.key === overlay.key
  ) {
    return;
  }

  if (
    mounted &&
    overlay.key !== undefined &&
    mounted.key === overlay.key
  ) {
    return;
  }

  destroyMountedOverlayNode(element);
  element.replaceChildren();

  if (isNodeLike(overlay.node, element.ownerDocument)) {
    element.appendChild(overlay.node);
  } else {
    element.textContent = "";
  }

  mountedNodes.set(element, {
    node: overlay.node,
    key: overlay.key,
    destroy: overlay.destroy
  });
}

/**
 * Destroys a mounted node overlay, if any.
 *
 * @param element - Overlay wrapper element to clean up.
 */
function destroyMountedOverlayNode(element: HTMLElement): void {
  const mounted = mountedNodes.get(element);

  if (!mounted) {
    return;
  }

  mounted.destroy?.(mounted.node);
  mountedNodes.delete(element);
}

/**
 * Checks whether an unknown value is a DOM Node for the host document.
 *
 * @param value - Value to test.
 * @param document - Host document used to resolve the Node constructor.
 * @returns Whether the value can be appended as a DOM Node.
 */
function isNodeLike(value: unknown, document: Document): value is Node {
  const NodeCtor = document.defaultView?.Node;

  return NodeCtor === undefined
    ? typeof value === "object" && value !== null && "nodeType" in value
    : value instanceof NodeCtor;
}
