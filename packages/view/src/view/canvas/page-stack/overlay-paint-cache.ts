import type {
  CanvasGlyphRunPainter,
  QuireDisplayList
} from "@quirekit/renderer";
import {
  createQuirePageStackDisplayListPaintSignature,
  createQuirePageStackRectPaintSignature,
  QuirePageStackDisplayCommandPaintSignatureCache,
  QuirePageStackPaintObjectSignatureResolver,
  QuirePageSurfacePaintValidityCache
} from "../../shared";
import type { CanvasPageStackFrame } from "./frames";

/** Counters exposed by the page-stack overlay paint cache. */
export interface CanvasPageStackOverlayPaintCacheSnapshot {
  /** Cache hits where a page overlay repaint was skipped. */
  readonly hits: number;
  /** Cache misses where a page overlay had to be painted. */
  readonly misses: number;
  /** Signatures stored after successful overlay paints. */
  readonly stores: number;
}

/** Inputs used to decide whether a page overlay surface needs repainting. */
export interface CanvasPageStackOverlayPaintRequest {
  /** Mounted page frame whose overlay canvas may be reused. */
  readonly frame: CanvasPageStackFrame;
  /** Page-scoped overlay display list after caret filtering, if any. */
  readonly displayList: QuireDisplayList;
  /** Device pixel ratio used by the page overlay backing store. */
  readonly devicePixelRatio: number;
  /** Optional glyph-run painter that may change overlay paint output. */
  readonly glyphRunPainter?: CanvasGlyphRunPainter | undefined;
}

/** Result of one overlay paint cache lookup. */
export interface CanvasPageStackOverlayPaintDecision {
  /** Whether the caller must repaint the overlay canvas. */
  readonly shouldPaint: boolean;
  /** Signature resolved for this page overlay paint request. */
  readonly signature: string;
}

/**
 * Caches the last overlay paint signature for each mounted page-stack canvas.
 */
export class CanvasPageStackOverlayPaintCache {
  /** Canonical live-surface validity shared with other mounted page surfaces. */
  private readonly validity =
    new QuirePageSurfacePaintValidityCache<HTMLCanvasElement>();
  /** Stable ids for glyph painters and image sources that affect paint output. */
  private readonly objectSignatureResolver = new QuirePageStackPaintObjectSignatureResolver();
  /** Reused command paint signatures for identity-stable display commands. */
  private readonly commandSignatureCache = new QuirePageStackDisplayCommandPaintSignatureCache();
  /**
   * Resolves whether a page overlay canvas needs repainting.
   *
   * @param request - Page frame, page-scoped overlay list, DPR, and painter.
   * @returns Paint decision and the signature to store after a successful paint.
   */
  resolve(
    request: CanvasPageStackOverlayPaintRequest
  ): CanvasPageStackOverlayPaintDecision {
    const signature = this.buildSignature(request);
    const decision = this.validity.resolve(request.frame.overlay, signature);

    return {
      shouldPaint: decision.action === "refresh",
      signature
    };
  }

  /**
   * Stores a page overlay signature after the caller has repainted it.
   *
   * @param frame - Frame whose overlay canvas was painted.
   * @param decision - Paint decision returned by {@link resolve}.
   */
  commit(frame: CanvasPageStackFrame, decision: CanvasPageStackOverlayPaintDecision): void {
    this.validity.commit(frame.overlay, {
      action: "refresh",
      signature: decision.signature
    });
  }

  /**
   * Reads cache counters for tests and diagnostics.
   *
   * @returns Snapshot of overlay paint cache counters.
   */
  snapshot(): CanvasPageStackOverlayPaintCacheSnapshot {
    return this.validity.snapshot();
  }

  /** Clears live overlay validity and diagnostics during presentation teardown. */
  destroy(): void {
    this.validity.reset();
  }

  /**
   * Builds the signature that protects overlay paint reuse.
   *
   * Caret visibility is represented by the caller's already-filtered display
   * list. Pages without caret commands therefore remain cache hits when the blink
   * toggles elsewhere.
   *
   * @param request - Page overlay paint request.
   * @returns Stable signature for all inputs that affect page overlay paint.
   */
  private buildSignature(request: CanvasPageStackOverlayPaintRequest): string {
    const { frame } = request;

    return [
      // The overlay painter sizes its own tiles; geometry resizes advance the epoch.
      `dpr:${request.devicePixelRatio}`,
      `epoch:${frame.overlay.dataset.qkOverlayPaintEpoch ?? ""}`,
      `page:${frame.pageIndex}`,
      `rect:${createQuirePageStackRectPaintSignature(frame.pageRect)}`,
      `painter:${this.objectSignatureResolver.resolve(request.glyphRunPainter)}`,
      `commands:${createQuirePageStackDisplayListPaintSignature(
        request.displayList,
        (value) => this.objectSignatureResolver.resolve(value),
        this.commandSignatureCache
      )}`
    ].join("|");
  }

}

/**
 * Creates a page-stack overlay paint cache.
 *
 * @returns Empty overlay paint cache.
 */
export function createCanvasPageStackOverlayPaintCache(): CanvasPageStackOverlayPaintCache {
  return new CanvasPageStackOverlayPaintCache();
}
