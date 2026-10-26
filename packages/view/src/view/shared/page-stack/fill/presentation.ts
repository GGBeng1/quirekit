import { resolveMountedPageStackInteractionBlockLimit } from "../interaction-window";
import { createQuirePageStackFillController } from "./factory";
import type {
  PrepareQuirePageStackFillRenderOptions,
  QuirePageStackFillController,
  QuirePageStackFillPresentationLifecycle,
  QuirePageStackFillPresentationLifecycleOptions,
  QuirePageStackFillRenderWindow
} from "./types";

/** Canonical fill lifecycle owned by one paginated backend presentation. */
export class MountedPageStackFillPresentationLifecycle
  implements QuirePageStackFillPresentationLifecycle
{
  /** Low-level generation and scheduling state hidden from mounted facades. */
  private readonly controller: QuirePageStackFillController;

  /**
   * Creates one presentation-owned fill lifecycle.
   *
   * @param options - Viewport policy and backend fill capabilities.
   */
  constructor(
    private readonly options: QuirePageStackFillPresentationLifecycleOptions
  ) {
    this.controller = createQuirePageStackFillController({
      scheduler: options.scheduler,
      resumeCooldownMs: options.resumeCooldownMs,
      resolveChunkSize: options.resolveChunkSize,
      isAvailable: options.isAvailable,
      executePass: options.executePass,
      onInitialBridge: options.onInitialBridge,
      onAdvance: options.onAdvance
    });
  }

  /**
   * Resolves the bounded layout window for one presentation render.
   *
   * The initial phase establishes a viewport-sized generation. Focused edits
   * may establish a new bounded generation only after previous fill converges,
   * preserving one scheduling authority while keeping controller state private.
   *
   * @param options - Initial and focused-interaction document facts.
   * @returns Layout window consumed by the backend render.
   */
  prepareRender(
    options: PrepareQuirePageStackFillRenderOptions
  ): QuirePageStackFillRenderWindow {
    const totalBlockCount = Math.max(0, Math.floor(options.totalBlockCount));
    let maxShapedBlockExtent: number | undefined;

    if (options.initial) {
      this.controller.reset();
    }

    if (
      options.initial
      && totalBlockCount > this.options.minimumBlockCount
      && !this.controller.started
    ) {
      const initialBlockLimit = Math.min(
        totalBlockCount,
        Math.max(1, Math.floor(this.options.resolveInitialBlockLimit()))
      );
      if (this.controller.start({ total: totalBlockCount, initialBlockLimit })) {
        maxShapedBlockExtent = Math.max(
          0,
          this.options.resolveInitialShapedBlockExtent()
        );
      }
    }

    if (
      options.interactionFirstDirtyBlockIndex !== undefined
      && totalBlockCount > this.options.minimumBlockCount
      && !this.controller.isIncomplete()
    ) {
      const blockLimit = resolveMountedPageStackInteractionBlockLimit({
        totalBlockCount,
        firstDirtyBlockIndex: options.interactionFirstDirtyBlockIndex,
        blockWindowSize: this.options.resolveInitialBlockLimit()
      });
      if (blockLimit !== undefined) {
        this.controller.activateInteraction({
          total: totalBlockCount,
          blockLimit
        });
      }
    }

    const blockLimit = this.controller.blockLimit;

    return {
      ...(blockLimit !== undefined && blockLimit < totalBlockCount
        ? { maxBlocks: blockLimit }
        : {}),
      ...(maxShapedBlockExtent === undefined ? {} : { maxShapedBlockExtent }),
      initialWindowActive: options.initial && this.controller.started
    };
  }

  /** Defers incomplete fill so focused interaction owns the next frame. */
  postponeForInteraction(): void {
    this.controller.postponeForInteraction();
  }

  /** Resumes postponed fill after focused interaction has painted. */
  resumeAfterInteraction(): void {
    this.controller.resumeAfterInteraction();
  }

  /** Cancels fill generations and all presentation-owned scheduled work. */
  destroy(): void {
    this.controller.destroy();
  }
}

/**
 * Creates one presentation-owned page-stack fill lifecycle.
 *
 * @param options - Viewport policy and backend fill capabilities.
 * @returns Semantic fill lifecycle consumed by a backend presentation.
 */
export function createQuirePageStackFillPresentationLifecycle(
  options: QuirePageStackFillPresentationLifecycleOptions
): QuirePageStackFillPresentationLifecycle {
  return new MountedPageStackFillPresentationLifecycle(options);
}
