import type { DataViewEmbed } from "../model/types";
import { readDataView, serializeDataView } from "../codec/json";
import { applyDataViewOperations, replaceDataView } from "../operations/apply";
import { requireData } from "../validation/error";
import type { DataViewDraft } from "./types";

/** Creates a bounded local draft whose outer host remains the persistence owner.
 * @param source - Current authoritative embed.
 * @returns Isolated editing history and conditional save preparation.
 */
export function createDataViewDraft(source: DataViewEmbed): DataViewDraft {
  let base = serializeDataView(source), states = [base], cursor = 0, disposed = false;
  /** Rejects operations after the owning task has closed. */
  function live(): void { requireData(!disposed, "$", "Data editor has been disposed"); }
  /** @returns A detached value from an already validated history entry. */
  function read(): DataViewEmbed { live(); return JSON.parse(states[cursor]!) as DataViewEmbed; }
  /** Adds one authored state while bounding retained UTF-16 history storage.
   * @param value - Validated next state.
   */
  function push(value: DataViewEmbed): void {
    const source = serializeDataView(value); if (source === states[cursor]) return;
    states = states.slice(0, cursor + 1); states.push(source);
    let size = states.reduce((sum, item) => sum + item.length * 2, 0);
    while (states.length > 1 && (states.length > 64 || size > 16 * 1024 * 1024)) size -= states.shift()!.length * 2;
    cursor = states.length - 1;
  }
  return {
    get dirty() { live(); return states[cursor] !== base; },
    get canUndo() { return !disposed && cursor > 0; },
    get canRedo() { return !disposed && cursor < states.length - 1; },
    read,
    /** @param operations - Atomic changes. @param version - Revision precondition. @param options - Same-step view projection. */
    apply(operations, version, options) { push(applyDataViewOperations(read(), operations, version, options)); },
    /** @param view - Authored view configuration. */
    replaceView(view) { push(replaceDataView(read(), view)); },
    /** @returns Whether the previous state was restored. */
    undo() { live(); if (cursor === 0) return false; cursor--; return true; },
    /** @returns Whether an undone state was restored. */
    redo() { live(); if (cursor === states.length - 1) return false; cursor++; return true; },
    /** @returns Conditional host save. */
    prepare() { return {base, value: readDataView(read())}; },
    /** Releases all retained states. */
    dispose() { disposed = true; states = []; base = ""; cursor = 0; }
  };
}
