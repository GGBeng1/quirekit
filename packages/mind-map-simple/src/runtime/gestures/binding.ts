import type { SimpleInstance, SimpleNode } from "../../vendor/types";
import { setMindMapSelection } from "../../vendor/selection";
import { createMindMapGesturePreview } from "./preview";
import { belongsToMindMapSelection, mindMapHits } from "./selection";
import type { MindMapGestureOptions } from "./types";

/**
 * Owns left-button marquee/root-pan/subtree-drag with one geometry pass per frame.
 * @param instance - Pinned renderer.
 * @param mount - Instance-owned event boundary.
 * @param options - Canonical mutations and native composition guard.
 * @returns Cancellation and disposal hooks.
 */
export function bindMindMapGestures(instance: SimpleInstance, mount: HTMLElement, options: MindMapGestureOptions) {
  let cancelCurrent: (() => void) | undefined;
  let suppressClick = false, suppressDoubleClick = false;
  const abort = new AbortController();
  /** Cancels an unfinished preview without modifying canonical data. */
  function cancel(): void { cancelCurrent?.(); }
  /** @param event - Pointer beginning inside this instance only. */
  function down(event: PointerEvent): void {
    if (![0, 1].includes(event.button) || cancelCurrent) return;
    // Each real press starts a new sequence. A drag's trailing click can be
    // followed by dblclick; consuming the click must not release that guard.
    suppressClick = false; suppressDoubleClick = false;
    const target = event.target as Element;
    if (target.closest("[contenteditable],.smm-expand-btn,.smm-quick-create-child-btn")) return;
    if (options.blocked()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    instance.renderer.textEdit.hideEditTextBox();
    mount.focus({ preventScroll: true });
    const hits = mindMapHits(instance), group = target.closest(".smm-node");
    const hit = hits.find(item => item.node.group?.node === group);
    const initialSelection = [...instance.renderer.activeNodeList];
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (hit && additive) {
      setMindMapSelection(instance, initialSelection.includes(hit.node)
        ? initialSelection.filter(node => node !== hit.node) : [...initialSelection, hit.node]);
      suppressClick = true; suppressDoubleClick = true; return;
    }
    if (hit && !initialSelection.includes(hit.node)) setMindMapSelection(instance, [hit.node]);
    if (!hit && !additive) setMindMapSelection(instance, []);
    // A selected main root owns the whole-map translation, even when the pointer
    // starts on one of its selected descendants. Never detach those descendants.
    const pan = event.button === 1 || !!hit && instance.renderer.activeNodeList.some(node => node.isRoot);
    const mode = pan ? "pan" : hit ? "drag" : "select";
    const selected = new Set(instance.renderer.activeNodeList.filter(node => !node.isRoot));
    const roots = new Set([...selected].filter(node => !node.isRoot && !belongsToMindMapSelectionParent(node, selected)));
    const moving = mode === "drag" ? hits.filter(item => belongsToMindMapSelection(item.node, roots)) : [];
    const rootHits = hits.filter(item => roots.has(item.node));
    const startX = event.clientX, startY = event.clientY, startView = { ...instance.view };
    const main = { x: instance.renderer.root.left, y: instance.renderer.root.top };
    let x = startX, y = startY, frame = 0, dragging = false, lastX = 0, lastY = 0;
    let destination: (typeof hits)[number] | undefined;
    let invalid = false;
    let preview: ReturnType<typeof createMindMapGesturePreview> | undefined;
    const gesture = new AbortController();
    /** Applies the latest pointer; never reads or writes the persistent tree. */
    function flush(): void {
      frame = 0;
      const dx = x - startX, dy = y - startY;
      if (!dragging && Math.hypot(dx, dy) < 5) return;
      if (!dragging) { dragging = true; mount.setPointerCapture(event.pointerId); mount.style.cursor = mode === "pan" ? "grabbing" : "crosshair"; }
      const bounds = mount.getBoundingClientRect(), scale = startView.scale;
      if (mode === "pan") { instance.view.translateXY(dx - lastX, dy - lastY); lastX = dx; lastY = dy; return; }
      preview ??= createMindMapGesturePreview(mount, instance, moving);
      if (mode === "select") {
        const left = Math.min(startX, x) - bounds.left, top = Math.min(startY, y) - bounds.top;
        preview.rectangle(left, top, Math.abs(dx), Math.abs(dy));
        const l = (left - startView.x) / scale, t = (top - startView.y) / scale;
        const r = l + Math.abs(dx) / scale, b = t + Math.abs(dy) / scale;
        const found = hits.filter(item => item.x <= r && item.x + item.width >= l && item.y <= b && item.y + item.height >= t).map(item => item.node);
        setMindMapSelection(instance, additive ? [...new Set([...initialSelection, ...found])] : found);
      } else {
        const worldX = (x - bounds.left - startView.x) / scale, worldY = (y - bounds.top - startView.y) / scale;
        // A small move can still end inside the dragged root's old rectangle.
        // Ignore those roots as drop targets, but reject their descendants.
        const hovered = hits.find(item => !roots.has(item.node) && worldX >= item.x && worldX <= item.x + item.width && worldY >= item.y && worldY <= item.y + item.height);
        invalid = !!hovered && belongsToMindMapSelection(hovered.node, roots);
        destination = invalid ? undefined : hovered;
        preview.drag(dx / scale, dy / scale, destination, invalid);
      }
    }
    /** Clears every listener and transient element for this gesture. */
    function cleanup(): void {
      cancelAnimationFrame(frame); gesture.abort(); preview?.dispose(); mount.style.cursor = "";
      if (mount.hasPointerCapture(event.pointerId)) mount.releasePointerCapture(event.pointerId);
      cancelCurrent = undefined;
      if (dragging) { suppressClick = true; suppressDoubleClick = true; }
    }
    cancelCurrent = () => {
      cleanup();
      // Closing inline text queues a layout after pointerdown. Cancelling that
      // pending click must not resurrect a selection the blank click just cleared.
      if (mode === "select" && dragging) setMindMapSelection(instance, initialSelection);
      if (mode === "pan" && dragging) instance.view.translateXY(startView.x - instance.view.x, startView.y - instance.view.y);
    };
    /** @param next - Latest event belonging to the initiating pointer. */
    function move(next: PointerEvent): void {
      if (next.pointerId !== event.pointerId) return;
      x = next.clientX; y = next.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    }
    /** @param next - Final pointer position, synchronously flushed before commit. */
    function up(next: PointerEvent): void {
      if (next.pointerId !== event.pointerId) return;
      x = next.clientX; y = next.clientY; cancelAnimationFrame(frame); flush(); cleanup();
      if (dragging && mode === "drag" && !invalid && !options.blocked()) {
        void options.drop({ ...(destination ? { parentId: destination.id } : {}), moves: rootHits.map(item => ({ id: item.id,
          position: { x: item.x + (x - startX) / startView.scale - main.x, y: item.y + (y - startY) / startView.scale - main.y },
          side: item.node.dir ?? "right" })) }).catch(options.report);
      }
    }
    window.addEventListener("pointermove", move, { signal: gesture.signal });
    window.addEventListener("pointerup", up, { signal: gesture.signal });
    window.addEventListener("pointercancel", cancel, { signal: gesture.signal });
    mount.addEventListener("lostpointercapture", cancel, { signal: gesture.signal });
    window.addEventListener("blur", cancel, { signal: gesture.signal });
  }
  /** @param event - Prevents the click following a completed drag from clearing selection. */
  function click(event: MouseEvent): void {
    if ((options.blocked() && !(event.target as Element).closest("[contenteditable]")) || suppressClick) {
      suppressClick = false; event.preventDefault(); event.stopImmediatePropagation();
    }
  }
  /** @param event - Empty-space double click creates a free topic at the pointer. */
  function doubleClick(event: MouseEvent): void {
    if (suppressDoubleClick) {
      suppressDoubleClick = false; event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if ((event.target as Element).closest("[contenteditable]")) return;
    if (options.blocked()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if ((event.target as Element).closest(".smm-node")) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const rect = mount.getBoundingClientRect(), { scale, x, y } = instance.view, root = instance.renderer.root;
    void options.add({ x: (event.clientX - rect.left - x) / scale - root.left,
      y: (event.clientY - rect.top - y) / scale - root.top }).catch(options.report);
  }
  mount.addEventListener("pointerdown", down, { capture: true, signal: abort.signal });
  mount.addEventListener("click", click, { capture: true, signal: abort.signal });
  mount.addEventListener("dblclick", doubleClick, { capture: true, signal: abort.signal });
  mount.addEventListener("keydown", event => { if (event.key === "Escape") cancel(); }, { capture: true, signal: abort.signal });
  mount.addEventListener("wheel", cancel, { capture: true, signal: abort.signal });
  instance.on("node_tree_render_start", cancel);
  return { cancel, /** Removes all gesture ownership before renderer disposal. */ dispose(): void {
    cancel(); abort.abort(); instance.off("node_tree_render_start", cancel);
  } };
}

/** @param node - Candidate root. @param selected - Current selection. @returns Whether a selected ancestor already owns this subtree. */
function belongsToMindMapSelectionParent(node: SimpleNode, selected: ReadonlySet<SimpleNode>): boolean {
  return node.parent ? belongsToMindMapSelection(node.parent, selected) : false;
}
