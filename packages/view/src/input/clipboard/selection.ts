import { writeQuireClipboardSelection } from "@quirekit/clipboard";
import { queryQuireViewConsumerDescriptorByOwner } from "@quirekit/view-engine";
import type {
  WriteQuireOwnedClipboardSelectionOptions,
  WriteQuireOwnedClipboardSelectionResult
} from "./types";

const quireViewExportFallbackMime =
  "application/x-quirekit-view-export-fallback+json";

/**
 * Writes the current selection and resolves provider fallback by exact command owner.
 *
 * Standard clipboard serialization remains source-order ProseMirror behavior.
 * Provider metadata is added only when root, region, visual instance, and the
 * retained query index identify the same compiled descriptor.
 *
 * @param options - Editor, retained snapshot, command scope, and clipboard adapter.
 * @returns Internal clipboard result with exact-owner metadata and gaps.
 */
export function writeQuireOwnedClipboardSelection(
  options: WriteQuireOwnedClipboardSelectionOptions
): WriteQuireOwnedClipboardSelectionResult {
  const handled = options.outputStrategy
    ? options.outputStrategy({
        editor: options.editor,
        clipboardData: options.clipboardData
      })
    : writeQuireClipboardSelection({
        editor: options.editor,
        clipboardData: options.clipboardData
      });
  const root = options.scope?.activeRoot;
  const region = options.scope?.activeRegion;

  if (options.snapshot === undefined || root === undefined || region === undefined) {
    return { handled, gaps: [] };
  }
  if (root.value !== region.rootId.value) {
    return {
      handled,
      gaps: [{
        code: "missing-consumer-query-index",
        message: "Command route root and region identities do not match."
      }]
    };
  }

  const query = queryQuireViewConsumerDescriptorByOwner(
    options.snapshot.consumerCompilation,
    {
      rootId: root.value,
      regionId: region.regionId.value,
      ...(region.visualInstanceId === undefined
        ? {}
        : { visualInstanceId: region.visualInstanceId })
    }
  );

  if (query.kind === "unavailable") {
    return { handled, gaps: query.gaps };
  }

  const fallback = query.descriptor.exportFallbacks[0];
  if (fallback !== undefined) {
    // Keep standard PM HTML/plain-text authoritative while preserving the exact
    // retained export decision for QuireKit round-trip and diagnostics consumers.
    options.clipboardData.setData(
      quireViewExportFallbackMime,
      JSON.stringify({
        version: 1,
        owner: {
          rootId: root.value,
          regionId: region.regionId.value,
          ...(region.visualInstanceId === undefined
            ? {}
            : { visualInstanceId: region.visualInstanceId })
        },
        sourceId: query.descriptor.owner.source.sourceId,
        fallback: {
          kind: fallback.kind,
          ...(fallback.targetFormat === undefined
            ? {}
            : { targetFormat: fallback.targetFormat }),
          ...(fallback.reason === undefined ? {} : { reason: fallback.reason })
        }
      })
    );
  }

  return {
    handled,
    descriptor: query.descriptor,
    ...(fallback === undefined ? {} : { fallback }),
    gaps: []
  };
}
