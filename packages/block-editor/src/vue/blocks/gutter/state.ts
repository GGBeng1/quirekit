import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import type { Editor } from "@quirekit/core";
import { resolveEditorBlockHover, startEditorBlockDrag, type EditorBlockOccurrence, type EditorBlockDragPreview } from "@quirekit/editor-ui";
import { captureBlockTarget } from "../../../ui/blocks/actions";
import { blockHoverToolsSuspended } from "../../objects/ownership";
import type { BlockActionTarget } from "../../../ui/blocks/types";
import { blockRailAnchor, inBlockRailCorridor, sameBlockOccurrence } from "./geometry";
import type { BlockRailGeometry } from "./types";
import type { BlockDragSnapshot } from "../drag/types";
import { captureBlockDragSnapshot } from "../drag/snapshot";

/** @param editor - Command owner. @param viewport - Scroll and clipping owner. @returns Gutter presentation and bounded pointer lifecycle. */
export function useBlockRail(editor: Editor, viewport: HTMLElement) {
  const hover = shallowRef<EditorBlockOccurrence | null>(null);
  const anchor = shallowRef<BlockRailGeometry | null>(null);
  const target = shallowRef<BlockActionTarget | null>(null);
  const menu = shallowRef<"insert" | "block" | null>(null);
  const preview = shallowRef<EditorBlockDragPreview | null>(null);
  const snapshot = shallowRef<BlockDragSnapshot | null>(null);
  let cancelDrag: (() => void) | null = null, frame: number | undefined;
  let focusFrame: number | undefined;
  let resize: ResizeObserver | undefined;
  const disclosureStyle = viewport.ownerDocument.createElement("style");
  let disclosure: string | undefined;
  let point: { x: number; y: number } | null = null;
  let corridorInvalid = false;
  /** @param next - Source-bound occurrence or dismissal. Updates only owned UI chrome after measurement. */
  function publish(next: EditorBlockOccurrence | null): void {
    if (sameBlockOccurrence(hover.value, next)) return;
    const geometry = next ? blockRailAnchor(editor, next) : null;
    if (disclosure !== geometry?.disclosure) {
      disclosure = geometry?.disclosure;
      // Transient chrome owns this rule outside the retained document DOM.
      // Writing widget attributes would cross the View's mutation boundary.
      disclosureStyle.textContent = disclosure ? `#${CSS.escape(disclosure)} { opacity: 1; }` : "";
    }
    anchor.value = geometry;
    hover.value = next;
  }
  /** Publishes one geometry query per pointer frame without editing the selection. */
  function project(): void {
    frame = undefined;
    if (!point || menu.value || preview.value || !editor.isEditable) return;
    if (blockHoverToolsSuspended(editor)) { publish(null); return; }
    const boundary = viewport.getBoundingClientRect();
    const keepCorridor = !corridorInvalid; corridorInvalid = false;
    if (keepCorridor && point.y >= boundary.top && point.y <= boundary.bottom && inBlockRailCorridor(anchor.value, point)) return;
    const next = point.y < boundary.top || point.y > boundary.bottom ? null : resolveEditorBlockHover(editor, point.x, point.y);
    // Measure before publishing reactive chrome; repeated samples within the
    // same occurrence reuse the type and first-line geometry without DOM reads.
    publish(next);
  }
  /** Coalesces scroll and pointer samples. */
  function schedule(): void { if (frame === undefined) frame = requestAnimationFrame(project); }
  /** @param event - Latest hover sample. */
  function pointer(event: PointerEvent): void {
    if (event.buttons && event.target instanceof Element && event.target.closest(".qk-rich-column-divider")) { leave(); return; }
    if (event.buttons || (event.target instanceof Element && event.target.closest("[data-block-rail]"))) return;
    // The separator owns its complete lane, even beside a paragraph's first
    // line. Retain the previous handle so crossing the lane can still reach it.
    if (event.target instanceof Element && event.target.closest(".qk-rich-column-divider")) return;
    point = { x: event.clientX, y: event.clientY }; schedule();
  }
  /** Hides idle chrome when leaving the document viewport. */
  function leave(): void { point = null; if (!menu.value && !preview.value) publish(null); }
  /** @param kind - Requested menu. */
  function open(kind: "insert" | "block" = "block"): void {
    target.value = hover.value && captureBlockTarget(editor, hover.value.block.from);
    if (!target.value) return;
    if (kind === "block") editor.chain().selectBlockRange(target.value.range).focus().run();
    menu.value = kind;
  }
  /** @param event - Handle press; the mounted View owns capture and autoscroll. */
  function press(event: PointerEvent): void {
    if (event.button || event.isPrimary === false || !hover.value) return;
    event.preventDefault(); event.stopPropagation();
    target.value = captureBlockTarget(editor, hover.value.block.from);
    if (!target.value) return;
    editor.commands.selectBlockRange(target.value.range);
    const source = target.value;
    cancelDrag = startEditorBlockDrag(editor, viewport, event, source.range, hover.value,
      value => {
        if (value && !snapshot.value) snapshot.value = captureBlockDragSnapshot(editor, source, viewport, event);
        if (!value) snapshot.value = null;
        if (value && snapshot.value) {
          const bounds = viewport.getBoundingClientRect(), image = snapshot.value;
          preview.value = { ...value,
            x: Math.max(bounds.left + 8, Math.min(value.pointer.x + image.offset.x, bounds.right - image.width - 8)),
            y: Math.max(bounds.top + 8, Math.min(value.pointer.y + image.offset.y, bounds.bottom - image.height - 8)) };
        } else preview.value = value;
      }, () => open());
  }
  /** Drops stale source leases after document or permission changes. */
  function changed(): void { menu.value = null; target.value = null; publish(null); cancelDrag?.(); cancelDrag = null; schedule(); }
  /** @param event - Keyboard equivalent for pointer-only hover. */
  function key(event: KeyboardEvent): void {
    if (!event.altKey || !event.shiftKey || event.code !== "KeyB" || !editor.view.hasFocus()) return;
    const rect = editor.view.coordsAtPos(editor.state.pm.selection.head);
    publish(resolveEditorBlockHover(editor, rect.left, rect.top));
    if (hover.value) { event.preventDefault(); event.stopPropagation(); open(); }
  }
  /** An open menu retains its exact source; native scrolling moves the shared overlay. */
  function scroll(): void { corridorInvalid = true; if (!menu.value) schedule(); }
  // Portalled menus can outlive pointerleave. Dismissal releases the locked
  // source, so chrome must resume the latest hover or clear with the viewport.
  watch(menu, (next, previous) => {
    if (!previous || next || preview.value) return;
    if (point) schedule(); else publish(null);
  });
  /** @param event - Menu keyboard event, including public portalled submenus. */
  function restoreAfterEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
    const view = editor.mountedView;
    // Wait for the menu owner's dismissal; Escape in a child menu must leave
    // focus in its parent, whereas closing the root returns to document input.
    focusFrame = requestAnimationFrame(() => {
      focusFrame = undefined;
      if (!menu.value && !editor.isDestroyed && editor.isEditable && view && editor.mountedView === view) {
        const document = view.dom.ownerDocument;
        if (document.activeElement === document.body || view.hasFocus()) view.focus();
      }
    });
  }
  onMounted(() => {
    viewport.append(disclosureStyle);
    viewport.addEventListener("pointermove", pointer); viewport.addEventListener("pointerleave", leave);
    viewport.addEventListener("scroll", scroll, { passive: true }); viewport.addEventListener("keydown", key, true);
    editor.on("update", changed); editor.on("unmount", changed);
    resize = new ResizeObserver(scroll); resize.observe(viewport); resize.observe(editor.view.dom);
  });
  onBeforeUnmount(() => {
    disclosureStyle.remove();
    cancelDrag?.(); if (frame !== undefined) cancelAnimationFrame(frame);
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
    viewport.removeEventListener("pointermove", pointer); viewport.removeEventListener("pointerleave", leave);
    viewport.removeEventListener("scroll", scroll); viewport.removeEventListener("keydown", key, true);
    editor.off("update", changed); editor.off("unmount", changed);
    resize?.disconnect();
  });
  return { hover, anchor, target, menu, preview, snapshot, open, press, restoreAfterEscape };
}
