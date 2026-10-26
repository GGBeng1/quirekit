import type { FlowRuntime } from "../../runtime/types";

/** @param root - Live or detached SVG subtree. Restores exact authored opacity and removes presentation-only metadata. */
export function restoreMotionOpacity(root: ParentNode): void {
  root.querySelectorAll("[data-flow-authored-opacity]").forEach(element => {
    const value = element.getAttribute("data-flow-authored-opacity")!;
    if (value === "absent") element.removeAttribute("opacity"); else element.setAttribute("opacity", value);
    element.removeAttribute("data-flow-authored-opacity");
  });
}
/** @param runtime - Current graph owner. @param part - Whole cells or just their painted connector lines. @returns Sparse source-view opacity port with exact exit/export restoration. */
export function createMotionVisibility(runtime: FlowRuntime, part: "cell" | "line" = "cell") {
  const targets = new Map<string, readonly Element[]>();
  /** @param id - Canonical target. @param opacity - Transient visibility, independent of Cell attributes. */
  function set(id: string, opacity: number): void {
    let views = targets.get(id);
    if (!views) {
      const cell = runtime.graph.getCellById(id), view = cell && runtime.graph.findViewByCell(cell);
      if (!view) return;
      views = part === "cell" ? [view.container] : [view.findOne("line"), view.findOne("drawing")].filter((element): element is Element => !!element);
      for (const element of views) element.setAttribute("data-flow-authored-opacity", element.getAttribute("opacity") ?? "absent");
      targets.set(id, views);
    }
    for (const view of views) {
      const source = view.getAttribute("data-flow-authored-opacity")!, original = source === "absent" ? 1 : Number(source);
      view.setAttribute("opacity", String(opacity * (Number.isFinite(original) ? original : 1)));
    }
  }
  /** Restores only views touched by this presentation, before another baseline is applied. */
  function clear(): void {
    for (const views of targets.values()) for (const element of views) {
      const value = element.getAttribute("data-flow-authored-opacity")!;
      if (value === "absent") element.removeAttribute("opacity"); else element.setAttribute("opacity", value);
      element.removeAttribute("data-flow-authored-opacity");
    }
    targets.clear();
  }
  return { set, clear };
}
