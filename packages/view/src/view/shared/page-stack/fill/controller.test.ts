import { describe, expect, it, vi } from "vitest";
import {
  createPageStackFillSchedulerHarness,
  flushPageStackFillPass,
  runScheduledPageStackFillCallback
} from "../../../../test-support/page-stack-fill";
import { createQuirePageStackFillController } from "./index";

describe("createQuirePageStackFillController", () => {
  it("bridges first paint and advances chunks to completion", async () => {
    const harness = createPageStackFillSchedulerHarness();
    const onInitialBridge = vi.fn();
    const onAdvance = vi.fn();
    const executePass = vi.fn().mockResolvedValue({
      action: "advance",
      render: true
    });
    const controller = createQuirePageStackFillController({
      scheduler: harness.scheduler,
      resumeCooldownMs: 120,
      resolveChunkSize: () => 3,
      isAvailable: () => true,
      executePass,
      onInitialBridge,
      onAdvance
    });

    expect(controller.start({ total: 10, initialBlockLimit: 4 })).toBe(true);
    expect(controller.started).toBe(true);
    expect(controller.blockLimit).toBe(4);
    expect(harness.bridges).toHaveLength(1);
    expect(harness.passes).toHaveLength(0);

    runScheduledPageStackFillCallback(harness.bridges[0]!);
    expect(onInitialBridge).toHaveBeenCalledOnce();
    expect(harness.passes).toHaveLength(1);

    runScheduledPageStackFillCallback(harness.passes[0]!);
    await flushPageStackFillPass();
    expect(executePass).toHaveBeenLastCalledWith(expect.objectContaining({
      total: 10,
      fromIndex: 4,
      toIndex: 7,
      complete: false
    }));
    expect(controller.blockLimit).toBe(7);
    expect(harness.passes).toHaveLength(2);

    runScheduledPageStackFillCallback(harness.passes[1]!);
    await flushPageStackFillPass();
    expect(controller.blockLimit).toBeUndefined();
    expect(controller.total).toBeUndefined();
    expect(controller.isIncomplete()).toBe(false);
    expect(onAdvance).toHaveBeenLastCalledWith({
      complete: true,
      blockLimit: undefined,
      render: true
    });
  });

  it("postpones incomplete work and resumes it after cooldown", () => {
    const harness = createPageStackFillSchedulerHarness();
    const controller = createQuirePageStackFillController({
      scheduler: harness.scheduler,
      resumeCooldownMs: 120,
      resolveChunkSize: () => 2,
      isAvailable: () => true,
      executePass: () => ({ action: "advance", render: false }),
      onInitialBridge: () => {},
      onAdvance: () => {}
    });

    controller.start({ total: 10, initialBlockLimit: 4 });
    runScheduledPageStackFillCallback(harness.bridges[0]!);
    controller.postponeForInteraction();

    expect(controller.interactionResumePending).toBe(true);
    expect(harness.passes[0]?.cancelled).toBe(true);
    controller.resumeAfterInteraction();
    expect(controller.interactionResumePending).toBe(false);
    expect(harness.delays).toHaveLength(1);
    expect(harness.passes).toHaveLength(1);

    runScheduledPageStackFillCallback(harness.delays[0]!);
    expect(harness.passes).toHaveLength(2);
  });

  it("rejects stale async pass output after an interaction rebound", async () => {
    const harness = createPageStackFillSchedulerHarness();
    let resolvePass: ((value: { action: "advance"; render: boolean }) => void) | undefined;
    const onAdvance = vi.fn();
    const controller = createQuirePageStackFillController({
      scheduler: harness.scheduler,
      resumeCooldownMs: 120,
      resolveChunkSize: () => 2,
      isAvailable: () => true,
      executePass: () => new Promise((resolve) => {
        resolvePass = resolve;
      }),
      onInitialBridge: () => {},
      onAdvance
    });

    controller.start({ total: 10, initialBlockLimit: 4 });
    runScheduledPageStackFillCallback(harness.bridges[0]!);
    runScheduledPageStackFillCallback(harness.passes[0]!);
    controller.activateInteraction({ total: 10, blockLimit: 8 });
    resolvePass?.({ action: "advance", render: true });
    await flushPageStackFillPass();

    expect(controller.blockLimit).toBe(8);
    expect(controller.interactionResumePending).toBe(true);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("resets scheduled work before starting a replacement document generation", () => {
    const harness = createPageStackFillSchedulerHarness();
    const controller = createQuirePageStackFillController({
      scheduler: harness.scheduler,
      resumeCooldownMs: 120,
      resolveChunkSize: () => 2,
      isAvailable: () => true,
      executePass: () => ({ action: "advance", render: false }),
      onInitialBridge: () => {},
      onAdvance: () => {}
    });

    controller.start({ total: 40, initialBlockLimit: 4 });
    controller.reset();

    expect(harness.bridges[0]?.cancelled).toBe(true);
    expect(controller.started).toBe(false);
    expect(controller.blockLimit).toBeUndefined();
    expect(controller.total).toBeUndefined();
    expect(controller.interactionResumePending).toBe(false);
    expect(controller.start({ total: 8, initialBlockLimit: 3 })).toBe(true);
    expect(controller.total).toBe(8);
    expect(controller.blockLimit).toBe(3);
  });

  it("destroys every pending callback and refuses future starts", () => {
    const harness = createPageStackFillSchedulerHarness();
    const controller = createQuirePageStackFillController({
      scheduler: harness.scheduler,
      resumeCooldownMs: 120,
      resolveChunkSize: () => 2,
      isAvailable: () => true,
      executePass: () => ({ action: "advance", render: false }),
      onInitialBridge: () => {},
      onAdvance: () => {}
    });

    controller.start({ total: 10, initialBlockLimit: 4 });
    controller.destroy();

    expect(harness.bridges[0]?.cancelled).toBe(true);
    expect(controller.start({ total: 10, initialBlockLimit: 4 })).toBe(false);
  });
});
