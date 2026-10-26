import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { readFloatingObjectGeometry } from "./geometry";

/**
 * Creates a retained continuous-flow NodeView for HTML editing.
 *
 * @param props - Mounted node-view context and exact source position.
 * @returns ProseMirror-compatible retained DOM node view.
 */
export function createFloatingObjectNodeView(
  props: QuireNodeViewRendererProps
) {
  const ownerDocument = props.view.dom.ownerDocument;
  const dom = ownerDocument.createElement("figure");
  const contentDOM = ownerDocument.createElement("div");

  dom.dataset.qkFloatingObject = "true";
  dom.dataset.qkNodeView = "floatingObject";
  dom.style.boxSizing = "border-box";
  dom.style.border = "1px solid #64748b";
  dom.style.margin = "12px 0";
  dom.style.position = "relative";
  dom.style.maxWidth = "100%";

  contentDOM.dataset.qkFloatingObjectContent = "true";
  contentDOM.style.boxSizing = "border-box";
  contentDOM.style.minHeight = "100%";
  contentDOM.style.padding = "12px";

  dom.append(contentDOM);
  applyNodeGeometry(dom, props.node);

  return {
    dom,
    contentDOM,

    /** @param node - Updated source node. @returns Whether this view accepted it. */
    update(node: ProseMirrorNode): boolean {
      if (node.type !== props.node.type) {
        return false;
      }
      return applyNodeGeometry(dom, node);
    },

    /** Marks object selection without changing nested content DOM. */
    selectNode(): void {
      dom.dataset.qkSelected = "true";
      dom.style.outline = "2px solid #2563eb";
    },

    /** Clears transient object-selection chrome. */
    deselectNode(): void {
      delete dom.dataset.qkSelected;
      dom.style.outline = "none";
    },

    /** Releases no external resources because HTML omits manipulation chrome. */
    destroy(): void {}
  };
}

/**
 * Applies valid persisted dimensions without introducing paginated positioning.
 *
 * @param dom - Retained source-order figure.
 * @param node - Current floating-object source node.
 * @returns Whether canonical geometry was valid.
 */
function applyNodeGeometry(dom: HTMLElement, node: ProseMirrorNode): boolean {
  const geometry = readFloatingObjectGeometry(node.attrs);
  if (geometry === undefined) {
    return false;
  }
  dom.style.width = `${geometry.width}px`;
  dom.style.minHeight = `${geometry.minHeight}px`;
  dom.dataset.qkFloatingObjectWidth = String(geometry.width);
  dom.dataset.qkFloatingObjectMinHeight = String(geometry.minHeight);
  dom.dataset.qkFloatingObjectInlineOffset = String(geometry.inlineOffset);
  dom.dataset.qkFloatingObjectBlockOffset = String(geometry.blockOffset);
  return true;
}
