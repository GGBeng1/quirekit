import { layoutQuireInlineTextFragmentsFromQuireLayout } from "@quirekit/layout/inline";
import { QuireLayoutJobExecutionError } from "../errors";
import type { QuireLayoutJobRequest } from "../types";
import type {
  QuireBackgroundShapingJobHandlerOptions,
  QuireBackgroundShapingJobOutput,
} from "./types";
import {
  requireBackgroundShapingPayload,
  requireLocalRuntimeMatchesCapabilitySnapshot,
  requireMatchingCapabilities
} from "./validation";

/**
 * Creates a pure background shaping handler for the main-thread executor.
 *
 * The handler receives only pre-resolved runs and numeric geometry. Live editor,
 * extension, provider, and ProseMirror node identities remain on the main thread.
 * The same payload can therefore be sent to a Worker once an equivalent runtime
 * capability is initialized there.
 *
 * @param options - Local runtime capabilities and shaping implementations.
 * @returns Handler suitable for the background-shaping job kind.
 */
export function createQuireBackgroundShapingJobHandler(
  options: QuireBackgroundShapingJobHandlerOptions
): (request: QuireLayoutJobRequest) => QuireBackgroundShapingJobOutput {
  requireLocalRuntimeMatchesCapabilitySnapshot(options);

  return (request: QuireLayoutJobRequest): QuireBackgroundShapingJobOutput => {
    if (request.kind !== "background-shaping") {
      throw new QuireLayoutJobExecutionError(
        "invalid-payload",
        `Background shaping cannot execute job kind "${request.kind}".`
      );
    }
    const payload = requireBackgroundShapingPayload(request.payload);
    requireMatchingCapabilities(payload.capabilities, options.capabilities);

    return {
      blocks: payload.blocks.map((block) => ({
        attachmentKey: block.attachmentKey,
        fragments: layoutQuireInlineTextFragmentsFromQuireLayout({
          id: block.id,
          runs: block.runs,
          rect: {
            x: 0,
            y: 0,
            width: block.width,
            height: block.lineHeight
          },
          lineHeight: block.lineHeight,
          textBaselineOffset: block.textBaselineOffset,
          textMeasurer: options.textMeasurer,
          lineBreakMode: block.lineBreakMode,
          baseDirection: block.baseDirection,
          ...(options.lineBreaker === undefined
            ? {}
            : { lineBreaker: options.lineBreaker })
        })
      }))
    };
  };
}
