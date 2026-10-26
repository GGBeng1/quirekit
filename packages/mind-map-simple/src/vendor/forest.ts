import type { SimpleInstance, SimpleNode, SimpleTree } from "./types";
import { installSimpleTranslation } from "./translation";

/**
 * Composes independent trees using the pinned layout's existing geometry phases.
 * @param instance - Newly constructed vendor, before the first scheduled render.
 */
export function installSimpleForest(instance: SimpleInstance): void {
  const renderer = instance.renderer, layout = renderer.layout;
  const create = layout.createNode.bind(layout), center = layout.setNodeCenter.bind(layout);
  const lines = layout.renderLine.bind(layout);
  const expand = layout.renderExpandBtn.bind(layout), logicalLeft = layout.isUseLeft;
  const timeline = instance.opt.layout === "timeline";
  /** Runs one admitted geometry pipeline without yielding the temporary forest carrier. */
  function geometry(): void {
    layout.computedBaseValue();
    if (layout.computedLeftValue) { layout.computedLeftValue(); layout.adjustLeftValue!(); }
    else if (layout.computedLeftTopValue) { layout.computedLeftTopValue(); layout.adjustLeftTopValue!(); }
    else { layout.computedTopValue(); layout.adjustTopValue(); }
  }
  let position: SimpleTree["data"]["_quirekitFree"];
  let main: SimpleNode | undefined;

  /** @param data - Source. @param parent - Parent. @param root - Tree root. @param depth - Local depth.
   * @param index - Sibling index. @param ancestors - Ancestry. @returns Node with independent style and ownership. */
  layout.createNode = (data, parent, root, depth, index, ancestors) => {
    const node = create(data, parent, root, depth + (position ? 1 : 0), index, ancestors);
    installSimpleTranslation(node.group);
    if (root) { node.parent = null; node.dir = position?.side; }
    else if (logicalLeft !== undefined) node.dir = layout.isUseLeft ? "left" : "right";
    node.isRoot = root && (!position || timeline);
    return node;
  };
  /** @param node - Current independent root. */
  layout.setNodeCenter = node => {
    if (position && main) { node.left = main.left + position.x; node.top = main.top + position.y; }
    else center(node);
  };
  /** @param callback - Receives one traversal carrier with independently laid out trees. */
  layout.doLayout = callback => {
    const carrier = renderer.renderTree, children = carrier.children;
    const free = children.filter(child => child.data._quirekitFree);
    const roots: SimpleNode[] = [];
    // Each tree consumes the same world origin and node cache, but no other tree's
    // siblings or spacing. This synchronous scope cannot leak a partial carrier to history.
    try {
      carrier.children = children.filter(child => !child.data._quirekitFree);
      position = undefined;
      geometry();
      main = layout.root;
      for (const tree of free) {
        renderer.renderTree = tree; position = tree.data._quirekitFree;
        if (logicalLeft !== undefined) layout.isUseLeft = position?.side === "left";
        geometry();
        if (timeline) layout.root.isRoot = false;
        roots.push(layout.root);
      }
    } finally {
      carrier.children = children; renderer.renderTree = carrier; position = undefined;
      if (logicalLeft !== undefined) layout.isUseLeft = logicalLeft;
    }
    layout.root = main!;
    main!.children.push(...roots);
    callback(main!);
  };
  /** @param node - Outgoing owner. @param paths - Vendor paths. @param style - Style callback. @param kind - Line style. */
  layout.renderLine = (node, paths, style, kind) => {
    const all = node.children;
    // Forest roots participate in rendering and lookup, never in the main root's edges.
    try {
      if (node !== main && logicalLeft !== undefined) layout.isUseLeft = node.dir === "left";
      if (node === main) {
        node.children = all.filter(child => !child.getData("_quirekitFree"));
        paths.slice(node.children.length).forEach(path => path.plot(""));
      }
      const localRoot = timeline ? (node.getData("_quirekitFree") ? node : node.parent?.getData("_quirekitFree") ? node.parent : null) : null;
      try { if (localRoot) localRoot.isRoot = true; lines(node, paths, style, kind); }
      finally { if (localRoot) localRoot.isRoot = false; }
    } finally { node.children = all; if (logicalLeft !== undefined) layout.isUseLeft = logicalLeft; }
  };
  /** @param node - Owner with a projected local direction. @param button - Vendor SVG group. */
  layout.renderExpandBtn = (node, button) => {
    try { if (logicalLeft !== undefined && node !== main) layout.isUseLeft = node.dir === "left"; expand(node, button); }
    finally { if (logicalLeft !== undefined) layout.isUseLeft = logicalLeft; }
  };
}
