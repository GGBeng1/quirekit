import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorHostAcquireResult,
  ClassicEditorHostAdapterRequest,
  ClassicEditorHostResourceResult,
  ClassicEditorHostServices
} from "../../types/host";
import { ClassicEditorHostResourceCoordinator } from "./coordinator";
import { createDefaultClassicEditorHostServices } from "./services";
import {
  createHostTestAcquireIntent,
  createHostTestDeferred,
  createHostTestServices
} from "./test-fixtures";

describe("Classic Editor Host resource coordinator", () => {
  it("admits matching typed success for every service method", async () => {
    const resource = {
      id: "prepared",
      digest: "digest",
      bytes: 1,
      mimeType: "image/png"
    };
    const services: ClassicEditorHostServices = {
      acquire: async ({ intent }) => ({
        kind: "acquire", jobId: intent.jobId, operationId: intent.operationId,
        attempt: intent.attempt, generation: intent.generation,
        outcome: "success", resource
      }),
      resolve: async ({ intent }) => ({
        kind: "resolve", jobId: intent.jobId, operationId: intent.operationId,
        attempt: intent.attempt, generation: intent.generation,
        outcome: "success", resource
      }),
      upload: async ({ intent }) => ({
        kind: "upload", jobId: intent.jobId, operationId: intent.operationId,
        attempt: intent.attempt, generation: intent.generation,
        outcome: "success", resource
      }),
      open: async ({ intent }) => ({
        kind: "open", jobId: intent.jobId, operationId: intent.operationId,
        attempt: intent.attempt, generation: intent.generation,
        outcome: "success", dispatchId: "opened"
      })
    };
    const coordinator = new ClassicEditorHostResourceCoordinator(services);

    await expect(coordinator.start(createHostTestAcquireIntent())).resolves
      .toMatchObject({ outcome: "success", resource });
  });

  it("uses the deterministic default adapter without external effects", async () => {
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createDefaultClassicEditorHostServices()
    );

    await expect(coordinator.start(createHostTestAcquireIntent())).resolves
      .toMatchObject({
        outcome: "denied",
        diagnostic: { code: "host-adapter-unavailable" }
      });
  });

  it("rejects a late result whose generation does not match", async () => {
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({
        acquire: async ({ intent }) => ({
          kind: "acquire",
          jobId: intent.jobId,
          operationId: intent.operationId,
          attempt: intent.attempt,
          generation: intent.generation + 1,
          outcome: "cancelled"
        })
      })
    );

    await expect(coordinator.start(createHostTestAcquireIntent())).resolves.toBeNull();
    expect(coordinator.snapshot?.result).toBeNull();
  });

  it("retries from the captured intent rather than caller-tampered facts", async () => {
    const acquire = vi.fn(async (
      request: ClassicEditorHostAdapterRequest<
        ReturnType<typeof createHostTestAcquireIntent>
      >
    ): Promise<ClassicEditorHostAcquireResult> => ({
      kind: "acquire",
      jobId: request.intent.jobId,
      operationId: request.intent.operationId,
      attempt: request.intent.attempt,
      generation: request.intent.generation,
      outcome: "denied",
      diagnostic: { code: "network", retryable: true }
    }));
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({ acquire })
    );
    const initial = createHostTestAcquireIntent();

    await coordinator.start(initial);
    await coordinator.retry({
      ...initial,
      policyRevision: "tampered-policy",
      source: { kind: "file", id: "tampered-source" }
    });

    expect(acquire).toHaveBeenLastCalledWith(expect.objectContaining({
      intent: expect.objectContaining({
        attempt: 1,
        generation: 2,
        policyRevision: "policy-1",
        source: { kind: "file", id: "source" }
      })
    }));
  });

  it("keeps cancellation terminal and retains the captured intent", async () => {
    const deferred = createHostTestDeferred<ClassicEditorHostAcquireResult>();
    let signal: AbortSignal | undefined;
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({
        acquire: (request) => {
          signal = request.signal;
          return deferred.promise;
        }
      })
    );
    const active = createHostTestAcquireIntent();
    const pending = coordinator.start(active);

    coordinator.cancel({
      ...active,
      policyRevision: "tampered-policy",
      source: { kind: "file", id: "tampered-source" }
    });
    expect(signal?.aborted).toBe(true);
    expect(coordinator.snapshot?.intent).toMatchObject({
      policyRevision: "policy-1",
      source: { kind: "file", id: "source" }
    });
    deferred.resolve(cancelledAcquireResult(active));

    await expect(pending).resolves.toBeNull();
    expect(coordinator.snapshot?.result?.outcome).toBe("cancelled");
  });

  it("returns a deeply frozen terminal result and freezes caller intent facts", async () => {
    const source = { kind: "file" as const, id: "source" };
    const intent = { ...createHostTestAcquireIntent(), source };
    const resource = {
      id: "prepared",
      digest: "digest",
      bytes: 1,
      mimeType: "image/png"
    };
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({
        acquire: async ({ intent: active }) => ({
          kind: "acquire",
          jobId: active.jobId,
          operationId: active.operationId,
          attempt: active.attempt,
          generation: active.generation,
          outcome: "success",
          resource
        })
      })
    );

    const result = await coordinator.start(intent);
    source.id = "mutated-after-start";

    expect(Object.isFrozen(result)).toBe(true);
    expect(result?.outcome).toBe("success");
    if (result?.outcome !== "success" || result.kind === "open") {
      throw new Error("Expected prepared Host success.");
    }
    expect(Object.isFrozen(result.resource)).toBe(true);
    expect(Object.isFrozen(coordinator.snapshot?.intent)).toBe(true);
    expect(coordinator.snapshot?.intent).toMatchObject({
      source: { kind: "file", id: "source" }
    });
  });

  it("normalizes adapter throws without leaking exception text", async () => {
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({
        acquire: async () => {
          throw new Error("secret upload path");
        }
      })
    );

    await expect(coordinator.start(createHostTestAcquireIntent())).resolves
      .toMatchObject({
        outcome: "failed",
        diagnostic: { code: "host-adapter-failed" }
      });
    expect(JSON.stringify(coordinator.snapshot)).not.toContain("secret upload path");
  });

  it("does not abort or execute again for a duplicate active tuple", async () => {
    let signal: AbortSignal | undefined;
    const acquire = vi.fn((request: Parameters<ClassicEditorHostServices["acquire"]>[0]) => {
      signal = request.signal;
      return new Promise<ClassicEditorHostAcquireResult>(() => undefined);
    });
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({ acquire })
    );
    void coordinator.start(createHostTestAcquireIntent());

    await expect(coordinator.start(createHostTestAcquireIntent())).resolves.toBeNull();
    expect(signal?.aborted).toBe(false);
    expect(acquire).toHaveBeenCalledOnce();
  });
});

/**
 * Creates the matching cancelled result for one fixture intent.
 *
 * @param intent - Acquire intent to correlate.
 * @returns Matching cancelled result.
 */
function cancelledAcquireResult(
  intent: ReturnType<typeof createHostTestAcquireIntent>
): Extract<ClassicEditorHostResourceResult, { readonly kind: "acquire" }> {
  return {
    kind: "acquire",
    jobId: intent.jobId,
    operationId: intent.operationId,
    attempt: intent.attempt,
    generation: intent.generation,
    outcome: "cancelled"
  };
}
