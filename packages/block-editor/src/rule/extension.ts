import { HorizontalRule } from "@quirekit/extension-horizontal-rule";
import { DOMSerializer, type Node } from "@quirekit/pm";
import { withBlockAtomicSelection } from "../selection/atomic";
import { blockRuleMenu } from "./menu";

/** Canonical rule semantics with a comfortable HTML hit area around the line. */
export const BlockHorizontalRule = withBlockAtomicSelection(HorizontalRule).extend({
  /** @returns Shared style operations for this atomic block. */
  addBlockMenuProviders() { return [blockRuleMenu]; },
  /** @returns An inert NodeView; the shared View owns selection and keyboard input. */
  addNodeView() {
    return ({ node, view }) => {
      const document = view.dom.ownerDocument;
      const dom = document.createElement("div");
      const serializer = DOMSerializer.fromSchema(node.type.schema);
      dom.className = "qk-block-rule";
      dom.contentEditable = "false";
      dom.setAttribute("role", "separator");
      dom.setAttribute("aria-label", "分隔线");
      /** @param current - Accepted node; the serializer remains the only style projection. */
      function project(current: Node): void {
        const line = serializer.serializeNode(current, { document }) as HTMLElement;
        line.setAttribute("aria-hidden", "true");
        dom.replaceChildren(line);
      }
      project(node);
      return { dom,
        /** @param next - Updated canonical source. @returns Whether this mount still represents the same node type. */
        update(next: Node) { if (next.type !== node.type) return false; project(next); return true; },
        /** @returns The wrapper contains no editable DOM content. */
        ignoreMutation() { return true; }
      };
    };
  }
});
