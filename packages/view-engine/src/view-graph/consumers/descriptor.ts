import type {
  QuireLayoutRegion,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireViewConsumerCompilationGapCode,
  QuireViewConsumerDescriptorCompilation
} from "./types";

/**
 * Compiles one retained region into a renderer-neutral consumer descriptor.
 *
 * This function is called as regions enter retained graph production. It never
 * traverses a completed graph or borrows missing facts from another region.
 *
 * @param region - Exact retained region occurrence being produced.
 * @param root - Root referenced by the exact region, when present.
 * @returns Complete descriptor or one explicit missing-authority gap.
 */
export function compileQuireViewConsumerDescriptor(
  region: QuireLayoutRegion,
  root: QuireLayoutRoot | undefined
): QuireViewConsumerDescriptorCompilation {
  if (root === undefined) {
    return unavailable("missing-root", region, "Consumer region references a missing root.");
  }
  if (region.source === undefined) {
    return unavailable("missing-source", region, "Consumer region has no explicit source identity.");
  }
  if (
    region.source.range === undefined
    && (region.capabilities.selectable || region.capabilities.copyable)
  ) {
    return unavailable(
      "missing-source-range",
      region,
      "Selectable or copyable consumer region has no explicit source range."
    );
  }
  if (region.rect === undefined) {
    return unavailable("missing-region-rect", region, "Consumer region has no retained rectangle.");
  }
  if (region.coordinateSpace === undefined) {
    return unavailable(
      "missing-coordinate-space",
      region,
      "Consumer region has no explicit coordinate space."
    );
  }

  return {
    kind: "ready",
    descriptor: {
      owner: { root, region: region.ref, source: region.source },
      kind: region.ref.kind,
      capabilities: region.capabilities,
      ...(region.semantics === undefined ? {} : { semantics: region.semantics }),
      rect: region.rect,
      coordinateSpace: region.coordinateSpace,
      exportFallbacks: region.exportFallbacks ?? []
    }
  };
}

/**
 * Creates one unavailable single-region compilation result.
 *
 * @param code - Stable missing-authority gap code.
 * @param region - Exact retained region rejected by compilation.
 * @param message - Human-readable diagnostic explanation.
 * @returns Unavailable descriptor compilation.
 */
function unavailable(
  code: QuireViewConsumerCompilationGapCode,
  region: QuireLayoutRegion,
  message: string
): QuireViewConsumerDescriptorCompilation {
  return {
    kind: "unavailable",
    gap: { code, message, region: region.ref }
  };
}
