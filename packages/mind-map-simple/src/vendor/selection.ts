import type { SimpleInstance, SimpleNode } from "./types";

/**
 * Prevents the pinned layout's transient selection restoration from snapshotting the forest.
 * @param instance - Owned vendor command surface.
 * @returns Lifetime cleanup restoring only this instance's original command method.
 */
export function bindSimpleSelectionProjection(instance: SimpleInstance): () => void {
  const execute = instance.execCommand;
  /** @param name - Vendor command. @param args - Original arguments. */
  function project(name: string, ...args: unknown[]): void {
    const node = args[0] as SimpleNode | undefined, patch = args[1];
    // isActive is the only nonpersistent field admitted here. Text, structure and
    // mixed data patches keep the original command and its history lifecycle.
    if (name === "SET_NODE_DATA" && node?.nodeData?.data && patch && typeof patch === "object"
      && Object.keys(patch).length === 1 && "isActive" in patch && typeof patch.isActive === "boolean") {
      node.nodeData.data.isActive = patch.isActive; return;
    }
    execute.call(instance, name, ...args);
  }
  instance.execCommand = project;
  return () => { if (instance.execCommand === project) instance.execCommand = execute; };
}

/**
 * Applies selection differences without executing persistent commands or serializing history.
 * @param instance - Current renderer.
 * @param next - Desired visible selection.
 */
export function setMindMapSelection(instance: SimpleInstance, next: readonly SimpleNode[]): void {
  const list = instance.renderer.activeNodeList, previous = new Set(list), wanted = new Set(next);
  if (previous.size === wanted.size && next.every(node => previous.has(node))) return;
  // Vendor node.setData wraps a persistent command and snapshots the whole tree.
  // Selection is ephemeral: project just its flag and outline, then notify once.
  for (const node of list) if (!wanted.has(node)) { node.nodeData.data.isActive = false; node.updateNodeByActive(false); }
  for (const node of next) if (!previous.has(node)) { node.nodeData.data.isActive = true; node.updateNodeByActive(true); }
  list.splice(0, list.length, ...next);
  if (instance.renderer.emitNodeActiveEventTimer !== null) clearTimeout(instance.renderer.emitNodeActiveEventTimer);
  instance.renderer.emitNodeActiveEventTimer = null;
  instance.renderer.lastActiveNodeList = [...next];
  instance.emit("node_active", next[0] ?? null, [...next]);
}
