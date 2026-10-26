import type { MindMapDocument } from "@quirekit/mind-map";
import { fromSimpleTree } from "../codec/mapping";
import type { SimpleInstance, SimpleTree } from "../vendor/types";

/** @param instance - Stable owned runtime. @param base - Captured host metadata.
 * @returns Detached canonical source with the native input's literal value, without invoking input commit or geometry. */
export function captureMindMapDraft(instance: SimpleInstance, base: MindMapDocument): MindMapDocument {
  const tree = instance.getData() as SimpleTree, edit = instance.renderer.textEdit, current = edit.getCurrentEditNode();
  if (current) {
    const id = current.getData("uid"), text = edit.getEditText();
    /** @param node - Detached vendor subtree. */
    function project(node: SimpleTree): void { if (node.data.uid === id) node.data.text = text; node.children.forEach(project); }
    project(tree);
  }
  return fromSimpleTree(tree, base);
}
