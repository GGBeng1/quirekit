import type {
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductGap
} from "./types";
import type { QuireRetainedRegionCompilationContext } from "./shared";
import {
  validateQuireRetainedRegionTextFact
} from "./shared";
import { validateQuireRetainedRegionSemantics } from "./semantics";

/**
 * Compiles the retained root declaration.
 *
 * @param declaration - Producer declaration being compiled.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Retained root, or undefined when required facts are missing.
 */
export function compileQuireRetainedRegionRoot(
  declaration: QuireRetainedRegionProductDeclaration,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): QuireLayoutRoot | undefined {
  const root = declaration.root;

  if (root === undefined) {
    gaps.push({
      code: "missing-root",
      message: "Retained-region producer must declare a retained root.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
    return undefined;
  }

  const rootId = validateQuireRetainedRegionTextFact(
    root.rootId,
    "missing-root-id",
    "Retained-region retained root must declare a stable root id.",
    context,
    gaps
  );

  if (root.kind === undefined) {
    gaps.push({
      code: "missing-root-kind",
      message: "Retained-region retained root must declare a root kind.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
  }

  if (root.capabilities === undefined) {
    gaps.push({
      code: "missing-root-capabilities",
      message: "Retained-region retained root must declare capabilities.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
  }

  const source = root.source;

  if (source === undefined || source.sourceId.length === 0) {
    gaps.push({
      code: "missing-source",
      message: "Retained-region retained root must declare source identity.",
      producerId: context.producerId,
      sourceKind: context.sourceKind
    });
  }
  const semanticsValid = validateQuireRetainedRegionSemantics({
    semantics: root.semantics,
    source,
    context,
    gaps
  });

  if (
    rootId === undefined
    || root.kind === undefined
    || root.capabilities === undefined
    || source === undefined
    || source.sourceId.length === 0
    || !semanticsValid
  ) {
    return undefined;
  }

  return {
    id: { value: rootId },
    kind: root.kind,
    source,
    capabilities: root.capabilities,
    ...(root.semantics === undefined ? {} : { semantics: root.semantics }),
    ...(root.exportFallbacks === undefined ? {} : { exportFallbacks: root.exportFallbacks }),
    ...(root.diagnosticsMetadata === undefined ? {} : { diagnosticsMetadata: root.diagnosticsMetadata })
  };
}
