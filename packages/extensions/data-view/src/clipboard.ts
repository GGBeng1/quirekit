import { v4 as uuidv4 } from "uuid";
import { Fragment, Slice, type Node } from "@quirekit/pm";
import { copyDataView } from "@quirekit/data-view";

/** Forks source identities on copy while preserving external dataset references.
 * @param slice - Clipboard content.
 * @returns Content with independent inline data identities.
 */
export function forkDataViewSlice(slice: Slice): Slice {
  /** @param node - Clipboard subtree. @returns Forked or source-preserved subtree. */
  function fork(node: Node): Node {
    if (node.type.name === "dataView") {
      try { return node.type.create({...node.attrs, dataView: copyDataView(node.attrs.dataView, uuidv4())}, node.content, node.marks); } catch { return node; }
    }
    return node.isLeaf ? node : node.copy(Fragment.fromArray(node.content.content.map(fork)));
  }
  return new Slice(Fragment.fromArray(slice.content.content.map(fork)), slice.openStart, slice.openEnd);
}
