import { mindMapRuntimeMessages } from "../locale";
import type { SimpleInstance } from "../../vendor/types";
import type { MindMapHit } from "./types";

/**
 * Creates a transient gesture layer outside the document SVG and export bounds.
 * @param mount - Owned clipping boundary.
 * @param instance - Current viewport.
 * @param moving - Visible nodes in dragged subtrees; empty for marquee selection.
 * @returns Lightweight rectangle/ghost updates and cleanup.
 */
export function createMindMapGesturePreview(mount: HTMLElement, instance: SimpleInstance, moving: readonly MindMapHit[]) {
  const layer = document.createElement("div"); layer.dataset.mindGesture = moving.length ? "drag" : "marquee";
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;";
  const rect = document.createElement("div");
  rect.style.cssText = "position:absolute;box-sizing:border-box;border:1px solid var(--qk-mind-accent,#4855ec);background:color-mix(in srgb,var(--qk-mind-accent,#4855ec) 16%,transparent);display:none;";
  const label = document.createElement("div");
  label.style.cssText = "position:absolute;top:16px;left:50%;transform:translateX(-50%);padding:8px 14px;border:1px solid var(--qk-mind-accent,#4855ec);border-radius:6px;background:var(--qk-color-surface-page,#fff);color:var(--qk-color-text-primary,#172033);font:13px sans-serif;white-space:nowrap;";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:.65;";
  const group = document.createElementNS(svg.namespaceURI, "g");
  moving.forEach(hit => hit.node._lines.forEach(line => group.append(line.node.cloneNode(true))));
  moving.forEach(hit => {
    const clone = hit.node.group?.node.cloneNode(true) as SVGGElement | undefined;
    if (clone) { clone.classList.remove("active", "smm-node"); clone.querySelectorAll(".smm-expand-btn").forEach(button => button.remove()); group.append(clone); }
  });
  svg.append(group); layer.append(rect);
  if (moving.length) { layer.append(svg, label); }
  mount.append(layer);
  return {
    /** @param x - Container left. @param y - Container top. @param width - Width. @param height - Height. */
    rectangle(x: number, y: number, width: number, height: number): void {
      Object.assign(rect.style, { display: "block", left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    },
    /** @param dx - World delta x. @param dy - World delta y. @param target - Valid destination. @param invalid - Pointer is over a moved descendant. */
    drag(dx: number, dy: number, target?: MindMapHit, invalid = false): void {
      const { x, y, scale } = instance.view;
      group.setAttribute("transform", `translate(${x} ${y}) scale(${scale}) translate(${dx} ${dy})`);
      const text = mindMapRuntimeMessages(mount.lang);
      label.textContent = invalid ? text.invalidDrop : target ? text.attach.replace("{topic}", () => String(target.node.getData("text"))) : text.detach;
      rect.style.display = "none";
      if (target) this.rectangle(target.x * scale + x - 4, target.y * scale + y - 4,
        target.width * scale + 8, target.height * scale + 8);
    },
    /** Removes all transient projection elements. */ dispose(): void { layer.remove(); },
  };
}
