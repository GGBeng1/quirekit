import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireLayoutSnapshot,
  QuirePageModelProfile
} from "@quirekit/view-engine";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import {
  resolveQuireCommandRoutingScope,
  resolveQuireHitTestSelectionTarget
} from "@quirekit/view-engine";
import type { Node as ProseMirrorNode, Selection } from "@quirekit/pm";
import type { QuireRect } from "@quirekit/renderer";
import { resolveQuireSelectionScopeBoundary } from "../../../../input/selection-scope";
import { resolveMountedBodyPageEdgeHit } from "./body-page";

/**
 * Checks whether a retained target represents an editable header/footer story.
 *
 * @param target - Interaction target produced by pointer hit testing.
 * @returns Whether explicit auxiliary-story editing owns the target.
 */
export function isMountedHeaderFooterSelectionTarget(
  target: QuireInteractionSelectionTarget | null
): boolean {
  return resolveMountedHeaderFooterSelectionOwner(target) !== null;
}

/**
 * Validates that a header/footer hit position belongs to its persisted story.
 *
 * Body targets have no auxiliary-story constraint and pass through unchanged.
 * Story targets fail closed when geometry omits a position or pairs the retained
 * owner with a position outside its live source range.
 *
 * @param target - Retained interaction target produced for the pointer point.
 * @param hitTestResult - Canonical geometry hit carrying the PM document position.
 * @returns Whether the hit may activate selection and browser input ownership.
 */
export function isMountedPointerHitOwnedBySelectionTarget(
  target: QuireInteractionSelectionTarget | null,
  hitTestResult: QuireHitTestResult
): boolean {
  if (target === null || !isMountedHeaderFooterSelectionTarget(target)) {
    return true;
  }

  const range = resolveMountedHeaderFooterSelectionOwner(target)?.source.range;
  if (hitTestResult.kind === "miss" || range === undefined) {
    return false;
  }

  return hitTestResult.position.pos >= range.from
    && hitTestResult.position.pos <= range.to;
}

/**
 * Normalizes one selectable pointer-down hit to its live source boundary.
 *
 * Editable blank-space fallbacks may inherit the full retained document range
 * while still reporting the canonical body owner. The fixed drag anchor must
 * use the live body/story boundary before selection dispatch, otherwise a
 * subsequent small move can create a cross-story range.
 *
 * @param options - Live document, current selection, and pointer-down hit.
 * @returns Original hit when already valid, otherwise a boundary-clamped hit.
 */
export function constrainMountedSelectionScopePointerHit(options: {
  /** Current ProseMirror document used to resolve live selectable boundaries. */
  readonly doc: ProseMirrorNode;
  /** Current selection used to resolve the active source route. */
  readonly selection: Selection;
  /** Pointer hit that may become both the point selection and drag anchor. */
  readonly hitTestResult: QuireHitTestResult;
  /** Page model separating body flow from auxiliary story storage. */
  readonly pageModel: Pick<QuirePageModelProfile, "isBodyFlowBlock">;
}): QuireHitTestResult {
  const target = resolveQuireHitTestSelectionTarget({
    hitTestResult: options.hitTestResult
  });

  if (
    options.hitTestResult.kind === "miss"
    || target === null
    || (
      !isMountedHeaderFooterSelectionTarget(target)
      && !isMountedCanonicalBodySelectionTarget(target)
    )
  ) {
    return options.hitTestResult;
  }

  const boundary = resolveMountedPointerSelectionScopeBoundary(target, options.selection, options.doc, options.pageModel);
  if (boundary === null) {
    return options.hitTestResult;
  }

  const originalPosition = options.hitTestResult.position.pos;
  const position = Math.min(
    boundary.selectionTo,
    Math.max(boundary.selectionFrom, originalPosition)
  );
  if (position === originalPosition) {
    return options.hitTestResult;
  }

  const bias = originalPosition < boundary.selectionFrom ? -1 : 1;
  return {
    ...options.hitTestResult,
    position: { pos: position, bias },
    inside: position
  };
}

/**
 * Constrains one moving drag endpoint to the source domain owning its anchor.
 *
 * Same-source body pages or repeated story occurrences pass through unchanged.
 * Every cross-source hit remains useful pointer diagnostics but projects to the
 * visual start or end of the fixed anchor's selectable source boundary.
 *
 * @param options - Live document, selection, and drag endpoint hits.
 * @returns Accepted moving endpoint for shared range-selection semantics.
 */
