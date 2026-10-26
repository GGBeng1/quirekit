import type { Cell, EventArgs } from "@antv/x6";
import { outerGroup } from "../structure/permissions";
import type { FlowRuntime, FlowTextInput } from "../types";

/** @param runtime - Isolated canvas and host callback. @param text - Native editing owner. @returns Context listener cleanup. */
export function bindContext(runtime: FlowRuntime, text: FlowTextInput): () => void {
  const { graph, mount } = runtime;
  /** @param target - Hit cell; undefined for canvas or keyboard. @param x - Client x. @param y - Client y. @param keyboard - Retain current selection. */
  function open(target: Cell | undefined, x: number, y: number, keyboard = false): void {
    if (!runtime.options.onContextMenu || runtime.destroyed || runtime.exporting || runtime.dragging || text.isComposing()) return;
    try {
      text.commit();
      if (!keyboard) {
        const cell = target ? outerGroup(target) : undefined;
        if (cell && !graph.isSelected(cell)) graph.resetSelection(cell);
      }
      runtime.options.onContextMenu({ x, y });
    } catch (error) { runtime.fail(error); }
  }
  /** @param args - Vendor hit with original client coordinates. */
  function cell(args: EventArgs["cell:contextmenu"]): void { if (runtime.options.onContextMenu && !(args.e.target as Element).closest("input,textarea,[contenteditable]")) { args.e.preventDefault(); open(args.cell, args.e.clientX, args.e.clientY); } }
  /** @param args - Blank canvas hit. */
  function blank(args: EventArgs["blank:contextmenu"]): void { if (runtime.options.onContextMenu && !(args.e.target as Element).closest("input,textarea,[contenteditable]")) { args.e.preventDefault(); open(undefined, args.e.clientX, args.e.clientY); } }
  /** @param event - Native overlay gesture. @returns Whether X6's selection overlay owns the hit, excluding native text. */
  function overlay(event: MouseEvent): boolean {
    const target = event.target as Element;
    return !target.closest("input,textarea,[contenteditable]") && !!target.closest(".x6-widget-selection");
  }
  /** @param event - Right press on the retained selection. Prevents the vendor overlay from starting a move batch for a menu gesture. */
  function press(event: MouseEvent): void {
    if (event.button === 2 && overlay(event)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  /** @param event - Native menu hit above the SVG cells. Resolves selection ownership before X6 can misclassify it as blank canvas. */
  function menu(event: MouseEvent): void {
    if (!runtime.options.onContextMenu || !overlay(event)) return;
    event.preventDefault(); event.stopImmediatePropagation(); open(undefined, event.clientX, event.clientY, true);
  }
  /** @param event - Keyboard menu intent, outside native inputs. */
  function key(event: KeyboardEvent): void {
    if (!runtime.options.onContextMenu || (event.target as HTMLElement).closest("input,textarea,[contenteditable]") || event.isComposing || event.keyCode === 229) return;
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault(); event.stopPropagation();
    const selected = graph.getSelectedCells()[0], rect = mount.getBoundingClientRect();
    const point = selected ? graph.localToClient(selected.getBBox().getCenter()) : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    open(undefined, Math.max(rect.left, Math.min(rect.right - 20, point.x)), Math.max(rect.top, Math.min(rect.bottom - 20, point.y)), true);
  }
  graph.on("cell:contextmenu", cell); graph.on("blank:contextmenu", blank); mount.addEventListener("keydown", key);
  mount.addEventListener("mousedown", press, true); mount.addEventListener("contextmenu", menu, true);
  return () => {
    graph.off("cell:contextmenu", cell); graph.off("blank:contextmenu", blank); mount.removeEventListener("keydown", key);
    mount.removeEventListener("mousedown", press, true); mount.removeEventListener("contextmenu", menu, true);
  };
}
