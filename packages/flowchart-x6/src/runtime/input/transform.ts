import { bindFlowLocale } from "../locale/controls";
import { flowRuntimeText } from "../locale/messages";
import type { FlowRuntime } from "../types";

// The vendor scales the selection bounds, not the handle elements. Keep this
// chrome in screen CSS pixels so zooming never shrinks its hit target.
const styles = `
[data-quirekit-flowchart] {
  --qk-flow-control-color: color-mix(in srgb, var(--qk-flow-control-accent) 82%, var(--qk-flow-control-line));
}
[data-quirekit-flowchart] .x6-widget-transform {
  border-color: var(--qk-flow-control-color); border-style: solid; border-radius: 0;
}
[data-quirekit-flowchart] .x6-widget-selection-box,
[data-quirekit-flowchart] .x6-widget-selection-inner {
  border-color: transparent; outline: 1px solid var(--qk-flow-control-color); box-shadow: none;
}
[data-quirekit-flowchart] .x6-widget-transform-active { border-color: transparent; }
[data-quirekit-flowchart] .x6-widget-transform > .x6-widget-transform-resize {
  border-color: var(--qk-flow-control-color); background: var(--qk-flow-control-surface);
}
[data-quirekit-flowchart] .x6-widget-transform > .x6-widget-transform-resize:hover,
[data-quirekit-flowchart] .x6-widget-transform > .x6-widget-transform-resize.x6-widget-transform-active-handle {
  border-color: var(--qk-flow-control-accent);
  background: color-mix(in srgb, var(--qk-flow-control-accent) 14%, var(--qk-flow-control-surface));
}
[data-quirekit-flowchart] .x6-widget-transform > .qk-flow-rotate {
  top: -40px; left: 50%; width: 28px; height: 28px; transform: translateX(-50%);
  border-radius: 0; border: 0; background: transparent; box-shadow: none;
  color: var(--qk-flow-control-color); cursor: grab; touch-action: none;
}
[data-quirekit-flowchart] .qk-flow-rotate > svg {
  position: absolute; top: 4px; left: 4px; width: 20px; height: 20px;
  fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round;
  stroke-linejoin: round; pointer-events: none;
}
[data-quirekit-flowchart] .x6-widget-transform > .qk-flow-rotate:hover,
[data-quirekit-flowchart] .x6-widget-transform > .qk-flow-rotate.x6-widget-transform-active-handle {
  color: var(--qk-flow-control-accent);
}
[data-quirekit-flowchart] .x6-widget-transform > .qk-flow-rotate.x6-widget-transform-active-handle { cursor: grabbing; }
`;

/** @param runtime - Instance-owned screen controls and current appearance. */
export function updateTransformAppearance(runtime: FlowRuntime): void {
  runtime.mount.style.setProperty("--qk-flow-control-accent", runtime.appearance.primary);
  runtime.mount.style.setProperty("--qk-flow-control-line", runtime.appearance.line);
  runtime.mount.style.setProperty("--qk-flow-control-surface", runtime.appearance.surface);
}

/** @param runtime - Mounted graph after the native Transform plugin. @returns Instance listener/style cleanup. */
export function bindTransformControls(runtime: FlowRuntime): () => void {
  const { graph, mount } = runtime, document = mount.ownerDocument;
  const style = document.createElement("style"); style.textContent = styles; mount.append(style);
  updateTransformAppearance(runtime);
  /** Decorates only the newly created native handle; pointer ownership remains with Transform. */
  function present(): void {
    const handle = mount.querySelector<HTMLElement>(".x6-widget-transform-rotate");
    if (!handle || handle.classList.contains("qk-flow-rotate")) return;
    handle.classList.add("qk-flow-rotate"); handle.title = flowRuntimeText(runtime.locale, "拖动旋转图形");
    handle.setAttribute("aria-label", handle.title);
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("aria-hidden", "true");
    // Native graph adornment stays independent of framework UI and document SVG.
    const arc = document.createElementNS(icon.namespaceURI, "path");
    arc.setAttribute("d", "M12 5a7 7 0 1 0 7 7");
    const head = document.createElementNS(icon.namespaceURI, "path");
    head.setAttribute("d", "m11 1 6 4-6 4Z"); head.setAttribute("fill", "currentColor"); head.setAttribute("stroke", "none");
    icon.append(arc, head); handle.append(icon);
  }
  // Transform's node:click listener creates its handle synchronously first.
  // No observer or model/move subscription is needed for a static affordance.
  const unbindLocale = bindFlowLocale(runtime, () => {
    const handle = mount.querySelector<HTMLElement>(".qk-flow-rotate");
    if (handle) { handle.title = flowRuntimeText(runtime.locale, "拖动旋转图形"); handle.setAttribute("aria-label", handle.title); }
  });
  graph.on("node:click", present);
  return () => { unbindLocale(); graph.off("node:click", present); style.remove(); };
}
