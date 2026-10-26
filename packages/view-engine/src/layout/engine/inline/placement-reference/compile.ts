import type { QuireRect } from "@quirekit/renderer";
import { isValidInlineVisualExtent } from "./extent";
import type {
  QuireInlineSourceBlockPlacement,
  QuireInlineSourceBlockReference,
  QuireInlineSourceInlinePlacement,
  QuireInlineSourceInlineReference,
  QuireInlineSourcePlacementDeclaration
} from "@quirekit/layout/inline";
import type {
  QuireInlinePlacementGap,
  QuireInlinePlacementReferenceSet,
  QuireInlinePlacementSource,
  QuireInlineVisualPlacementCompileResult
} from "./types";

/** Axis used while resolving one placement declaration. */
type PlacementAxis = "inline" | "block";

/** Input needed to resolve one axis against an explicit reference rectangle. */
interface ResolveAxisInput {
  /** Logical source anchor being compiled. */
  readonly anchor: QuireInlinePlacementSource;
  /** Stable object identity retained by the placement declaration. */
  readonly objectId: string;
  /** Axis whose origin is being resolved. */
  readonly axis: PlacementAxis;
  /** Exact reference rectangle selected by the declaration. */
  readonly referenceRect: QuireRect;
  /** Requested object size on this axis. */
  readonly extent: number;
  /** Offset placement or logical alignment intent. */
  readonly placement: QuireInlineSourceInlinePlacement | QuireInlineSourceBlockPlacement;
}

/**
 * Compiles one anchored-object declaration against explicit layout references.
 *
 * Both axes resolve before constraint handling. Any missing authority excludes
 * the entire placement so later retained products cannot observe half-valid
 * geometry.
 *
 * @param anchor - Visual occurrence carrying geometry and reference facts.
 * @param declaration - Renderer-neutral source placement declaration.
 * @returns Exact placement or typed gaps without geometric fallback.
 */
export function compileQuireInlineVisualPlacement(
  anchor: QuireInlinePlacementSource,
  declaration: QuireInlineSourcePlacementDeclaration
): QuireInlineVisualPlacementCompileResult {
  const extent = declaration.extent;
  if (!isValidInlineVisualExtent(extent)) {
    return gap(anchor, "invalid-extent", declaration.objectId,
      `Object "${declaration.objectId}" has an invalid extent or inline baseline.`);
  }

  if (declaration.layoutMode === "inline") {
    const inlineAnchor = anchor.placementReferences.anchor;
    return {
      status: "resolved",
      placement: {
        sourceAnchorId: anchor.sourceAnchorId,
        objectId: declaration.objectId,
        occurrence: anchor.occurrence,
        rect: {
          x: inlineAnchor.x,
          y: inlineAnchor.y + inlineAnchor.height - extent.blockSize,
          width: extent.inlineSize,
          height: extent.blockSize
        }
      }
    };
  }

  const inlineReference = readInlineReference(
    anchor.placementReferences,
    declaration.inlinePlacement.reference
  );
  if (inlineReference === undefined) {
    return gap(
      anchor,
      "missing-inline-reference",
      declaration.objectId,
      `Inline reference "${declaration.inlinePlacement.reference}" is unavailable for object "${declaration.objectId}".`,
      declaration.inlinePlacement.reference
    );
  }
  const blockReference = readBlockReference(
    anchor.placementReferences,
    declaration.blockPlacement.reference
  );
  if (blockReference === undefined) {
    return gap(
      anchor,
      "missing-block-reference",
      declaration.objectId,
      `Block reference "${declaration.blockPlacement.reference}" is unavailable for object "${declaration.objectId}".`,
      declaration.blockPlacement.reference
    );
  }
  if (!isValidRect(inlineReference) || !isValidRect(blockReference)) {
    return gap(anchor, "invalid-reference-geometry", declaration.objectId,
      `Object "${declaration.objectId}" references invalid layout geometry.`);
  }

  const inlineOrigin = resolveAxisOrigin({
    anchor,
    objectId: declaration.objectId,
    axis: "inline",
    referenceRect: inlineReference,
    extent: extent.inlineSize,
    placement: declaration.inlinePlacement
  });
  if (typeof inlineOrigin !== "number") {
    return { status: "gap", gaps: [inlineOrigin] };
  }
  const blockOrigin = resolveAxisOrigin({
    anchor,
    objectId: declaration.objectId,
    axis: "block",
    referenceRect: blockReference,
    extent: extent.blockSize,
    placement: declaration.blockPlacement
  });
  if (typeof blockOrigin !== "number") {
    return { status: "gap", gaps: [blockOrigin] };
  }

  const requestedRect = {
    x: inlineOrigin,
    y: blockOrigin,
    width: extent.inlineSize,
    height: extent.blockSize
  };
  const constrained = constrainPlacement(anchor, declaration, requestedRect);
  if ("code" in constrained) {
    return { status: "gap", gaps: [constrained] };
  }

  return {
    status: "resolved",
    placement: {
      sourceAnchorId: anchor.sourceAnchorId,
      objectId: declaration.objectId,
      occurrence: anchor.occurrence,
      rect: constrained
    }
  };
}

