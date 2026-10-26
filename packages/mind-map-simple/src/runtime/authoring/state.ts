import type { MindMapStructureCommand } from "@quirekit/mind-map";
import type { SimpleInstance } from "../../vendor/types";

/** @param instance - Live selection and retained parent links. @returns Availability without source reads or layout work. */
export function mindMapStructureState(instance: SimpleInstance): Readonly<Record<MindMapStructureCommand, boolean>> {
  const nodes = instance.renderer.activeNodeList, node = nodes.length === 1 ? nodes[0] : undefined;
  const parent = node?.parent;
  const siblings = parent?.children.filter(child => child.parent === parent &&
    (!parent.isRoot || instance.opt.layout !== "mindMap" || child.dir === node?.dir)) ?? [];
  const index = node ? siblings.indexOf(node) : -1;
  return { "add-parent": !!node && !node.isRoot, indent: !!parent && index > 0,
    outdent: !!parent?.parent, "move-up": !!parent && index > 0,
    "move-down": !!parent && index >= 0 && index < siblings.length - 1,
    "expand-selected": nodes.length > 0, "collapse-selected": nodes.length > 0,
    "expand-all": true, "collapse-all": true };
}
