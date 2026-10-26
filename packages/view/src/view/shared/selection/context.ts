import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireSelectionGeometry,
  QuireSelectionGeometryContext,
  QuireSelectionGeometryVisualContext
} from "@quirekit/view-engine";
import {
  createQuireSelectionGeometryContextFromInteractionTarget,
  createQuireSelectionGeometryContextFromInteractionTargets,
  resolveQuireHitTestSelectionTarget
} from "@quirekit/view-engine";
import type { Selection as ProseMirrorSelection } from "@quirekit/pm";
import type { QuireRect } from "@quirekit/renderer";

/** Retained targets and geometry context for one mounted range selection. */
export interface MountedSelectionRangeEndpointTargets {
  /** Retained target under the range anchor. */
  readonly anchorTarget: QuireInteractionSelectionTarget | null;
  /** Retained target under the moving range head. */
  readonly headTarget: QuireInteractionSelectionTarget | null;
  /** Selection geometry context built from both retained endpoints. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** Inputs used to recover the visual endpoint for a Shift-click anchor. */
export interface MountedSelectionAnchorVisualContextOptions {
  /** Current ProseMirror selection before the Shift-click is applied. */
  readonly selection: ProseMirrorSelection;
  /** Retained context used by the previous selection render, when available. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
  /** Retained selection geometry produced by the previous render. */
  readonly selectionGeometry: QuireSelectionGeometry;
}

/** Inputs used to resolve a drag anchor from the previous selection state. */
export interface MountedSelectionAnchorHitTestResultOptions {
  /** Current ProseMirror selection before the drag range is applied. */
  readonly selection: ProseMirrorSelection;
  /** Visual context recovered for the current selection anchor. */
  readonly visualContext?: QuireSelectionGeometryVisualContext | undefined;
  /** Fallback rectangle to use when the previous anchor had no retained rect. */
  readonly fallbackRect: QuireRect;
}

/**
 * Converts an active interaction target into selection geometry context.
 *
 * @param target - Active retained interaction target, when one exists.
 * @returns Selection geometry context, or undefined without retained facts.
 */
export function createMountedSelectionGeometryContext(
  target: QuireInteractionSelectionTarget | null
): QuireSelectionGeometryContext | undefined {
  return createQuireSelectionGeometryContextFromInteractionTarget(target);
}

/**
 * Converts range endpoints into a selection geometry context.
 *
 * @param anchorTarget - Retained target that produced the range anchor.
 * @param headTarget - Retained target that produced the moving range head.
 * @returns Range geometry context, or undefined when both endpoints lack retained facts.
 */
export function createMountedSelectionRangeGeometryContext(
  anchorTarget: QuireInteractionSelectionTarget | null,
  headTarget: QuireInteractionSelectionTarget | null
): QuireSelectionGeometryContext | undefined {
  return createQuireSelectionGeometryContextFromInteractionTargets(
    anchorTarget,
    headTarget
  );
}

/**
 * Converts retained visual endpoint contexts into a range selection context.
 *
 * @param anchorContext - Visual endpoint that owns the range anchor.
 * @param headContext - Visual endpoint that owns the range head.
 * @returns Range geometry context, or undefined when both endpoints lack context.
 */
export function createMountedSelectionRangeGeometryContextFromVisualContexts(
  anchorContext: QuireSelectionGeometryVisualContext | undefined,
  headContext: QuireSelectionGeometryVisualContext | undefined
): QuireSelectionGeometryContext | undefined {
  const visualContexts = [
    ...(anchorContext === undefined ? [] : [anchorContext]),
    ...(headContext === undefined ? [] : [headContext])
  ];
  const activeContext = headContext ?? anchorContext;

  if (activeContext === undefined) {
    return undefined;
  }

  return {
    ...activeContext,
    ...(visualContexts.length === 0 ? {} : { visualContexts })
  };
}

/**
 * Recovers the visual context for the current selection anchor.
 *
 * Shift-click extends from the existing ProseMirror anchor, but a bare document
 * position is not enough for repeated visual instances such as continued table
 * cells. The previous render result is the authority for which visual instance
 * currently owns that anchor.
 *
 * @param options - Previous selection render facts and current PM selection.
 * @returns Visual context for the anchor, or undefined without retained facts.
 */
export function resolveMountedSelectionAnchorVisualContext(
  options: MountedSelectionAnchorVisualContextOptions
): QuireSelectionGeometryVisualContext | undefined {
  const previousEndpoint = options.selectionContext?.visualContexts?.[0] ??
    options.selectionContext;

  if (previousEndpoint !== undefined) {
    return previousEndpoint;
  }

  const anchor = options.selection.anchor;
  const caret = options.selectionGeometry.carets.find(
    (candidate) => candidate.position.pos === anchor
  );

  if (caret !== undefined) {
    return createMountedSelectionGeometryVisualContext({
      rect: caret.rect,
      ...(caret.queryOwner === undefined ? {} : { queryOwner: caret.queryOwner })
    });
  }

  const candidateRanges = options.selectionGeometry.ranges.filter((range) =>
    range.range.from <= anchor && range.range.to >= anchor
  );
  const range = anchor === options.selection.to
    ? candidateRanges.at(-1)
    : candidateRanges[0];

  return range === undefined
    ? undefined
    : createMountedSelectionGeometryVisualContext({
        rect: range.rect,
        ...(range.queryOwner === undefined ? {} : { queryOwner: range.queryOwner })
      });
}

/**
 * Builds a position hit that represents the current selection anchor.
 *
 * Shift-drag gestures extend from the existing editor selection anchor, not from
 * the pointerdown location. Representing that anchor as a normal hit keeps drag
 * selection on the same shared range-selection path as ordinary drags while
 * preserving repeated visual-instance identity when retained context exists.
 *
 * @param options - Previous selection anchor and retained visual context.
 * @returns Hit-test result for the selection anchor.
 */
export function createMountedSelectionAnchorHitTestResult(
  options: MountedSelectionAnchorHitTestResultOptions
): QuireHitTestResult {
  const viewRegion = options.visualContext?.viewRegion ??
    options.visualContext?.queryOwner?.region;

  return {
    kind: "position",
    position: { pos: options.selection.anchor, bias: 0 },
    inside: options.selection.anchor,
    rect: options.visualContext?.referenceRect ?? options.fallbackRect,
    ...(viewRegion === undefined ? {} : { viewRegion }),
    ...(options.visualContext?.queryOwner === undefined
      ? {}
      : { queryOwner: options.visualContext.queryOwner }),
    ...(options.visualContext?.ownerSource === undefined
      ? {}
      : { ownerSource: options.visualContext.ownerSource }),
    ...(options.visualContext?.ownerCapabilities === undefined
      ? {}
      : { ownerCapabilities: options.visualContext.ownerCapabilities })
  };
}

/**
 * Resolves retained targets and range geometry context from drag endpoint hits.
 *
 * @param options - Anchor and head hit-test results produced by one drag update.
 * @returns Endpoint targets and the shared geometry context for selection filtering.
 */
export function resolveMountedSelectionRangeEndpointTargets(options: {
  /** Hit-test result produced from the drag anchor point. */
  readonly anchorHitTestResult: QuireHitTestResult;
  /** Hit-test result produced from the moving drag head point. */
  readonly headHitTestResult: QuireHitTestResult;
}): MountedSelectionRangeEndpointTargets {
  const anchorTarget = resolveQuireHitTestSelectionTarget({
    hitTestResult: options.anchorHitTestResult
  });
  const headTarget = resolveQuireHitTestSelectionTarget({
    hitTestResult: options.headHitTestResult
  });

  return {
    anchorTarget,
    headTarget,
    selectionContext: createMountedSelectionRangeGeometryContext(
      anchorTarget,
      headTarget
    )
  };
}

/**
 * Creates a visual context from retained geometry.
 *
 * @param options - Geometry rectangle and optional query owner.
 * @returns Visual context retaining query-owner and region identity when present.
 */
function createMountedSelectionGeometryVisualContext(options: {
  /** Geometry rectangle that represented the endpoint. */
  readonly rect: QuireRect;
  /** Query owner that produced the endpoint, when known. */
  readonly queryOwner?: QuireSelectionGeometryVisualContext["queryOwner"];
}): QuireSelectionGeometryVisualContext {
  return {
    referenceRect: options.rect,
    ...(options.queryOwner === undefined
      ? {}
      : {
          queryOwner: options.queryOwner,
          ...(options.queryOwner.region === undefined
            ? {}
            : { viewRegion: options.queryOwner.region })
        })
  };
}
