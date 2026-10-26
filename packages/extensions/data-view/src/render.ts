import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { DataViewOptions } from "./types";
import { dataViewNodeView } from "./view";

const interactiveRoots = new WeakSet<object>();

/** Records actual interactive mounts, keeping fallback activation independent of configuration.
 * @param props - Exact mounted node environment.
 * @param options - Optional host renderer and workspace.
 * @returns Host view or the complete static fallback.
 */
export function renderDataView(props: QuireNodeViewRendererProps, options: DataViewOptions): unknown {
  const rendered = options.render?.(props);
  if (rendered == null) return dataViewNodeView(props, options);
  if (typeof rendered === "object" && "dom" in rendered && rendered.dom && typeof rendered.dom === "object") interactiveRoots.add(rendered.dom);
  return rendered;
}

/** Checks the exact HTML node view only at an explicit activation boundary.
 * @param view - Mounted view; canvas and headless views may omit DOM mapping.
 * @param position - Selected or double-clicked atom position.
 * @returns Whether an interactive renderer owns this occurrence's activation.
 */
export function isInteractiveDataView(view: object, position: number): boolean {
  if (!("nodeDOM" in view) || typeof view.nodeDOM !== "function") return false;
  const dom: unknown = view.nodeDOM(position);
  return !!dom && typeof dom === "object" && interactiveRoots.has(dom);
}
