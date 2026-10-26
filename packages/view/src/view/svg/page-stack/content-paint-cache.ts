import type { QuireDisplayList, QuireRect } from "@quirekit/renderer";
import type { QuirePageFrame } from "../../shared";
import {
  createQuirePageStackDisplayListPaintSignature,
  createQuirePageStackDisplayListPaintSignaturesForRects,
  createQuirePageStackDisplayListPaintSignatureForRect,
  createQuirePageStackRectPaintSignature,
  QuirePageStackDisplayCommandPaintSignatureCache,
  QuirePageStackPaintObjectSignatureResolver,
  QuirePageSurfacePaintValidityCache
} from "../../shared";
import type { SvgPageStackFrameElements } from "./frames";

/** Counters exposed by the SVG page-stack content paint cache. */
export interface SvgPageStackContentPaintCacheSnapshot {
  /** Cache hits where a page content SVG sync was skipped. */
  readonly hits: number;
  /** Cache misses where page content had to be synchronized. */
  readonly misses: number;
  /** Signatures stored after successful content synchronization. */
  readonly stores: number;
}

/** Inputs used to decide whether a page content SVG needs synchronization. */
export interface SvgPageStackContentPaintRequest {
  /** Mounted page frame whose content SVG may be reused. */
  readonly frame: QuirePageFrame<SvgPageStackFrameElements>;
  /** Document-space content display list to summarize for the page. */
  readonly displayList: QuireDisplayList;
  /** Page rectangle used to scope the content display list. */
  readonly viewportRect: QuireRect;
  /** Whether `displayList` is already filtered to `viewportRect`. */
  readonly displayListIsViewportScoped?: boolean | undefined;
}

/** Result of one SVG content paint cache lookup. */
export interface SvgPageStackContentPaintDecision {
  /** Whether the caller must synchronize the content SVG. */
  readonly shouldPaint: boolean;
  /** Signature resolved for this page content paint request. */
  readonly signature: string;
}

/**
 * Caches the last content paint signature for each mounted SVG page surface.
 */
export class SvgPageStackContentPaintCache {
  /** Canonical live-surface validity shared with other mounted page surfaces. */
  private readonly validity =
    new QuirePageSurfacePaintValidityCache<SVGSVGElement>();

  /** Stable ids for image sources that affect paint output. */
  private readonly objectSignatureResolver = new QuirePageStackPaintObjectSignatureResolver();

  /** Reused command paint signatures for identity-stable display commands. */
  private readonly commandSignatureCache = new QuirePageStackDisplayCommandPaintSignatureCache();

  /**
   * Resolves whether a page content SVG needs synchronization.
   *
   * @param request - Page frame and page-filtered display list.
   * @returns Paint decision and the signature to store after a successful sync.
   */
  resolve(
    request: SvgPageStackContentPaintRequest
  ): SvgPageStackContentPaintDecision {
    return this.resolveSignature(request, this.buildSignature(request));
  }

  /**
   * Resolves content-paint decisions for multiple mounted pages.
   *
   * Requests that share one document-space display list are signed with a single
   * command walk. Other shapes fall back to the single-page resolver so
   * page-scoped callers keep identical behavior.
   *
   * @param requests - Page content paint requests in mounted-frame order.
   * @returns Paint decisions matching the request order.
   */
  resolveBatch(
    requests: readonly SvgPageStackContentPaintRequest[]
  ): readonly SvgPageStackContentPaintDecision[] {
    const commandSignatures = this.resolveBatchCommandSignatures(requests);

    if (commandSignatures === undefined) {
      return requests.map((request) => this.resolve(request));
    }

    return requests.map((request, index) =>
      this.resolveSignature(
        request,
        this.buildSignature(request, commandSignatures[index]!)
      )
    );
  }

  /**
   * Resolves a paint decision from an already assembled content signature.
   *
   * @param request - Page content paint request.
   * @param signature - Stable signature for all paint-affecting inputs.
   * @returns Paint decision for the request.
   */
  private resolveSignature(
    request: SvgPageStackContentPaintRequest,
    signature: string
  ): SvgPageStackContentPaintDecision {
    const decision = this.validity.resolve(
      request.frame.surface.content,
      signature
    );

    return {
      shouldPaint: decision.action === "refresh",
      signature
    };
  }

  /**
   * Stores a page content signature after the caller has synchronized it.
   *
   * @param frame - Frame whose content SVG was synchronized.
   * @param decision - Paint decision returned by {@link resolve}.
   */
  commit(
    frame: QuirePageFrame<SvgPageStackFrameElements>,
    decision: SvgPageStackContentPaintDecision
  ): void {
    this.validity.commit(frame.surface.content, {
      action: "refresh",
      signature: decision.signature
    });
  }

  /**
   * Reads cache counters for tests and diagnostics.
   *
   * @returns Snapshot of content paint cache counters.
   */
  snapshot(): SvgPageStackContentPaintCacheSnapshot {
    return this.validity.snapshot();
  }

  /** Clears live SVG content validity and diagnostics during teardown. */
  destroy(): void {
    this.validity.reset();
  }

  /**
   * Builds the signature that protects content SVG reuse.
   *
   * @param request - Page content paint request.
   * @returns Stable signature for all inputs that affect page content paint.
   */
  private buildSignature(
    request: SvgPageStackContentPaintRequest,
    commandSignature?: string | undefined
  ): string {
    const { frame } = request;

    return [
      `page:${frame.pageIndex}`,
      `rect:${createQuirePageStackRectPaintSignature(frame.pageRect)}`,
      `epoch:${frame.surface.content.dataset.qkContentPaintEpoch ?? ""}`,
      `commands:${commandSignature ?? this.commandsSignature(request)}`
    ].join("|");
  }

  /**
   * Serializes page-filtered display commands for paint equality checks.
   *
   * @param request - Page content paint request.
   * @returns Serialized command signature.
   */
  private commandsSignature(request: SvgPageStackContentPaintRequest): string {
    if (request.displayListIsViewportScoped) {
      return createQuirePageStackDisplayListPaintSignature(
        request.displayList,
        (value) => this.objectSignatureResolver.resolve(value),
        this.commandSignatureCache
      );
    }

    return createQuirePageStackDisplayListPaintSignatureForRect(
      request.displayList,
      request.viewportRect,
      (value) => this.objectSignatureResolver.resolve(value),
      this.commandSignatureCache
    );
  }

  /**
   * Resolves command signatures for a same-display-list request batch.
   *
   * @param requests - Page content paint requests in mounted-frame order.
   * @returns Batched command signatures, or undefined when requests cannot batch safely.
   */
  private resolveBatchCommandSignatures(
    requests: readonly SvgPageStackContentPaintRequest[]
  ): readonly string[] | undefined {
    if (requests.length === 0) {
      return [];
    }

    const firstRequest = requests[0]!;

    if (firstRequest.displayListIsViewportScoped) {
      return undefined;
    }

    for (const request of requests) {
      if (
        request.displayList !== firstRequest.displayList
        || request.displayListIsViewportScoped
      ) {
        return undefined;
      }
    }

    return createQuirePageStackDisplayListPaintSignaturesForRects(
      firstRequest.displayList,
      requests.map((request) => request.viewportRect),
      (value) => this.objectSignatureResolver.resolve(value),
      this.commandSignatureCache
    );
  }

}

/**
 * Creates an empty SVG page-stack content paint cache.
 *
 * @returns SVG page-stack content paint cache ready for a mounted view or test.
 */
export function createSvgPageStackContentPaintCache(): SvgPageStackContentPaintCache {
  return new SvgPageStackContentPaintCache();
}
