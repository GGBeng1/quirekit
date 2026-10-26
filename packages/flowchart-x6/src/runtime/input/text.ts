import { bindFlowLocale } from "../locale/controls";
import { flowRuntimeText } from "../locale/messages";
import { isLocked } from "../structure/permissions";
import type { Cell, Edge } from "@antv/x6";
import { readFlowchart, serializeFlowchart, replaceFlowchartText } from "@quirekit/flowchart";
import { captionLayout } from "../../geometry/caption";
import { readNode, readEdge, readGraph } from "../../codec/read";
import { presentCell } from "../presentation";
import type { FlowRuntime, FlowTextInput } from "../types";
import { bindFlowIme } from "./ime";

/** @param runtime - Instance state and coordinate authority. @returns Native text lifecycle without global listeners. */
export function createTextInput(runtime: FlowRuntime): FlowTextInput {
  let active: Cell | undefined, input: HTMLTextAreaElement | undefined;
  const unbindLocale = bindFlowLocale(runtime, () => { if (input) input.setAttribute("aria-label", flowRuntimeText(runtime.locale, active?.isNode() ? "图形文字" : "连线文字")); });
  let ime: ReturnType<typeof bindFlowIme> | undefined;
  /** Releases the overlay and restores the one visible SVG caption. */
  function close(): void {
    ime?.destroy(); ime = undefined; input?.remove(); input = undefined;
    const cell = active; active = undefined;
    if (cell && !runtime.destroyed && runtime.graph.hasCell(cell)) {
      runtime.graph.findViewByCell(cell)?.container.querySelector<SVGElement>(".x6-edge-label")?.style.removeProperty("visibility");
      presentCell(cell, runtime);
    }
    runtime.notify();
  }
  /** Commits one immutable text replacement to graph history. */
  function commit(): void {
    if (!active || !input) return;
    if (ime?.isComposing()) throw new Error("请完成中文输入后再操作");
    if (runtime.readOnly || runtime.presenting || isLocked(active)) { close(); return; }
    const cell = active, value = input.value;
    const source = cell.isNode() ? replaceFlowchartText(readNode(cell), value) : { ...readEdge(cell as Edge), label: value };
    // Confirmation is an explicit command boundary: check aggregate source
    // budgets before one mutation, never on input/selection/pointer movement.
    const before = readGraph(runtime.graph, runtime.options.document.revision);
    serializeFlowchart(readFlowchart({ ...before, nodes: before.nodes.map(node => node.id === cell.id ? source : node), edges: before.edges.map(edge => edge.id === cell.id ? source : edge) }));
    const previous = cell.isNode() ? readNode(cell).text : readEdge(cell as Edge).label;
    close();
    if (value !== previous) cell.setData({ source }, { overwrite: true });
  }
  /** @param id - Node or connector identity. */
  function open(id: string): void {
    if (runtime.readOnly || runtime.presenting || runtime.exporting || runtime.destroyed) return;
    commit();
    const cell = runtime.graph.getCellById(id);
    if (!cell || isLocked(cell) || (cell.isNode() && readNode(cell).shape === "group")) return;
    if (cell.isNode() && readNode(cell).image) { runtime.graph.resetSelection(cell.id); runtime.options.onImageEdit?.(cell.id); return; }
    active = cell;
    const theme = runtime.appearance, view = runtime.graph.findViewByCell(cell);
    const node = cell.isNode() ? readNode(cell) : undefined;
    const box = cell.getBBox();
    if (node) {
      const caption = captionLayout(node);
      box.x = node.x + caption.left; box.y = node.y + caption.top; box.width = caption.width; box.height = caption.height;
    }
    const bounds = node ? runtime.graph.localToClient(box) : view?.container.querySelector(".x6-edge-label")?.getBoundingClientRect();
    if (!bounds) { active = undefined; return; }
    const host = runtime.mount.getBoundingClientRect(), scale = runtime.graph.zoom();
    input = runtime.mount.ownerDocument.createElement("textarea");
    input.setAttribute("aria-label", flowRuntimeText(runtime.locale, node ? "图形文字" : "连线文字"));
    input.placeholder = flowRuntimeText(runtime.locale, node ? "图形文字" : "连线文字");
    input.dataset.flowText = "";
    input.value = node ? node.text : readEdge(cell as Edge).label;
    const width = node ? bounds.width : Math.max(140, bounds.width + 24);
    const height = node ? bounds.height : Math.max(56, bounds.height + 24);
    Object.assign(input.style, { position: "absolute", zIndex: "10", left: `${bounds.x - host.x - (width - bounds.width) / 2}px`,
      top: `${bounds.y - host.y - (height - bounds.height) / 2}px`, width: `${width}px`, height: `${height}px`,
      boxSizing: "border-box", resize: "none", border: `1px solid ${theme.primary}`, borderRadius: "4px", outline: "none",
      padding: "0", background: node?.style.fill ?? theme.surface, color: node?.style.color ?? theme.text,
      font: `${node?.style.bold ? 600 : 400} ${(node?.style.fontSize ?? 14) * scale}px ${theme.fontFamily}`, textAlign: node?.style.textAlign ?? "center", lineHeight: "1.4" });
    cell.attr(node ? node.textSpans?.length ? "richLabel/opacity" : "label/opacity" : "line/opacity", node ? 0 : 1, { qkDerived: true });
    if (!node) view?.container.querySelector<SVGElement>(".x6-edge-label")?.style.setProperty("visibility", "hidden");
    if (node?.rotation) {
      const caption = captionLayout(node);
      input.style.transformOrigin = `${(node.width / 2 - caption.left) * scale}px ${(node.height / 2 - caption.top) * scale}px`;
      input.style.transform = `rotate(${node.rotation}deg)`;
    }
    runtime.mount.append(input);
    ime = bindFlowIme(input, runtime.notify);
    input.addEventListener("keydown", event => {
      event.stopPropagation();
      if (ime?.guard(event)) return;
      try {
        if (event.key === "Escape") { event.preventDefault(); close(); runtime.mount.focus(); }
        else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); commit(); runtime.mount.focus(); }
      } catch (error) { runtime.fail(error); }
    });
    input.addEventListener("pointerdown", event => event.stopPropagation());
    input.addEventListener("mousedown", event => event.stopPropagation());
    input.focus(); input.select();
  }
  return { open, commit, cancel: close, /** Releases control labels and the native input together. */ destroy() { unbindLocale(); close(); },
    /** @returns Current native composition ownership. */ isComposing: () => ime?.isComposing() ?? false };
}
