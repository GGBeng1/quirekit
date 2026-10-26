import { Prec, type Extension } from "@quirekit/cm-state";
import { EditorView, keymap } from "@quirekit/cm-view";
import { compositionField } from "../state/fields";
import type { MsfeHistory, MsfeHistoryDriver, MsfeHistoryState } from "./types";

/** Routes native, keyboard, API and UI history through one per-instance implementation. */
export class HistoryController {
  readonly api: MsfeHistory;
  private disposed = false;
  private pending = false;
  private last: MsfeHistoryState = { canUndo: false, canRedo: false };
  private readonly listeners = new Set<(state: MsfeHistoryState) => void>();
  private readonly unsubscribe: (() => void) | undefined;

  /** @param driver - Selected content history. @param view - Mounted view accessor. @param blocked - Provider permission/fault guard. @param report - Isolated observer error sink. */
  constructor(private readonly driver: MsfeHistoryDriver, private readonly view: () => EditorView | undefined,
    private readonly blocked: () => boolean, private readonly report: (error: unknown) => void) {
    const owner = this;
    this.api = { get canUndo() { return owner.available("undo"); }, get canRedo() { return owner.available("redo"); },
      subscribe(listener) { if (!owner.disposed) owner.listeners.add(listener); return () => { owner.listeners.delete(listener); }; } };
    this.unsubscribe = driver.subscribe?.(() => {
      // Drivers may announce a stack item while still inside their mutation. Root commits publish
      // synchronously when safe; this coalesced fallback covers stack-only changes after that boundary.
      if (this.pending || this.disposed) return;
      this.pending = true;
      queueMicrotask(() => { this.pending = false; this.publish(); });
    });
  }

  /** @param direction - Requested local history branch. @returns Whether an item was applied. */
  run(direction: "undo" | "redo"): boolean {
    const view = this.view();
    if (!view || !this.available(direction)) return false;
    const result = this.driver[direction](view); this.publish(); return result;
  }

  /** @returns Default content shortcuts and a single native history entry point. */
  extensions(): Extension {
    return [this.driver.extensions, Prec.highest([
      keymap.of([
        { key: "Mod-z", run: () => this.run("undo"), preventDefault: true },
        { key: "Mod-y", mac: "Mod-Shift-z", run: () => this.run("redo"), preventDefault: true },
        { linux: "Ctrl-Shift-z", run: () => this.run("redo"), preventDefault: true },
      ]), EditorView.domEventHandlers({ beforeinput: event => {
        const direction = event.inputType === "historyUndo" ? "undo" : event.inputType === "historyRedo" ? "redo" : undefined;
        if (!direction) return false;
        event.preventDefault(); this.run(direction); return true;
      } }),
    ])];
  }

  /** Publishes after a consistent commit, or after the driver changes its stack. */
  publish(): void {
    if (this.disposed) return;
    const next = { canUndo: this.api.canUndo, canRedo: this.api.canRedo };
    if (next.canUndo === this.last.canUndo && next.canRedo === this.last.canRedo) return;
    this.last = next;
    for (const listener of [...this.listeners]) try { listener(next); } catch (error) { this.report(error); }
  }

  /** Releases the driver subscription and public observers exactly once. */
  destroy(): void { if (this.disposed) return; this.disposed = true; this.unsubscribe?.(); this.listeners.clear(); }

  /** @param direction - Requested branch. @returns Effective availability including input and permission guards. */
  private available(direction: "undo" | "redo"): boolean {
    const state = this.view()?.state;
    return !!state && !this.disposed && !this.blocked() && !state.readOnly && !state.field(compositionField, false)
      && (direction === "undo" ? this.driver.canUndo(state) : this.driver.canRedo(state));
  }
}
