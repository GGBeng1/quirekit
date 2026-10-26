import { createFlowchartNode, type FlowchartShape } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../../types";
import { requireIdle } from "../commands";
import { requireAuthoring } from "../structure/permissions";
import type { FlowRuntime, FlowTextInput } from "../types";
import { createPlacementPreview } from "./preview";

/** @param runtime - Instance ownership. @param text - Pending text owner. @param commands - Existing canonical creation path. @returns Palette placement entry and lifecycle cancellation. */
export function createNodePlacement(runtime: FlowRuntime, text: FlowTextInput, commands: Pick<FlowchartEditor, "addNode" | "focus">) {
  let cancel = () => {}, clearTerminalGuard = () => {};
  return {
    /** Ends the current palette session before permissions or lifetime change. */ cancel() { cancel(); },
    /** Releases the active gesture and any post-cancellation click guard. */ destroy() { cancel(); clearTerminalGuard(); },
    /** @param shape - Admitted palette shape. @param event - Original primary pointer press on the palette control. */
    beginNodeDrag(shape: FlowchartShape, event: PointerEvent): void {
      cancel(); clearTerminalGuard();
      const target = event.currentTarget;
      if (event.button !== 0 || !event.isPrimary || !(target instanceof HTMLElement)) return;
      const origin = target;
      requireAuthoring(runtime); requireIdle(runtime, text);
      if (runtime.graph.getCellCount() >= 10000) throw new RangeError("图形数量已达上限");
      const document = runtime.mount.ownerDocument, window = document.defaultView!;
      if (origin.ownerDocument !== document) return;
      const version = runtime.changes, pointer = event.pointerId;
      const initial = { x: event.clientX, y: event.clientY };
      let latest = initial, active = false, cancelled = false, ended = false, frame = 0, clickTimer = 0;
      let preview: ReturnType<typeof createPlacementPreview> | undefined;
      /** @returns Whether this gesture can still create content at its opening revision. */
      function valid(): boolean { return !runtime.destroyed && !runtime.readOnly && !runtime.presenting && !runtime.exporting && !runtime.replacing && runtime.changes === version; }
      /** Blocks the compatibility click after a drag, including Escape cancellation. @param click - Native synthesized click. */
      function blockClick(click: MouseEvent): void { if (active && click.detail > 0) { click.preventDefault(); click.stopImmediatePropagation(); } }
      /** Removes the terminal click guard before the next independent gesture. */
      function clearClickGuard(): void {
        window.clearTimeout(clickTimer); document.removeEventListener("click", blockClick, true);
        document.removeEventListener("pointerup", releaseGuard, true); document.removeEventListener("pointerdown", clearClickGuard, true);
        window.removeEventListener("blur", clearClickGuard);
      }
      clearTerminalGuard = clearClickGuard;
      /** Keeps the compatibility click guarded until its pointerup task finishes. */
      function releaseGuard(): void { clickTimer = window.setTimeout(clearClickGuard, 0); }
      /** @param released - Whether the pointer already ended. Removes listeners and releases capture before a command may write. */
      function cleanup(released = false): void {
        if (ended) return; ended = true;
        window.cancelAnimationFrame(frame); preview?.destroy();
        document.removeEventListener("pointermove", move, true); document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", abort, true); document.removeEventListener("keydown", key, true);
        document.removeEventListener("pointerdown", abort, true); window.removeEventListener("blur", abort);
        origin.removeEventListener("lostpointercapture", abort);
        if (origin.hasPointerCapture(pointer)) origin.releasePointerCapture(pointer);
        if (active) runtime.dragging = false;
        cancel = clearClickGuard;
        // Permission revocation can occur while the button is still held.
        // Even if permission returns before release, this gesture cannot click-insert.
        if (!active) clearClickGuard();
        else if (released) releaseGuard();
        else {
          document.addEventListener("pointerup", releaseGuard, true);
          document.addEventListener("pointerdown", clearClickGuard, true); window.addEventListener("blur", clearClickGuard);
        }
      }
      /** Cancels without committing a graph cell. */
      function abort(): void { cancelled = true; cleanup(); }
      /** Projects only the latest pointer, without reading or mutating the document. */
      function paint(): void {
        frame = 0; if (!valid()) { abort(); return; }
        preview?.update(latest);
      }
      /** @param next - Captured pointer movement. */
      function move(next: PointerEvent): void {
        if (next.pointerId !== pointer || cancelled) return;
        latest = { x: next.clientX, y: next.clientY };
        if (!active && Math.hypot(latest.x - initial.x, latest.y - initial.y) < 5) return;
        if (!valid()) { abort(); return; }
        if (!active) {
          active = true; runtime.dragging = true;
          preview = createPlacementPreview(runtime, createFlowchartNode("placement-preview", shape, { x: 0, y: 0 }, ""));
        }
        next.preventDefault(); next.stopPropagation();
        if (!frame) frame = window.requestAnimationFrame(paint);
      }
      /** @param release - Final pointer position, authoritative even before the next animation frame. */
      function up(release: PointerEvent): void {
        if (release.pointerId !== pointer) return;
        const point = active && !cancelled && valid() ? preview?.update({ x: release.clientX, y: release.clientY }) : null;
        if (active) { release.preventDefault(); release.stopPropagation(); }
        cleanup(true);
        if (point) try { commands.addNode(shape, point); commands.focus(); } catch (error) { runtime.fail(error); }
      }
      /** @param press - Escape belongs to the active placement, not its enclosing document dialog. */
      function key(press: KeyboardEvent): void {
        if (press.key !== "Escape" || !active) return;
        press.preventDefault(); press.stopImmediatePropagation(); cancelled = true;
        window.cancelAnimationFrame(frame); frame = 0; preview?.destroy(); runtime.dragging = false;
        // Retain capture until release so Escape cannot turn the same gesture
        // into a click at the palette's old location.
      }
      cancel = abort;
      document.addEventListener("pointermove", move, true); document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", abort, true); document.addEventListener("keydown", key, true);
      document.addEventListener("pointerdown", abort, true); document.addEventListener("click", blockClick, true);
      window.addEventListener("blur", abort); origin.addEventListener("lostpointercapture", abort);
      origin.setPointerCapture(pointer);
    },
  };
}
