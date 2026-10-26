import { createEditor } from "@quirekit/core";
import { redo, type Transaction, undo } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import {
  composeHtmlScheduledTransactions,
  createHtmlRenderScheduler
} from "./index";

describe("HTML render scheduler", () => {
  it("coalesces updates and runs measured phases in strict order", () => {
    const frames: Array<() => void> = [];
    const versions: Array<readonly number[]> = [];
    const scheduler = createHtmlRenderScheduler({
      readCurrentRevision: () => ({ stateVersion: 2, layoutEpoch: 2 }),
      requestFrame: (callback) => {
        frames.push(callback);
        return frames.length;
      },
      cancelFrame: vi.fn(),
      now: createClock(),
      runContentWrite: (update) => {
        versions.push(update.stateVersions);
        return "content";
      },
      runGeometryRead: (_update, content) => `${content}:geometry`,
      runOverlayWrite: vi.fn()
    });

    scheduler.request({
      reason: "transaction",
      stateVersions: [1],
      revision: { stateVersion: 1, layoutEpoch: 1 }
    });
    scheduler.request({
      reason: "transaction",
      stateVersions: [2],
      revision: { stateVersion: 2, layoutEpoch: 2 }
    });
    frames[0]?.();

    expect(versions).toEqual([[1, 2]]);
    expect(scheduler.getDiagnostics().phases.map((phase) => phase.name)).toEqual([
      "content-write",
      "geometry-read",
      "overlay-write"
    ]);
    expect(scheduler.getDiagnostics().scheduler.coalescedRequests).toBe(1);
  });

  it("skips reconciliation and content writes for selection-only updates", () => {
    const runContentWrite = vi.fn(() => undefined);
    const scheduler = createHtmlRenderScheduler({
      readCurrentRevision: () => ({ stateVersion: 3, layoutEpoch: 1 }),
      now: createClock(),
      runContentWrite,
      runGeometryRead: vi.fn(),
      runOverlayWrite: vi.fn()
    });

    scheduler.request(
      {
        reason: "selection",
        stateVersions: [3],
        revision: { stateVersion: 3, layoutEpoch: 1 },
        selectionOnly: true
      },
      { mode: "sync" }
    );

    expect(runContentWrite).not.toHaveBeenCalled();
    expect(scheduler.getDiagnostics().reconciliationFrames).toBe(0);
    expect(scheduler.getDiagnostics().contentWrites).toBe(0);
  });

  it("records and rejects geometry reads during content-write", () => {
    const scheduler = createHtmlRenderScheduler({
      readCurrentRevision: () => ({ stateVersion: 4, layoutEpoch: 4 }),
      now: createClock(),
      runContentWrite: (_update, phase) => phase.readGeometry(() => 42),
      runGeometryRead: vi.fn(),
      runOverlayWrite: vi.fn()
    });

    expect(() => {
      scheduler.request(
        {
          reason: "transaction",
          stateVersions: [4],
          revision: { stateVersion: 4, layoutEpoch: 4 }
        },
        { mode: "sync" }
      );
    }).toThrow(/content-write/);
    expect(scheduler.getDiagnostics().forcedLayoutRisks).toBe(1);
  });

  it("flushes pending work synchronously and ignores work after destroy", () => {
    const execute = vi.fn();
    const scheduler = createHtmlRenderScheduler({
      readCurrentRevision: () => ({ stateVersion: 1, layoutEpoch: 1 }),
      requestFrame: () => 1,
      cancelFrame: vi.fn(),
      now: createClock(),
      runContentWrite: execute,
      runGeometryRead: vi.fn(),
      runOverlayWrite: vi.fn()
    });

    scheduler.request({
      reason: "transaction",
      stateVersions: [1],
      revision: { stateVersion: 1, layoutEpoch: 1 }
    });
    expect(scheduler.flush().scheduler.forcedFlushes).toBe(1);
    scheduler.destroy();
    scheduler.request(
      {
        reason: "transaction",
        stateVersions: [2],
        revision: { stateVersion: 2, layoutEpoch: 2 }
      },
      { mode: "sync" }
    );

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("rejects an HTML render whose mounted revision has been superseded", () => {
    const runContentWrite = vi.fn();
    const scheduler = createHtmlRenderScheduler({
      readCurrentRevision: () => ({ stateVersion: 2, layoutEpoch: 2 }),
      runContentWrite,
      runGeometryRead: vi.fn(),
      runOverlayWrite: vi.fn()
    });

    scheduler.request(
      {
        reason: "transaction",
        stateVersions: [1],
        revision: { stateVersion: 1, layoutEpoch: 1 }
      },
      { mode: "sync" }
    );

    expect(runContentWrite).not.toHaveBeenCalled();
    expect(scheduler.getDiagnostics().scheduler.staleUpdates).toBe(1);
  });
});

describe("HTML scheduled transaction composition", () => {
  it("composes sequential transaction coordinate spaces", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "abcd" }]
          }
        ]
      }
    });
    const first = editor.state.pm.tr.insertText("X", 2);
    editor.view.dispatch(first);
    const second = editor.state.pm.tr.insertText("Y", 4);
    editor.view.dispatch(second);

    const composed = composeHtmlScheduledTransactions([first, second]);

    expect(composed.mapping.map(4)).toBe(6);
    expect(composed.documentNode).toBe(second.doc);
    expect(composed.documentNode.textContent).toBe("aXbYcd");
    expect(composed.changedRanges.length).toBeGreaterThan(0);
  });

  it("preserves canonical document identity across queued history transitions", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "abc" }] }]
      }
    });
    const insert = editor.state.pm.tr.insertText("X", 2);
    editor.view.dispatch(insert);
    const undoTransaction = captureHistoryTransaction(editor, undo);
    editor.view.dispatch(undoTransaction);

    const undoComposition = composeHtmlScheduledTransactions([
      insert,
      undoTransaction
    ]);

    expect(undoComposition.documentNode).toBe(undoTransaction.doc);
    expect(undoComposition.documentNode).toBe(editor.state.pm.doc);
    expect(undoComposition.documentNode.textContent).toBe("abc");

    const redoTransaction = captureHistoryTransaction(editor, redo);
    editor.view.dispatch(redoTransaction);
    const redoComposition = composeHtmlScheduledTransactions([redoTransaction]);

    expect(redoComposition.documentNode).toBe(redoTransaction.doc);
    expect(redoComposition.documentNode).toBe(editor.state.pm.doc);
    expect(redoComposition.documentNode.textContent).toBe("aXbc");
  });
});

/** PM history command shape used by the scheduler identity fixture. */
type HistoryCommand = (
  state: Parameters<typeof undo>[0],
  dispatch?: (transaction: Transaction) => void
) => boolean;

/**
 * Captures the transaction produced by one history command without hiding it
 * behind editor dispatch, so the scheduled HTML composition can be inspected.
 *
 * @param editor - Editor whose current history state should run the command.
 * @param command - Undo or redo command to execute.
 * @returns Transaction produced by the history command.
 */
function captureHistoryTransaction(
  editor: ReturnType<typeof createEditor>,
  command: HistoryCommand
): Transaction {
  let transaction: Transaction | undefined;
  const handled = command(editor.state.pm, (next) => {
    transaction = next;
  });

  if (!handled || transaction === undefined) {
    throw new RangeError("Expected history command to produce a transaction.");
  }

  return transaction;
}

/** Creates a deterministic monotonic test clock. */
function createClock(): () => number {
  let time = 0;
  return () => {
    time += 1;
    return time;
  };
}
