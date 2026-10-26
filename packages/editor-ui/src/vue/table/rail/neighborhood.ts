import type { QuireMountedTableChromeFragment } from "@quirekit/core";
import {
  computed,
  nextTick,
  ref,
  watch
} from "vue";
import type { EditorUITableAxis } from "../types";

/**
 * Owns the one materialized Table rail neighborhood.
 *
 * The mounted View remains the sole geometry authority. This projection only
 * chooses one existing row or column anchor for pointer and keyboard access.
 *
 * @param fragment - Reads the current View-projected Table fragment.
 * @param rowIndex - Reads the caret's source row index.
 * @param columnIndex - Reads the caret's grid column index.
 * @param teleportTarget - Reads the workspace that owns the materialized bar.
 * @returns Reactive current-axis anchors and constant-size interaction handlers.
 */
export function useEditorUITableRailNeighborhood(
  fragment: () => QuireMountedTableChromeFragment,
  rowIndex: () => number,
  columnIndex: () => number,
  teleportTarget: () => HTMLElement
) {
  const activeAxis = ref<EditorUITableAxis>("row");
  const activeRowIndex = ref(rowIndex());
  const activeColumnIndex = ref(columnIndex());
  const activeBoundaryIndex = ref(rowIndex() + 1);
  const activeRow = computed(() => fragment().rows.find(
    anchor => anchor.rowIndex === activeRowIndex.value
  ) ?? fragment().rows[0]);
  const activeColumn = computed(() => fragment().columns.find(
    anchor => anchor.columnIndex === activeColumnIndex.value
  ) ?? fragment().columns[0]);

  watch([rowIndex, columnIndex], ([nextRowIndex, nextColumnIndex]) => {
    activeRowIndex.value = nextRowIndex;
    activeColumnIndex.value = nextColumnIndex;
    activeBoundaryIndex.value = activeAxis.value === "row"
      ? nextRowIndex + 1
      : nextColumnIndex + 1;
  });

  /**
   * Projects a rail pointer onto one existing canonical axis anchor.
   *
   * @param event - Pointer movement over one visible axis rail.
   * @param axis - Row or column rail receiving the movement.
   */
  function activateRailNeighbor(
    event: PointerEvent,
    axis: EditorUITableAxis
  ): void {
    if (event.buttons !== 0) return;
    const rail = event.currentTarget;
    if (!(rail instanceof HTMLElement)) return;
    const model = fragment();
    const bounds = rail.getBoundingClientRect();
    const anchors = axis === "row" ? model.rows : model.columns;
    const localExtent = axis === "row" ? bounds.height : bounds.width;
    const sourceStart = axis === "row"
      ? model.tableRect.top
      : model.tableRect.left;
    const sourceExtent = axis === "row"
      ? model.tableRect.bottom - model.tableRect.top
      : model.tableRect.right - model.tableRect.left;
    if (localExtent <= 0 || sourceExtent <= 0) return;
    const localCoordinate = axis === "row"
      ? event.clientY - bounds.top
      : event.clientX - bounds.left;
    const sourceCoordinate = localCoordinate * sourceExtent / localExtent
      + sourceStart;
    const anchor = anchors.find(candidate => axis === "row"
      ? sourceCoordinate >= candidate.rect.top
        && sourceCoordinate <= candidate.rect.bottom
      : sourceCoordinate >= candidate.rect.left
        && sourceCoordinate <= candidate.rect.right
    );
    const index = axis === "row" ? anchor?.rowIndex : anchor?.columnIndex;
    if (index === undefined) return;
    const insertionKind = `insert-${axis}`;
    const nearestBoundary = model.insertions
      .filter(candidate => candidate.kind === insertionKind)
      .reduce<(typeof model.insertions)[number] | null>((nearest, candidate) => {
        const candidateCoordinate = axis === "row"
          ? (candidate.rect.top + candidate.rect.bottom) / 2
          : (candidate.rect.left + candidate.rect.right) / 2;
        if (nearest === null) return candidate;
        const nearestCoordinate = axis === "row"
          ? (nearest.rect.top + nearest.rect.bottom) / 2
          : (nearest.rect.left + nearest.rect.right) / 2;
        return Math.abs(candidateCoordinate - sourceCoordinate)
          < Math.abs(nearestCoordinate - sourceCoordinate)
          ? candidate
          : nearest;
      }, null);
    activeAxis.value = axis;
    activeBoundaryIndex.value = nearestBoundary?.boundaryIndex ?? index + 1;
    if (axis === "row") activeRowIndex.value = index;
    else activeColumnIndex.value = index;
  }

  /**
   * Advances the single roving handle through canonical adjacent anchors.
   *
   * @param event - Keyboard event from the active handle.
   * @param axis - Axis owned by the materialized handle.
   */
  async function moveRovingHandle(
    event: KeyboardEvent,
    axis: EditorUITableAxis
  ): Promise<void> {
    const step = axis === "row"
      ? event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
      : event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const anchors = axis === "row" ? fragment().rows : fragment().columns;
    const currentIndex = anchors.findIndex(anchor => axis === "row"
      ? anchor.rowIndex === activeRowIndex.value
      : anchor.columnIndex === activeColumnIndex.value
    );
    const next = anchors[Math.max(0, Math.min(
      anchors.length - 1,
      currentIndex + step
    ))];
    const nextIndex = axis === "row" ? next?.rowIndex : next?.columnIndex;
    if (nextIndex === undefined) return;
    activeAxis.value = axis;
    activeBoundaryIndex.value = nextIndex + 1;
    if (axis === "row") activeRowIndex.value = nextIndex;
    else activeColumnIndex.value = nextIndex;
    await nextTick();
    teleportTarget().querySelector<HTMLElement>(
      `[data-table-bar="${axis}"][data-table-${axis}="${nextIndex}"]`
    )?.focus();
  }

  return {
    activeAxis,
    activeBoundaryIndex,
    activeColumn,
    activeColumnIndex,
    activeRow,
    activeRowIndex,
    activateRailNeighbor,
    moveRovingHandle
  };
}
