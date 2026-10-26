import { UndoManager, type Text } from "yjs";
import type { EditorSelection, Transaction } from "@quirekit/cm-state";
import { isolateHistory } from "@quirekit/cm-commands";
import type { MsfeHistoryDriver } from "@quirekit/msfe-core/source-provider";
import { relativeSelection } from "./selection";
import type { RelativeSelection } from "./types";
import type { SessionNotifications } from "../session/notifications";

const selectionKey = Symbol("msfe.selection-before");

/** One local author's history, surviving editor detach while the session remains alive. */
export class CollaborationHistory {
  readonly manager: UndoManager;
  readonly driver: MsfeHistoryDriver;
  restoring: RelativeSelection | undefined;
  private pending: RelativeSelection | undefined;
  private readonly listeners = new Set<() => void>();

  /** @param text - Shared source scope. @param origin - Local tracked author identity. @param notifications - Settled host observation boundary. @param captureTimeout - Input grouping window. */
  constructor(private readonly text: Text, origin: object, private readonly notifications: SessionNotifications, captureTimeout = 500) {
    this.manager = new UndoManager(text, { trackedOrigins: new Set([origin]), captureTimeout });
    this.manager.on("stack-item-added", event => {
      if (this.pending) event.stackItem.meta.set(selectionKey, this.pending);
      this.publish();
    });
    this.manager.on("stack-item-popped", () => this.publish());
    this.manager.on("stack-cleared", () => this.publish());
    this.driver = { extensions: [], canUndo: () => this.manager.canUndo(), canRedo: () => this.manager.canRedo(),
      undo: view => this.run("undo", view.state.selection), redo: view => this.run("redo", view.state.selection),
      subscribe: listener => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; } };
  }

  /** @param transaction - Accepted local transaction. @param commit - One source/CM atomic commit. */
  capture(transaction: Transaction, commit: () => void): void {
    this.notifications.hold(() => {
      const isolate = transaction.annotation(isolateHistory);
      if (isolate === "before" || isolate === "full" || (!transaction.docChanged && transaction.selection)) this.manager.stopCapturing();
      this.pending = relativeSelection(this.text, transaction.startState.selection);
      try { commit(); } finally {
        this.pending = undefined;
        if (isolate === "after" || isolate === "full") this.manager.stopCapturing();
      }
    });
  }

  /** Releases history resources when the host closes the session. */
  destroy(): void { this.manager.destroy(); this.listeners.clear(); }

  /** @param direction - Requested branch. @param selection - Selection before history starts. @returns Whether an item was applied. */
  private run(direction: "undo" | "redo", selection: EditorSelection): boolean {
    const stack = direction === "undo" ? this.manager.undoStack : this.manager.redoStack;
    const item = stack.at(-1);
    if (!item) return false;
    this.manager.stopCapturing();
    this.pending = relativeSelection(this.text, selection);
    this.restoring = item.meta.get(selectionKey) as RelativeSelection | undefined;
    return this.notifications.hold(() => {
      try { return this.manager[direction]() !== null; }
      finally { this.pending = undefined; this.restoring = undefined; this.manager.stopCapturing(); }
    });
  }

  /** Publishes stack mutations independently of source changes. */
  private publish(): void { for (const listener of [...this.listeners]) listener(); }
}
