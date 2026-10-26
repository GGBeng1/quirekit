/** Canonical snapshot for one mounted DOM node. */
export interface HtmlOwnedNodeSnapshot {
  /** Canonical node value for text owners. */
  readonly nodeValue: string | null;
  /** Canonical attributes for element owners. */
  readonly attributes: ReadonlyMap<string, string>;
  /** Canonical direct child identity and order. */
  readonly children: readonly Node[];
}

/** Captures canonical DOM facts recursively without cloning owned identity. */
export function captureHtmlOwnedSubtree(
  node: Node,
  snapshots: WeakMap<Node, HtmlOwnedNodeSnapshot>
): void {
  snapshots.set(node, {
    nodeValue: node.nodeValue,
    attributes: readHtmlAttributes(node),
    children: Array.from(node.childNodes)
  });
  for (const child of Array.from(node.childNodes)) {
    captureHtmlOwnedSubtree(child, snapshots);
  }
}

/** Restores one smallest mutated DOM scope from its canonical snapshot. */
export function restoreHtmlOwnedNode(
  node: Node,
  snapshots: WeakMap<Node, HtmlOwnedNodeSnapshot>
): void {
  const snapshot = snapshots.get(node);
  if (!snapshot) {
    return;
  }
  if (node.nodeType === 3) {
    node.nodeValue = snapshot.nodeValue;
    return;
  }
  if (node.nodeType === 1) {
    const element = node as Element;
    for (const name of element.getAttributeNames()) {
      if (!snapshot.attributes.has(name)) {
        element.removeAttribute(name);
      }
    }
    for (const [name, value] of snapshot.attributes) {
      element.setAttribute(name, value);
    }
  }
  if (!sameHtmlChildren(node.childNodes, snapshot.children)) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    for (const child of snapshot.children) {
      node.appendChild(child);
    }
  }
}

/** Reads exact attributes for an element node. */
function readHtmlAttributes(node: Node): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();
  if (node.nodeType === 1) {
    const element = node as Element;
    for (const name of element.getAttributeNames()) {
      attributes.set(name, element.getAttribute(name) ?? "");
    }
  }
  return attributes;
}

/** Compares child identity and order without querying descendants. */
function sameHtmlChildren(
  actual: NodeListOf<ChildNode> | readonly Node[],
  expected: readonly Node[]
): boolean {
  return actual.length === expected.length &&
    expected.every((child, index) => actual[index] === child);
}
