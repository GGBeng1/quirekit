import { nextTick, watch } from "vue";
import type { DataRecord, DataValue } from "@quirekit/data-view";
import type { CellMove } from "../cell/types";
import type { PendingCellMove } from "./types";

/** @param left - Canonical value. @param right - Candidate. @returns Whether the host acknowledged this exact cell. */
function sameValue(left: DataValue | undefined, right: DataValue): boolean {
  return Array.isArray(left) && Array.isArray(right) ? left.length === right.length && left.every((item, index) => item === right[index]) : left === right;
}

/** Moves focus only after canonical values and the host's busy boundary settle.
 * @param owner - Owned table root, independent of UI component anatomy.
 * @param rows - Bounded displayed window.
 * @param fields - Current ordered visible fields.
 * @param busy - Pending host receipt.
 * @param locked - Current write permission.
 * @param identity - Dataset identity, invalidating an outstanding navigation on replacement.
 * @returns Cell navigation handler.
 */
export function useTableNavigation(owner: () => HTMLElement | null, rows: () => readonly DataRecord[], fields: () => readonly string[], busy: () => boolean, locked: () => boolean, identity: () => string) {
  let pending: PendingCellMove | undefined;
  /** @param recordId - Stable row. @param fieldId - Stable column. @returns Its currently rendered business wrapper. */
  function cell(recordId: string, fieldId: string): HTMLElement | undefined {
    return [...owner()?.querySelectorAll<HTMLElement>("[data-dv-table-cell]") ?? []].find(element => element.dataset.recordId === recordId && element.dataset.fieldId === fieldId);
  }
  /** Resolves accepted values after rendering; a rejected write stays in its original cell. */
  async function settle(): Promise<void> {
    const request = pending;
    if (!request) return;
    const acknowledged = await request.receipt;
    await nextTick();
    if (pending !== request || busy()) return;
    pending = undefined;
    const root = owner(), source = cell(request.recordId, request.fieldId), active = root?.ownerDocument.activeElement;
    if (!root || locked() || active && active !== root.ownerDocument.body && !source?.contains(active)) return;
    const sourceRow = rows().find(row => row.id === request.recordId);
    const accepted = acknowledged && sourceRow && sameValue(sourceRow.values[request.fieldId], request.value);
    const target = accepted ? cell(request.targetRecordId, request.targetFieldId) : source;
    (target?.querySelector<HTMLElement>(".dv-cell-action:not([disabled])") ?? root.querySelector<HTMLElement>("[data-dv-add-record]") ?? root).focus();
  }
  watch(busy, waiting => { if (!waiting) void settle(); });
  watch(locked, value => { if (value) pending = undefined; });
  watch(identity, () => { pending = undefined; });
  /** @param recordId - Source row. @param fieldId - Source field. @param move - Complete value and direction. @param event - Key whose default is canceled only inside the grid. @param receipt - Exact write acceptance, already resolved for unchanged cells. */
  return function navigate(recordId: string, fieldId: string, move: CellMove, event: KeyboardEvent, receipt: Promise<boolean>): void {
    if (locked()) return;
    const records = rows(), columns = fields(), row = records.findIndex(record => record.id === recordId), column = columns.indexOf(fieldId);
    if (row < 0 || column < 0 || !columns.length) return;
    let nextRow = row, nextColumn = column;
    if (move.direction === "next" || move.direction === "previous") {
      const index = row * columns.length + column + (move.direction === "next" ? 1 : -1);
      if (index < 0 || index >= records.length * columns.length) return;
      nextRow = Math.floor(index / columns.length); nextColumn = index % columns.length;
    } else if (move.direction === "up" || move.direction === "down") nextRow += move.direction === "up" ? -1 : 1;
    else {
      const rtl = owner() && getComputedStyle(owner()!).direction === "rtl";
      nextColumn += (move.direction === "left" ? -1 : 1) * (rtl ? -1 : 1);
    }
    event.preventDefault(); event.stopPropagation();
    const target = records[nextRow], targetField = columns[nextColumn];
    pending = {recordId, fieldId, value: move.value, receipt, targetRecordId: target?.id ?? recordId, targetFieldId: targetField ?? fieldId};
    void settle();
  };
}
