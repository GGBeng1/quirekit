import {
  createQuireSelectionHandles, createQuireSelectionGesture, resolveQuireKitLocale,
  type QuireKitSelectionHandleDrag, type QuireKitSelectionHandleGeometry,
  type QuireKitSelectionHandlePoint, type QuireKitSelectionHandlesSelection
} from "@quirekit/ui";
import type { ClassicEditorRenderContext } from "../../types";
import type { ClassicEditorShellRegions } from "../types";
import type { QuireMountedCaretRect } from "@quirekit/core";

/**
 * Connects public touch primitives to the existing editor hit-test and selection APIs.
 * @param context - Mounted document owner.
 * @param elements - Unscaled shell hosts and the single scrolling workspace.
 * @returns Teardown for gestures, subscriptions and retained overlay nodes.
 */
export function createClassicMobileSelection(context: ClassicEditorRenderContext, elements: Pick<ClassicEditorShellRegions, "root" | "workspaceViewport" | "documentOverlayHost">): () => void {
  const { editor, ownerDocument } = context;
  const { root, workspaceViewport } = elements;
  const win = ownerDocument.defaultView!;
  const host = ownerDocument.createElement("div");
  host.className = "qk-classic-editor__touch-selection";
  // Share native scrolling with the text while staying outside its reading zoom.
  // A viewport-fixed overlay would lag until the next scroll/geometry callback.
  elements.documentOverlayHost.append(host);
  let frame = 0, scrollFrame = 0;
  let selecting = false, dragging = false;
  let anchor = editor.state.pm.selection.anchor;
  let dragSample: QuireKitSelectionHandleDrag | undefined;
  let gesturePoint: QuireKitSelectionHandlePoint | undefined;
  let sourceDoc = editor.state.doc;
  let geometryDoc = sourceDoc;

  /** @param point - Viewport client point. @returns A valid text position, otherwise null. */
  function hit(point: QuireKitSelectionHandlePoint): number | null {
    const position = editor.view.posAtCoords({ left: point.x, top: point.y })?.pos;
    if (position === undefined || !editor.state.doc.resolve(position).parent.isTextblock) return null;
    return position;
  }
  /** @param rect - Presented client rectangle. @returns Unscaled overlay-local geometry, clipped to the workspace. */
  function geometry(rect: QuireMountedCaretRect | null): QuireKitSelectionHandleGeometry | null {
    if (!rect) return null;
    const visible = workspaceViewport.getBoundingClientRect();
    if (rect.bottom < visible.top || rect.top > visible.bottom || rect.left < visible.left || rect.left > visible.right) return null;
    const origin = host.getBoundingClientRect();
    return { x: rect.left - origin.left, y: rect.top - origin.top, height: Math.max(1, rect.bottom - rect.top) };
  }
  /** Projects two endpoints at most, never a full document or layout scan. */
  function render(): void {
    frame = 0;
    // Canonical acceptance can precede layout. Wait for its commit instead of
    // interpreting new positions in an older document's retained geometry.
    if (editor.view.onGeometryUpdate && geometryDoc !== editor.state.doc) return;
    const selection = editor.state.pm.selection;
    let projection: QuireKitSelectionHandlesSelection | null = null;
    // Only focused, collapsed text selection belongs to the input caret. A range
    // keeps its touch controls even with keyboard focus; blur restores the grip.
    const textSelection = selection.toJSON().type === "text";
    const inputCaret = textSelection && selection.empty && editor.isFocused;
    root.dataset.mobileCaret = inputCaret ? "input" : "touch";
    if (textSelection && !inputCaret) {
      const caret = editor.view.getCaretRect?.();
      projection = caret || selection.empty
        ? { type: "caret", caret: geometry(caret === undefined ? editor.view.coordsAtPos(selection.head) : caret) }
        : { type: "range", anchor: geometry(editor.view.coordsAtPos(selection.anchor)),
          focus: geometry(editor.view.coordsAtPos(selection.head)), backward: selection.head < selection.anchor };
    }
    handles.update({ selection: projection, selecting, disabled: !editor.isEditable,
      messages: resolveQuireKitLocale(context.locale).messages.selectionHandles });
    gesture.update({ pointerTypes: ["touch"], disabled: !editor.isEditable });
  }
  /** Coalesces selection, scrolling and resizing into a bounded endpoint projection. */
  function schedule(): void { if (!frame) frame = win.requestAnimationFrame(render); }
  /** @param from - Stable anchor. @param to - Moving endpoint. */
  function select(from: number, to: number): void {
    const selection = editor.state.pm.selection;
    if (selection.anchor !== from || selection.head !== to) editor.commands.setTextSelection({ from, to });
    schedule();
  }
  /** @param detail - Public component sample, already adjusted for the finger's grab offset. */
  function drag(detail: QuireKitSelectionHandleDrag): void {
    dragSample = detail;
    const position = hit(detail.point);
    if (position !== null) {
      const selection = editor.state.pm.selection;
      if (selecting) select(anchor, position);
      else if (detail.handle === "anchor") select(position, selection.head);
      else if (detail.handle === "focus") select(selection.anchor, position);
      else select(position, position);
    }
    if (!scrollFrame) scrollFrame = win.requestAnimationFrame(autoscroll);
  }
  /** Continues only while a captured handle stays in a workspace edge band. */
  function autoscroll(): void {
    scrollFrame = 0;
    if (!dragging || (!dragSample && !gesturePoint)) return;
    const rect = workspaceViewport.getBoundingClientRect();
    const y = (dragSample?.pointer ?? gesturePoint!).y;
    const delta = y < rect.top + 24 ? Math.max(-18, y - rect.top - 24)
      : y > rect.bottom - 24 ? Math.min(18, y - rect.bottom + 24) : 0;
    if (!delta) return;
    const before = workspaceViewport.scrollTop;
    workspaceViewport.scrollTop += delta;
    if (workspaceViewport.scrollTop !== before) {
      if (dragSample) drag(dragSample);
      else extendGesture(gesturePoint!);
    }
  }
  /** @param point - Latest held finger in client coordinates, retained while scrolling. */
  function extendGesture(point: QuireKitSelectionHandlePoint): void {
    if (!selecting) return;
    gesturePoint = point;
    const position = hit(point);
    if (position !== null) select(anchor, position);
    if (!scrollFrame) scrollFrame = win.requestAnimationFrame(autoscroll);
  }
  /** Ends only presentation state; accepted document selection remains authoritative. */
  function finish(): void {
    selecting = dragging = false;
    dragSample = undefined;
    gesturePoint = undefined;
    win.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    schedule();
  }
  const handles = createQuireSelectionHandles({
    ownerDocument, selection: null,
    onDragStart() { dragging = true; anchor = editor.state.pm.selection.anchor; },
    onLongPressStart() { selecting = true; anchor = editor.state.pm.selection.anchor; schedule(); },
    onDrag: drag,
    onDragEnd: finish,
    onNudge(detail) {
      const selection = editor.state.pm.selection;
      const position = detail.handle === "anchor" ? selection.anchor : selection.head;
      const rect = editor.view.coordsAtPos(position);
      const step = (detail.accelerated ? 3 : 1) * Math.max(6, (rect.bottom - rect.top) / 2);
      const next = hit({ x: rect.left + (detail.direction === "left" ? -step : detail.direction === "right" ? step : 0),
        y: (rect.top + rect.bottom) / 2 + (detail.direction === "up" ? -step * 2 : detail.direction === "down" ? step * 2 : 0) });
      if (next !== null) select(detail.handle === "focus" ? selection.anchor : next, detail.handle === "anchor" ? selection.head : next);
    }
  });
  host.append(handles.element);
  const gesture = createQuireSelectionGesture({
    target: workspaceViewport, pointerTypes: ["touch"],
    ignore: event => !editor.isEditable || !(event.target instanceof win.Element) || !event.target.closest("[data-qk-view]"),
    onLongPressStart(detail) {
      const position = hit(detail.origin);
      if (position === null) return;
      anchor = position;
      selecting = dragging = true;
      select(position, position);
    },
    onSelectionChange(detail) { extendGesture(detail.point); },
    onLongPress: finish,
    onSelectionComplete: finish,
    onCancel: finish
  });
  /** Invalidates held document positions before an unrelated edit can make them stale. */
  function update(): void {
    if (sourceDoc !== editor.state.doc) {
      sourceDoc = editor.state.doc;
      handles.cancel();
      gesture.cancel();
      finish();
    }
    schedule();
  }
  const releaseGeometry = editor.view.onGeometryUpdate?.(() => {
    geometryDoc = editor.state.doc;
    // Geometry is ready in this frame; absorb the queued projection rather than
    // delaying the touch caret by another animation frame after native input.
    win.cancelAnimationFrame(frame);
    render();
  });
  editor.on("selectionUpdate", schedule);
  editor.on("transaction", update);
  editor.on("focus", schedule);
  editor.on("blur", schedule);
  workspaceViewport.addEventListener("scroll", schedule, { passive: true });
  const observer = new ResizeObserver(schedule);
  observer.observe(root);
  schedule();
  return () => {
    releaseGeometry?.();
    observer.disconnect();
    editor.off("selectionUpdate", schedule);
    editor.off("transaction", update);
    editor.off("focus", schedule);
    editor.off("blur", schedule);
    workspaceViewport.removeEventListener("scroll", schedule);
    gesture.destroy();
    handles.destroy();
    win.cancelAnimationFrame(frame);
    win.cancelAnimationFrame(scrollFrame);
    host.remove();
    delete root.dataset.mobileCaret;
  };
}