export function constrainMountedSelectionScopeDragHeadHit(options: {
  /** Current ProseMirror document used to resolve live selectable boundaries. */
  readonly doc: ProseMirrorNode;
  /** Current selection whose head remains inside the active source domain. */
  readonly selection: Selection;
  /** Retained interaction geometry owning page-local body boundaries. */
  readonly geometrySnapshot?: QuireLayoutSnapshot | undefined;
  /** Fixed drag anchor hit retained from pointer down. */
  readonly anchorHitTestResult: QuireHitTestResult;
  /** Latest geometrically resolved moving endpoint hit. */
  readonly headHitTestResult: QuireHitTestResult;
  /** Page model separating body flow from auxiliary story storage. */
  readonly pageModel: Pick<QuirePageModelProfile, "isBodyFlowBlock">;
}): QuireHitTestResult {
  const anchorTarget = resolveQuireHitTestSelectionTarget({
    hitTestResult: options.anchorHitTestResult
  });

  if (options.anchorHitTestResult.kind === "miss" || anchorTarget === null) {
    return options.headHitTestResult;
  }

  if (
    !isMountedHeaderFooterSelectionTarget(anchorTarget)
    && anchorTarget.region === undefined
  ) {
    return options.headHitTestResult;
  }

  const boundary = resolveMountedPointerSelectionScopeBoundary(anchorTarget, options.selection, options.doc, options.pageModel);

  // Incomplete live source facts must fail closed. Retaining the anchor is safer
  // than allowing a body hit to manufacture a cross-story PM selection.
  if (boundary === null || options.headHitTestResult.kind === "miss") {
    return options.anchorHitTestResult;
  }

  const pageLocalHeadHitTestResult = boundary.regionKind === "body"
    && options.geometrySnapshot !== undefined
    ? resolveMountedBodyPageEdgeHit({
        snapshot: options.geometrySnapshot,
        hitTestResult: options.headHitTestResult,
        sourceId: boundary.sourceId
      }) ?? options.headHitTestResult
    : options.headHitTestResult;
  const headTarget = resolveQuireHitTestSelectionTarget({
    hitTestResult: pageLocalHeadHitTestResult
  });
  if (isMountedPointerHeadInsideSelectionScope(
    headTarget,
    pageLocalHeadHitTestResult,
    boundary
  )) {
    return pageLocalHeadHitTestResult;
  }

  const moveAfterAnchor = isDragHeadVisuallyAfterAnchor(
    options.anchorHitTestResult.rect,
    pageLocalHeadHitTestResult.rect
  );
  const position = moveAfterAnchor
    ? boundary.selectionTo
    : boundary.selectionFrom;

  return {
    ...options.anchorHitTestResult,
    position: { pos: position, bias: moveAfterAnchor ? 1 : -1 },
    inside: position
  };
}

/**
 * Checks whether a moving pointer endpoint belongs to the anchor's live scope.
 *
 * Nested providers such as Table cells retain their own region and source ids,
 * but positions inside the live main-body range still normalize to
 * `body/doc:body`. Table-owned border geometry may retain only a position and
 * structural cell sidecar; a provenance-free position inside the live body
 * range is therefore also accepted. Auxiliary stories keep exact source
 * identity because two distinct stories can share the same region kind.
 *
 * @param target - Retained target resolved for the moving endpoint.
 * @param hitTestResult - Moving position hit produced by retained geometry.
 * @param boundary - Live body or story boundary owning the fixed anchor.
 * @returns Whether the original moving hit can enter range semantics.
 */
function isMountedPointerHeadInsideSelectionScope(
  target: QuireInteractionSelectionTarget | null,
  hitTestResult: QuireHitTestResult,
  boundary: MountedPointerSelectionScopeBoundary
): boolean {
  if (
    hitTestResult.kind === "miss"
    || hitTestResult.position.pos < boundary.selectionFrom
    || hitTestResult.position.pos > boundary.selectionTo
  ) {
    return false;
  }

  if (boundary.regionKind === "body") {
    return !isMountedHeaderFooterSelectionTarget(target)
      && target?.region?.kind !== "drawing-text"
      && target?.region?.kind !== "footnote"
      && target?.region?.kind !== "endnote";
  }

  const headerFooterOwner = resolveMountedHeaderFooterSelectionOwner(target);
  const ownerRegion = headerFooterOwner?.region ?? target?.region;
  const ownerSource = headerFooterOwner?.source ?? target?.source;

  return ownerRegion?.kind === boundary.regionKind
    && ownerSource?.sourceId === boundary.sourceId;
}

/** Selectable source boundary used to constrain one mounted pointer drag. */
interface MountedPointerSelectionScopeBoundary {
  /** Stable source identity owning the pointer anchor. */
  readonly sourceId: string;
  /** Retained region kind owning the pointer anchor. */
  readonly regionKind: NonNullable<
    QuireInteractionSelectionTarget["region"]
  >["kind"];
  /** First selectable document position inside the source. */
  readonly selectionFrom: number;
  /** Last selectable document position inside the source. */
  readonly selectionTo: number;
}

