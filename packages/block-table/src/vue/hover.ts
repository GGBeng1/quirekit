import type { Editor, QuireMountedTableChromeModel } from "@quirekit/core";
import { captureTableTarget } from "../ui/actions";
import type { BlockTableTarget } from "../ui/types";

/**
 * Tracks transient HTML hover without granting it canonical selection ownership.
 * @param editor - Canonical document and public position hit-test owner.
 * @param viewport - Scroll owner containing table content and controls.
 * @param geometry - Retained client geometry for the currently rendered controls.
 * @param changed - Requests semantic projection only when the hover target changes.
 * @returns Pointer lifecycle handlers and the current, document-valid hover target.
 */
export function createTableHover(
  editor: Editor,
  viewport: () => HTMLElement | undefined,
  geometry: () => QuireMountedTableChromeModel | null,
  changed: () => void
) {
  let target: BlockTableTarget | null = null;
  let cell: Element | null = null;
  let point: { left: number; top: number } | null = null;
  let pressed = false;

  /** @param next - New transient target. Publishes only semantic changes. */
  function publish(next: BlockTableTarget | null): void {
    const previous = target;
    target = next;
    if (next?.doc !== previous?.doc || next?.tablePos !== previous?.tablePos
      || next?.rect.startRow !== previous?.rect.startRow || next?.rect.startColumn !== previous?.rect.startColumn) changed();
  }

  /** @param element - Physical pointer target, never the captured drag target after release. */
  function update(element: EventTarget | null): void {
    if (!point || !editor.isEditable) { cell = null; publish(null); return; }
    const host = viewport();
    const inside = element instanceof Element && host?.contains(element);
    const nextCell = inside ? element.closest("td, th") : null;
    if (nextCell) {
      // Repeated movement inside one cell needs neither layout reads nor another
      // canonical hit test. A new document identity invalidates the cached cell.
      if (cell === nextCell && target?.doc === editor.state.doc) return;
      cell = nextCell;
      const hit = editor.view.posAtCoords(point);
      publish(hit ? captureTableTarget(editor, hit.pos) : null);
      return;
    }
    const model = geometry(), rect = model?.fragments[0]?.tableRect;
    if (inside && target?.doc === editor.state.doc && model?.tablePos === target.tablePos) {
      // The shared rails sit 13px outside the table; their insertion buttons
      // extend to 22px. Keep that short crossing usable without a hide timer.
      if (element.closest(".qk-editor-table__chrome") || (rect
        && point.left >= rect.left - 22 && point.left <= rect.right + 8
        && point.top >= rect.top - 22 && point.top <= rect.bottom + 8)) return;
    }
    cell = null;
    publish(null);
  }

  /** @param event - Latest physical pointer location, including captured drag motion. */
  function move(event: PointerEvent): void {
    point = { left: event.clientX, top: event.clientY };
    pressed = event.buttons !== 0;
    if (!pressed) update(event.target);
  }

  /** @param event - Leaving the scroll owner cancels hover unless a gesture owns it. */
  function leave(event: PointerEvent): void {
    if (event.buttons) return;
    point = null;
    cell = null;
    publish(null);
  }

  /**
   * @param event - Capture-phase release; projection waits until the control has committed.
   * @returns Whether a retained hover needs reconciliation after this release.
   */
  function release(event: PointerEvent): boolean {
    if (!target) { pressed = false; return false; }
    point = { left: event.clientX, top: event.clientY };
    pressed = false;
    return true;
  }

  /** Reconciles stationary hover after scrolling, layout, or a captured gesture. */
  function refresh(): void {
    if (!pressed && point) update(viewport()?.ownerDocument.elementFromPoint(point.left, point.top) ?? null);
  }

  return {
    move, leave, release, refresh,
    /** @returns Current hover only while its immutable document and editability remain valid. */
    get current(): BlockTableTarget | null {
      return editor.isEditable && target?.doc === editor.state.doc ? target : null;
    }
  };
}
