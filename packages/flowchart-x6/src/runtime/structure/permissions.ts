import type { Cell } from "@antv/x6";
import type { FlowRuntime } from "../types";

/** @param cell - Runtime object. @returns Effective direct-edit permission through bounded ownership. */
export function isLocked(cell: Cell): boolean {
  let current: Cell | null = cell;
  while (current) {
    if (current.getData<{ source?: { locked?: boolean } }>()?.source?.locked) return true;
    current = current.getParent();
  }
  return false;
}
/** @param runtime - Selection authority. @returns Whether a direct or inherited lock blocks the current selection. */
export function selectionLocked(runtime: FlowRuntime): boolean { return runtime.graph.getSelectedCells().some(isLocked); }
/** @param runtime - Writable graph. @param all - Whether the operation targets the entire graph. Rejects editing locked targets before any mutation. */
export function requireUnlocked(runtime: FlowRuntime, all = false): void {
  if ((all ? runtime.graph.getCells() : runtime.graph.getSelectedCells()).some(isLocked)) throw new Error("选中对象已锁定，请先解锁");
}
/** @param runtime - Host and transient presentation authority. Rejects every authoring path before source or pending text can change. */
export function requireAuthoring(runtime: FlowRuntime): void {
  if (runtime.readOnly) throw new Error("流程图为只读");
  if (runtime.presenting) throw new Error("请退出演示后再编辑图形");
}
/** @param runtime - Selection plugin whose group movement bypasses per-cell interactivity. */
export function syncSelectionPermission(runtime: FlowRuntime): void {
  runtime.graph.toggleSelectionMovable(!runtime.readOnly && !runtime.presenting && !selectionLocked(runtime));
}
/** @param cell - Clicked member. @returns Outermost explicit group, without crossing ordinary container ownership. */
export function outerGroup(cell: Cell): Cell {
  let current = cell, parent = current.getParent();
  while (parent?.getData<{ source?: { shape?: string } }>()?.source?.shape === "group") { current = parent; parent = current.getParent(); }
  return current;
}
