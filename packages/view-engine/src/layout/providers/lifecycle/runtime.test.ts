import { describe, expect, it } from "vitest";
import { createQuireLayoutProviderExecutionLifecycle } from "./runtime";
import type { QuireLayoutProviderContinuation } from "../types";

describe("layout provider execution lifecycle", () => {
  it("offers an accepted continuation only to the same owner, provider, and exact source", () => {
    const lifecycle = createQuireLayoutProviderExecutionLifecycle();
    lifecycle.beginSnapshot(1);
    const first = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 1,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    const continuation = createContinuation(first, "columns:v1");
    lifecycle.acceptExecution(first, continuation);
    lifecycle.endSnapshot(1);

    lifecycle.beginSnapshot(2);
    const second = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 2,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });

    expect(second.previousContinuation).toBe(continuation);
    expect(second.job.isCanceled()).toBe(false);
  });

  it("clears continuation when an accepted execution is terminal", () => {
    const lifecycle = createQuireLayoutProviderExecutionLifecycle();
    lifecycle.beginSnapshot(1);
    const first = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 1,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    lifecycle.acceptExecution(first, createContinuation(first, "columns:v1"));
    lifecycle.endSnapshot(1);

    lifecycle.beginSnapshot(2);
    const terminal = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 2,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    lifecycle.acceptExecution(terminal, null);
    lifecycle.endSnapshot(2);

    lifecycle.beginSnapshot(3);
    expect(lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 3,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    }).previousContinuation).toBeUndefined();
  });

  it("does not revive continuation after provider or exact source replacement", () => {
    const lifecycle = createQuireLayoutProviderExecutionLifecycle();
    lifecycle.beginSnapshot(1);
    const first = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 1,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    lifecycle.acceptExecution(first, createContinuation(first, "columns:v1"));
    lifecycle.endSnapshot(1);

    lifecycle.beginSnapshot(2);
    const shifted = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 2,
      source: { sourceId: "document-node:block:1", range: { from: 11, to: 21 } }
    });
    expect(shifted.previousContinuation).toBeUndefined();
    lifecycle.rejectExecution(shifted);
    lifecycle.endSnapshot(2);

    lifecycle.beginSnapshot(3);
    expect(lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:table",
      snapshotVersion: 3,
      source: { sourceId: "document-node:block:1", range: { from: 11, to: 21 } }
    }).previousContinuation).toBeUndefined();
  });

  it("cancels jobs when a newer snapshot supersedes their execution epoch", () => {
    const lifecycle = createQuireLayoutProviderExecutionLifecycle();
    lifecycle.beginSnapshot(1);
    const first = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 1,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });

    expect(first.job.isCanceled()).toBe(false);
    lifecycle.beginSnapshot(2);
    expect(first.job.isCanceled()).toBe(true);
    expect(first.job.isCanceled()).toBe(true);
    expect(lifecycle.snapshot()).toMatchObject({
      openedExecutions: 1,
      canceledJobs: 1
    });
  });

  it("publishes continuation atomically and preserves prior state after abort", () => {
    const lifecycle = createQuireLayoutProviderExecutionLifecycle();
    lifecycle.beginSnapshot(1);
    const first = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 1,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    const committed = createContinuation(first, "columns:committed");
    lifecycle.acceptExecution(first, committed);
    lifecycle.endSnapshot(1);

    lifecycle.beginSnapshot(2);
    const interrupted = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 2,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    lifecycle.acceptExecution(
      interrupted,
      createContinuation(interrupted, "columns:unpublished")
    );
    lifecycle.abortSnapshot(2);

    lifecycle.beginSnapshot(3);
    expect(lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 3,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    }).previousContinuation).toBe(committed);
    expect(lifecycle.snapshot().committedContinuations).toBe(1);
  });

  it("prunes continuation for providers absent from a successful snapshot", () => {
    const lifecycle = createQuireLayoutProviderExecutionLifecycle();
    lifecycle.beginSnapshot(1);
    const first = lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 1,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    });
    lifecycle.acceptExecution(first, createContinuation(first, "columns:v1"));
    lifecycle.endSnapshot(1);

    lifecycle.beginSnapshot(2);
    lifecycle.endSnapshot(2);

    lifecycle.beginSnapshot(3);
    expect(lifecycle.openExecution({
      ownerId: "block:1",
      providerId: "provider:columns",
      snapshotVersion: 3,
      source: { sourceId: "document-node:block:1", range: { from: 10, to: 20 } }
    }).previousContinuation).toBeUndefined();
    expect(lifecycle.snapshot().discardedContinuations).toBe(1);
  });
});

/**
 * Creates continuation output bound to one lifecycle execution.
 *
 * @param execution - Current lifecycle execution lease.
 * @param dependencySignature - Provider-owned dependency signature.
 * @returns Immutable continuation accepted by lifecycle authority.
 */
function createContinuation(
  execution: {
    readonly providerId: string;
    readonly snapshotVersion: number;
    readonly source: QuireLayoutProviderContinuation["source"];
  },
  dependencySignature: string
): QuireLayoutProviderContinuation {
  return {
    providerId: execution.providerId,
    snapshotVersion: execution.snapshotVersion,
    source: execution.source,
    dependencySignature,
    state: { nextChildIndex: 2 }
  };
}
