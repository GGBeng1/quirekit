import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import { BlockSelection, readBlockCatalog, type BlockFact, type BlockRangeRef, type BlockSlotRef } from "@quirekit/extensions";
import type { QuireEditor } from "@quirekit/core";
import { resolveClassicBlockHover, startClassicBlockDrag, type ClassicBlockOccurrence, type ClassicBlockDragPreview } from "@classic/runtime/block-interaction";
import type { ClassicEditorBlockInsertionTarget } from "@classic/types";
import type { ClassicEditorShellModel } from "../../types";

/** @param model - Shell context. @param root - Product root. @returns Reactive rail and typed action handlers. */
export function useBlockRail(model: Ref<ClassicEditorShellModel>, root: Ref<HTMLElement | undefined>) {
  const hover = shallowRef<ClassicBlockOccurrence | null>(null);
  const menu = shallowRef<"block" | "insert" | null>(null);
  const range = shallowRef<BlockRangeRef | null>(null);
  const slot = shallowRef<BlockSlotRef | null>(null);
  const preview = shallowRef<ClassicBlockDragPreview | null>(null);
  let cancelDrag: (() => void) | null = null, release = (): void => {};
  /** @returns Current editable command owner. */
  const editor = (): QuireEditor | undefined => model.value.context?.editor;
  /** @param block - Endpoint. @param extend - Shift-selection flag. @returns Captured current range. */
  const capture = (block: BlockFact, extend: boolean): BlockRangeRef | null => {
    const e = editor(), catalog = e && readBlockCatalog(e);
    if (!e || !catalog) return null;
    const selection = e.state.pm.selection;
    let anchor = block, focus = block;
    if (extend && range.value?.anchor.scopeId === block.scopeId) anchor = catalog.byId.get(range.value.anchor.blockId) ?? block;
    else if (selection instanceof BlockSelection && block.from >= selection.from && block.to <= selection.to) {
      anchor = catalog.blocks.find(item => item.from === selection.from) ?? block;
      focus = catalog.blocks.find(item => item.to === selection.to) ?? block;
    }
    return { anchor, focus: extend ? block : focus, expectedDocumentRevision: catalog.revision };
  };
  /** @param extend - Whether to extend the range. */
  const select = (extend = false): void => {
    if (!hover.value) return;
    range.value = capture(hover.value.block, extend);
    if (range.value) editor()?.commands.selectBlockRange(range.value);
  };
  /** @param event - Handle pointer press. */
  const press = (event: PointerEvent): void => {
    const e = editor(), current = hover.value;
    if (!e || !root.value || !current || event.button !== 0 || event.isPrimary === false) return;
    select(event.shiftKey);
    if (!range.value) return;
    menu.value = null;
    cancelDrag = startClassicBlockDrag(e, root.value, event, range.value, current,
      value => { preview.value = value; if (value) menu.value = null; },
      () => { menu.value = "block"; });
  };
  /** Opens the keyboard-equivalent block menu. */
  const open = (): void => { select(); menu.value = "block"; };
  /** @param side - Boundary outside the complete captured range. @returns A current insertion lease, never a later caret target. */
  const insertionSlot = (side: "before" | "after"): BlockSlotRef | null => {
    const e = editor(), catalog = e && readBlockCatalog(e);
    if (!hover.value || !catalog) return null;
    let target = hover.value.block;
    if (menu.value === "block" && range.value) {
      if (range.value.expectedDocumentRevision !== catalog.revision) return null;
      const a = catalog.byId.get(range.value.anchor.blockId), b = catalog.byId.get(range.value.focus.blockId);
      if (!a || !b) return null;
      target = side === "before" ? (a.order < b.order ? a : b) : (a.order > b.order ? a : b);
    }
    return { target, side, expectedDocumentRevision: catalog.revision };
  };
  /** @param side - Explicit single-block insertion side from the plus launcher. */
  const openInsert = (side: "before" | "after"): void => {
    slot.value = insertionSlot(side);
    if (!slot.value) return;
    menu.value = "insert";
  };
  /** @param direction - Neighbor direction. @param check - Dry-run capability query. @returns Whether movement is admitted. */
  const move = (direction: -1 | 1, check = false): boolean => {
    const e = editor(), catalog = e && readBlockCatalog(e), source = range.value;
    if (!e || !catalog || !source || source.expectedDocumentRevision !== catalog.revision) return false;
    const a = catalog.byId.get(source.anchor.blockId), b = catalog.byId.get(source.focus.blockId);
    if (!a || !b) return false;
    const order = direction < 0 ? Math.min(a.order, b.order) - 1 : Math.max(a.order, b.order) + 1;
    const target = catalog.blocks.find(item => item.scopeId === a.scopeId && item.order === order);
    if (!target) return false;
    const request = { source, destination: { target, side: direction < 0 ? "before" as const : "after" as const, expectedDocumentRevision: catalog.revision } };
    if (check) return e.can().moveBlockRange(request);
    menu.value = null;
    const moved = e.commands.moveBlockRange(request);
    e.view.focus();
    return moved;
  };
  watch([() => model.value.context?.editor, root], ([e, element]) => {
    release(); hover.value = null; menu.value = null;
    if (!e || !element) return;
    const viewport = element.querySelector<HTMLElement>(".qk-classic-editor__workspace-viewport") ?? element;
    let frame: number | null = null, point: { x: number; y: number } | null = null;
    /** Applies only the latest hover sample, never a selection transaction. */
    const apply = (): void => {
      frame = null;
      if (!point || menu.value || preview.value) return;
      const boundary = viewport.getBoundingClientRect();
      hover.value = point.y < boundary.top || point.y > boundary.bottom ? null : resolveClassicBlockHover(e, point.x, point.y);
    };
    /** Coalesces hover and scroll geometry projection. */
    const schedule = (): void => { if (frame === null) frame = requestAnimationFrame(apply); };
    /** @param event - Latest hover sample. */
    const pointer = (event: PointerEvent): void => {
      // Chrome keeps its captured block even when zoom makes its button taller
      // than a text line. Crossing the grip must not retarget a neighbor.
      if (event.target instanceof Element && event.target.closest("[data-block-rail], [data-block-menu]")) return;
      if (!event.buttons) { point = { x: event.clientX, y: event.clientY }; schedule(); }
    };
    /** Drops idle chrome when the pointer leaves this editor instance. */
    const leave = (): void => { point = null; if (!menu.value && !preview.value) hover.value = null; };
    /** Clears stale menu leases after content changes. */
    const update = (): void => { menu.value = null; range.value = null; hover.value = null; cancelDrag?.(); cancelDrag = null; schedule(); };
    /** A menu command must never inherit a later unrelated caret selection. */
    const selectionChanged = (): void => {
      if (menu.value === "block" && !(e.state.pm.selection instanceof BlockSelection)) menu.value = null;
    };
    /** @param event - Keyboard rail access from the document. */
    const key = (event: KeyboardEvent): void => {
      if (event.altKey && event.shiftKey && event.code === "KeyB") {
        const rect = e.view.coordsAtPos(e.state.pm.selection.head);
        hover.value = resolveClassicBlockHover(e, rect.left, rect.top);
        if (hover.value) { event.preventDefault(); open(); }
      }
    };
    element.addEventListener("pointermove", pointer);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("keydown", key);
    viewport.addEventListener("scroll", schedule, { passive: true });
    e.on("update", update); e.on("unmount", update); e.on("selectionUpdate", selectionChanged);
    release = () => { cancelDrag?.(); cancelDrag = null; if (frame !== null) cancelAnimationFrame(frame); element.removeEventListener("pointermove", pointer); element.removeEventListener("pointerleave", leave); element.removeEventListener("keydown", key); viewport.removeEventListener("scroll", schedule); e.off("update", update); e.off("unmount", update); e.off("selectionUpdate", selectionChanged); };
  }, { immediate: true });
  onBeforeUnmount(() => release());
  /** @param side - Outside range edge, or the plus launcher target. @returns Immutable insertion lease. */
  function insertionTarget(side?: "before" | "after"): ClassicEditorBlockInsertionTarget | null {
    const destination = side ? insertionSlot(side) : slot.value;
    return destination ? { destination, replaceEmpty: side === undefined } : null;
  }
  return { hover, menu, range, slot, preview, editor, press, open, openInsert, move, insertionTarget };
}