/**
 * Resolves the body or auxiliary-story source that owns a drag anchor.
 *
 * @param target - Retained target that produced the fixed anchor.
 * @param selection - Current ProseMirror selection used for live story refresh.
 * @param doc - Current ProseMirror document.
 * @param pageModel - Page model separating body flow from auxiliary story storage.
 * @returns Selectable source boundary, or null for unsupported/incomplete owners.
 */
function resolveMountedPointerSelectionScopeBoundary(
  target: QuireInteractionSelectionTarget,
  selection: Selection,
  doc: ProseMirrorNode,
  pageModel: Pick<QuirePageModelProfile, "isBodyFlowBlock">
): MountedPointerSelectionScopeBoundary | null {
  const commandScope = resolveQuireCommandRoutingScope({
    selection,
    interactionTarget: target
  });
  const headerFooterOwner = target.region?.kind === "drawing-text"
    ? null
    : resolveMountedHeaderFooterSelectionOwner(target);
  const activeRegion = headerFooterOwner?.region ?? target.region;
  const activeSource = headerFooterOwner?.source ?? target.source;
  const activeCapabilities =
    headerFooterOwner?.capabilities ?? target.capabilities;

  // Drag ownership is fixed by pointer-down geometry. A structured selection
  // deliberately routes document commands without an active retained target,
  // but that command-domain decision must not erase the anchor source boundary
  // while later pointer moves are still extending the same gesture.
  return resolveQuireSelectionScopeBoundary(
    {
      ...commandScope,
      ...(activeRegion === undefined
        ? {}
        : {
          activeRoot: activeRegion.rootId,
          activeRegion
        }),
      ...(activeSource === undefined
        ? {}
        : { activeSource }),
      ...(activeCapabilities === undefined
        ? {}
        : { activeCapabilities }),
      ...(target.queryOwner === undefined
        ? {}
        : { activeQueryOwner: target.queryOwner }),
      interactionTarget: target
    },
    doc,
    pageModel
  );
}

/**
 * Resolves the header/footer owner that encloses one exact selection target.
 *
 * Direct story hits remain authoritative. Retained descendants use their
 * orthogonal interaction scope so object, control, and nested-text identities
 * are not rewritten into header/footer targets.
 *
 * @param target - Exact retained target produced by pointer geometry.
 * @returns Complete enclosing story owner, or null outside header/footer scope.
 */
function resolveMountedHeaderFooterSelectionOwner(
  target: QuireInteractionSelectionTarget | null
): QuireLayoutOwnerFacts | null {
  const regionKind = target?.region?.kind;
  if (
    (regionKind === "header" || regionKind === "footer")
    && target?.region !== undefined
    && target.source !== undefined
    && target.capabilities !== undefined
  ) {
    return {
      region: target.region,
      source: target.source,
      capabilities: target.capabilities
    };
  }

  const interactionScope = target?.interactionScope;
  return interactionScope?.region.kind === "header"
    || interactionScope?.region.kind === "footer"
    ? interactionScope
    : null;
}

/**
 * Checks whether a target belongs to the canonical top-level document body.
 *
 * Nested provider flows may also use a `body` region kind. Their source ranges
 * are not the top-level body scope and must keep their own range semantics.
 *
 * @param target - Retained interaction target to classify.
 * @returns Whether the target owns the canonical body root and source.
 */
function isMountedCanonicalBodySelectionTarget(
  target: QuireInteractionSelectionTarget
): boolean {
  return target.region?.kind === "body"
    && target.region.rootId.value === "root:body"
    && target.source?.sourceId === "doc:body";
}

/**
 * Resolves drag direction from document-space endpoint geometry.
 *
 * Auxiliary stories commonly follow the body in persisted document order, so
 * position numbers cannot tell whether a pointer moved visually toward the
 * story start or end. Vertical ordering wins; horizontal ordering breaks ties
 * on the same line.
 *
 * @param anchorRect - Document-space rectangle under the fixed anchor.
 * @param headRect - Document-space rectangle under the moving endpoint.
 * @returns Whether the moving endpoint lies visually after the anchor.
 */
function isDragHeadVisuallyAfterAnchor(
  anchorRect: QuireRect,
  headRect: QuireRect
): boolean {
  const anchorCenterY = anchorRect.y + anchorRect.height / 2;
  const headCenterY = headRect.y + headRect.height / 2;

  if (headCenterY !== anchorCenterY) {
    return headCenterY > anchorCenterY;
  }

  return headRect.x + headRect.width / 2 >= anchorRect.x + anchorRect.width / 2;
}