/**
 * Resolves one placement axis from offset or alignment intent.
 *
 * @param input - Axis, reference geometry, extent, and placement declaration.
 * @returns Numeric origin, or a typed unsupported-alignment gap.
 */
function resolveAxisOrigin(input: ResolveAxisInput): number | QuireInlinePlacementGap {
  const start = input.axis === "inline"
    ? input.referenceRect.x
    : input.referenceRect.y;
  const size = input.axis === "inline"
    ? input.referenceRect.width
    : input.referenceRect.height;

  if (input.placement.kind === "offset") {
    return start + input.placement.offset;
  }

  const alignment = input.placement.alignment;
  if (alignment === "start") {
    return start;
  }
  if (alignment === "center") {
    return start + (size - input.extent) / 2;
  }
  if (alignment === "end") {
    return start + size - input.extent;
  }

  return {
    code: "unsupported-logical-alignment",
    sourceAnchorId: input.anchor.sourceAnchorId,
    objectId: input.objectId,
    reference: alignment,
    message: `Logical alignment "${alignment}" requires page-side and writing-direction authority.`
  };
}

/**
 * Applies an explicitly requested containing-region constraint.
 *
 * @param anchor - Source occurrence carrying capability and owner geometry.
 * @param declaration - Placement declaration being constrained.
 * @param rect - Unconstrained requested object rectangle.
 * @returns Constrained rectangle or a typed gap.
 */
function constrainPlacement(
  anchor: QuireInlinePlacementSource,
  declaration: QuireInlineSourcePlacementDeclaration,
  rect: QuireRect
): QuireRect | QuireInlinePlacementGap {
  if (!declaration.constrainToRegion) {
    return rect;
  }
  if (
    declaration.constraintOwnerKind !== undefined
    && anchor.ownerRegionKind !== declaration.constraintOwnerKind
  ) {
    return rect;
  }

  const containingRegion = anchor.placementReferences.containingRegion;
  if (!isValidRect(containingRegion)) {
    return createGap(
      anchor,
      "missing-containing-region",
      declaration.objectId,
      `Object "${declaration.objectId}" requires an exact containing-region rectangle.`
    );
  }
  if (
    rect.width > containingRegion.width
    || rect.height > containingRegion.height
  ) {
    return createGap(
      anchor,
      "extent-exceeds-containing-region",
      declaration.objectId,
      `Object "${declaration.objectId}" exceeds its declared containing region.`
    );
  }

  return {
    ...rect,
    x: clamp(rect.x, containingRegion.x, containingRegion.x + containingRegion.width - rect.width),
    y: clamp(rect.y, containingRegion.y, containingRegion.y + containingRegion.height - rect.height)
  };
}

/**
 * Reads an inline-axis reference without substituting another authority.
 *
 * @param references - Explicit reference set carried by the occurrence.
 * @param reference - Requested inline reference name.
 * @returns Exact rectangle, or undefined when unavailable.
 */
function readInlineReference(
  references: QuireInlinePlacementReferenceSet,
  reference: QuireInlineSourceInlineReference
): QuireRect | undefined {
  return reference === "anchor" ? references.anchor : references[reference];
}

/**
 * Reads a block-axis reference without substituting another authority.
 *
 * @param references - Explicit reference set carried by the occurrence.
 * @param reference - Requested block reference name.
 * @returns Exact rectangle, or undefined when unavailable.
 */
function readBlockReference(
  references: QuireInlinePlacementReferenceSet,
  reference: QuireInlineSourceBlockReference
): QuireRect | undefined {
  return references[reference];
}

/**
 * Creates a one-gap compile result.
 *
 * @param anchor - Source occurrence that failed.
 * @param code - Stable failure code.
 * @param objectId - Stable object identity.
 * @param message - Human-readable diagnostic.
 * @param reference - Optional failing reference name.
 * @returns Gap compile result.
 */
function gap(
  anchor: QuireInlinePlacementSource,
  code: QuireInlinePlacementGap["code"],
  objectId: string,
  message: string,
  reference?: string
): QuireInlineVisualPlacementCompileResult {
  return {
    status: "gap",
    gaps: [createGap(anchor, code, objectId, message, reference)]
  };
}

/**
 * Creates one typed placement gap.
 *
 * @param anchor - Source occurrence that failed.
 * @param code - Stable failure code.
 * @param objectId - Stable object identity.
 * @param message - Human-readable diagnostic.
 * @param reference - Optional failing reference name.
 * @returns Typed placement gap.
 */
function createGap(
  anchor: QuireInlinePlacementSource,
  code: QuireInlinePlacementGap["code"],
  objectId: string,
  message: string,
  reference?: string
): QuireInlinePlacementGap {
  return {
    code,
    sourceAnchorId: anchor.sourceAnchorId,
    objectId,
    ...(reference === undefined ? {} : { reference }),
    message
  };
}

/**
 * Checks whether a rectangle is finite and non-negative.
 *
 * @param rect - Candidate layout rectangle.
 * @returns Whether the rectangle can serve as placement authority.
 */
function isValidRect(rect: QuireRect | undefined): rect is QuireRect {
  return rect !== undefined
    && Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width >= 0
    && rect.height >= 0;
}

/**
 * Clamps one number into a closed range.
 *
 * @param value - Candidate number.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @returns Clamped number.
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
