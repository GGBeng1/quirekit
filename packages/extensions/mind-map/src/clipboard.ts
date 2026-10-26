import { Fragment, Slice, type Node } from "@quirekit/pm";
import { readMindMapNode } from "./source";
import { v4 as uuidv4 } from "uuid";

/** @param slice - Source-preserving clipboard fragment. @returns Independent host identities with mind map-local references unchanged. */
export function forkMindMapSlice(slice: Slice): Slice {
  /** @param node - Clipboard node, not a mounted document owner. @returns A detached copy where a mindMap is encountered. */
  function copy(node: Node): Node {
    if (node.type.name === "mindMap") {
      const mind = readMindMapNode(node);
      return mind ? node.type.create({ ...node.attrs, mind: { ...mind, id: uuidv4() } }, null, node.marks) : node;
    }
    if (node.isLeaf) return node;
    const children: Node[] = []; node.content.forEach(child => children.push(copy(child)));
    return node.copy(Fragment.fromArray(children));
  }
  const nodes: Node[] = []; slice.content.forEach(node => nodes.push(copy(node)));
  return new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd);
}
