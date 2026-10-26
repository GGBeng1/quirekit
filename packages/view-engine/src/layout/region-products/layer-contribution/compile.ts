import type {
  QuireLayoutRegion,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireRetainedRegionProductGap } from "../declaration/types";
import {
  pushQuireLayerContributionDeclarationGap,
  readQuireLayerContributionText
} from "./declaration-gap";
import type {
  QuireLayerContributionCompilationContext,
  QuireRetainedLayerContribution,
  QuireRetainedLayerContributionDeclaration,
  QuireRetainedLayerContributionHeader
} from "./types";
import { resolveQuireLayerContributionOwner } from "./owner";
import {
  isQuireLayerContributionBodyPending,
  readQuireLayerContributionBody,
  readQuireLayerContributionHeader
} from "./deferred";
import { compileQuireDeferredLayerContribution } from "./deferred-compile";
import {
  createQuireLayerContributionValidationState,
  validateQuireRetainedLayerContribution
} from "./validation";

/**
 * Compiles layer declarations against exact retained region ownership.
 *
 * @param declarations - Layer declarations emitted during versioned layout.
 * @param root - Retained root compiled for the same producer.
 * @param regions - Exact retained region occurrences under the canonical root.
 * @param context - Producer identity attached to diagnostics.
 * @param gaps - Mutable canonical gap sink.
 * @returns Canonical contributions whose complete owner and artifacts are present.
 */
export function compileQuireRetainedLayerContributions(
  declarations: readonly QuireRetainedLayerContributionDeclaration[],
  root: QuireLayoutRoot | undefined,
  regions: readonly QuireLayoutRegion[],
  context: QuireLayerContributionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): readonly QuireRetainedLayerContribution[] {
  const contributions: QuireRetainedLayerContribution[] = [];
  const initialGapCount = gaps.length;
  const validationState = createQuireLayerContributionValidationState();

  // Resolve exact retained ownership before accepting any renderer artifacts.
  for (const declaration of declarations) {
    const contributionId = readQuireLayerContributionText(declaration.contributionId);
    if (contributionId === undefined) {
      pushQuireLayerContributionDeclarationGap(
        "missing-layer-contribution-id",
        "Layer contribution must declare a stable id.",
        declaration,
        context,
        gaps
      );
      continue;
    }

    const resolvedOwner = resolveQuireLayerContributionOwner(
      declaration,
      root,
      regions,
      context,
      gaps
    );
    if (resolvedOwner === undefined) {
      continue;
    }
    const { region } = resolvedOwner;
    const ownerSource = region.source;
    if (ownerSource === undefined) {
      continue;
    }

    // A deferred declaration's artifacts are validated when first read, so only its header is
    // read here; reading the artifacts would realize them.
    const deferred = isQuireLayerContributionBodyPending(declaration);
    const {
      range,
      rect,
      visualBounds,
      interactionScope,
      coordinateSpace,
      layer,
      paintSurface,
      activation
    } = readQuireLayerContributionHeader(declaration);
    if (
      range === undefined
      || rect === undefined
      || coordinateSpace === undefined
      || layer === undefined
      || paintSurface === undefined
      || (!deferred && (
        declaration.commands === undefined
        || declaration.domOverlays === undefined
        || declaration.targets === undefined
      ))
    ) {
      pushQuireLayerContributionDeclarationGap(
        "missing-layer-contribution-artifacts",
        "Layer contribution must declare complete geometry, layer, commands, overlays, and targets.",
        declaration,
        context,
        gaps
      );
      continue;
    }
    if (coordinateSpace !== "document") {
      pushQuireLayerContributionDeclarationGap(
        "unsupported-layer-contribution-coordinate-space",
        "Layer contributions must be compiled in document coordinates.",
        declaration,
        context,
        gaps
      );
      continue;
    }
    if (activation !== undefined && paintSurface !== "overlay") {
      pushQuireLayerContributionDeclarationGap(
        "unsupported-layer-contribution-activation",
        "Runtime-activated layer contributions must use the overlay paint surface.",
        declaration,
        context,
        gaps
      );
      continue;
    }

    const header: QuireRetainedLayerContributionHeader = {
      contributionId,
      owner: {
        root: resolvedOwner.root,
        region: region.ref,
        source: ownerSource,
        capabilities: region.capabilities
      },
      ...(interactionScope === undefined ? {} : { interactionScope }),
      range,
      rect,
      ...(visualBounds === undefined ? {} : { visualBounds }),
      coordinateSpace,
      layer,
      paintSurface,
      ...(activation === undefined ? {} : { activation })
    };
    const ownerRect = region.coordinateSpace === "document" ? region.rect : undefined;
    if (deferred) {
      const compiled = compileQuireDeferredLayerContribution(
        header, declaration, validationState, ownerRect, context, gaps);
      if (compiled !== undefined) contributions.push(compiled);
      continue;
    }
    const contribution: QuireRetainedLayerContribution = {
      ...header,
      ...readQuireLayerContributionBody(declaration)
    };
    if (validateQuireRetainedLayerContribution(
      contribution,
      validationState,
      ownerRect,
      context,
      gaps
    )) {
      contributions.push(contribution);
    }
  }

  return gaps.length === initialGapCount ? contributions : [];
}
