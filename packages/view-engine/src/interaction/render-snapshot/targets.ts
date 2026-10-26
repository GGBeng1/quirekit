import type { QuireDecorationLanes } from "../../decorations";
import type { QuireRetainedLayoutSnapshot } from "../../editor-layout";
import { filterQuireActiveLayerContributions } from "../../editor-layout";
import {
  createQuireDomOverlayHitTargets,
  createQuireViewTargetHitTargets,
  type QuireLayoutDomOverlay
} from "../../layout";
import type { QuireHitTarget } from "../../layout/engine/types";
import type { QuireRetainedLayerContribution } from "../../layout/region-products";
import type { QuireSelectionGeometry } from "../types";
import {
  quireAnnotationInteractionLayer,
  quireInteractionSnapshotPassThroughPolicy,
  quireSelectionInteractionLayer
} from "./layers";
import type {
  CreateQuirePassThroughLayerTargetOptions,
  QuireInteractionSnapshotOwner
} from "./types";
import { createQuireDecorationCursorTargets } from "./decoration-targets";

/**
 * Creates retained selection and caret overlay targets.
 *
 * @param geometry - Selection geometry for the current render pass.
 * @param owner - Fallback retained owner facts inherited from the snapshot.
 * @returns Pass-through targets for selection overlay diagnostics.
 */
export function createQuireSelectionLayerTargets(
  geometry: QuireSelectionGeometry,
  owner: QuireInteractionSnapshotOwner
): readonly QuireHitTarget[] {
  return [
    ...geometry.ranges.map((range, index) => createPassThroughLayerTarget({
      id: `selection:range:${index}`,
      range: range.range,
      rect: range.rect,
      layer: quireSelectionInteractionLayer,
      owner,
      ...(range.queryOwner === undefined
        ? {}
        : { queryOwner: range.queryOwner })
    })),
    ...geometry.carets.map((caret, index) => createPassThroughLayerTarget({
      id: `selection:caret:${index}`,
      range: {
        from: caret.position.pos,
        to: caret.position.pos
      },
      rect: caret.rect,
      layer: quireSelectionInteractionLayer,
      owner,
      ...(caret.queryOwner === undefined
        ? {}
        : { queryOwner: caret.queryOwner })
    }))
  ];
}

/**
 * Creates pass-through annotation targets for decoration visuals.
 *
 * @param decorationLane - Decoration visuals from the current render pass.
 * @param owner - Fallback retained owner facts inherited from the snapshot.
 * @returns Annotation targets used for retained hit diagnostics.
 */
export function createQuireDecorationLayerTargets(
  decorationLane: QuireDecorationLanes,
  owner: QuireInteractionSnapshotOwner
): readonly QuireHitTarget[] {
  return [
    ...decorationLane.backgrounds.map((background) =>
      createPassThroughLayerTarget({
        id: `annotation:background:${background.id}`,
        range: background.range,
        rect: background.rect,
        layer: quireAnnotationInteractionLayer,
        owner
      })
    ),
    ...decorationLane.nodes.map((node) =>
      createPassThroughLayerTarget({
        id: `annotation:node:${node.id}`,
        range: node.range,
        rect: node.rect,
        layer: quireAnnotationInteractionLayer,
        owner
      })
    ),
    ...(decorationLane.pointMarkers ?? []).map((marker) =>
      createPassThroughLayerTarget({
        id: `annotation:point-marker:${marker.id}`,
        range: marker.range,
        rect: marker.rect,
        layer: quireAnnotationInteractionLayer,
        owner
      })
    ),
    ...(decorationLane.gutterMarkers ?? []).map((marker) =>
      createPassThroughLayerTarget({
        id: `annotation:gutter-marker:${marker.id}`,
        range: marker.range,
        rect: marker.rect,
        layer: quireAnnotationInteractionLayer,
        owner
      })
    )
  ];
}

/**
 * Creates retained targets for action-bearing decorations and widgets.
 *
 * @param decorationLane - Decoration lane whose actions and widgets expose qkView targets.
 * @param owner - Fallback retained owner facts inherited from the snapshot.
 * @returns Retained action and widget targets used by pointer hit testing.
 */
export function createQuireDecorationWidgetLayerTargets(
  decorationLane: QuireDecorationLanes,
  owner: QuireInteractionSnapshotOwner
): readonly QuireHitTarget[] {
  const actionTargets = createQuireDecorationCursorTargets(decorationLane)
    .filter((target) => Object.keys(target.events).length > 0);
  return createQuireViewTargetHitTargets({
    idPrefix: "decoration-widget",
    targets: [
      ...actionTargets,
      ...decorationLane.widgets.map((widget) => widget.target)
    ],
    ...(owner.viewRegion === undefined ? {} : { viewRegion: owner.viewRegion }),
    ...(owner.source === undefined ? {} : { source: owner.source }),
    ...(owner.capabilities === undefined ? {} : { capabilities: owner.capabilities })
  });
}

/**
 * Creates hit targets for runtime-activated retained layer contributions.
 *
 * Persistent contribution targets already live in the layout snapshot. This
 * projection adds only conditional products so selection-only updates can
 * activate or remove them without rebuilding layout.
 *
 * @param snapshot - Current layout snapshot carrying stable provider products.
 * @returns Active conditional contribution targets with exact retained owners.
 */
export function createQuireActivatedLayerContributionTargets(
  snapshot: QuireRetainedLayoutSnapshot
): readonly QuireHitTarget[] {
  const contributions = filterQuireActiveLayerContributions(
    snapshot.layerContributions ?? [],
    snapshot.state
  ).filter((contribution) => contribution.activation !== undefined);
  if (contributions.length === 0) {
    return [];
  }
  const selection = snapshot.state.pm.selection;

  return contributions.flatMap((contribution) => createContributionTargets(
    contribution,
    isRelatedSelectionActive(contribution, selection.from, selection.to)
  ));
}

/**
 * Converts one active contribution's neutral targets into retained hit targets.
 *
 * @param contribution - Active contribution with complete owner identity.
 * @param relatedSelectionActive - Whether the contribution's nested story owns selection.
 * @returns Hit targets carrying exact region, source, and capability facts.
 */
function createContributionTargets(
  contribution: QuireRetainedLayerContribution,
  relatedSelectionActive: boolean
): readonly QuireHitTarget[] {
  return createQuireViewTargetHitTargets({
    idPrefix: `layer-contribution:${contribution.contributionId}`,
    targets: contribution.targets.filter((target) =>
      !relatedSelectionActive || target.part !== "text-entry"
    ),
    fallbackRange: contribution.range,
    ...(contribution.interactionScope === undefined
      ? {}
      : { interactionScope: contribution.interactionScope }),
    viewRegion: contribution.owner.region,
    source: contribution.owner.source,
    capabilities: contribution.owner.capabilities
  });
}

/**
 * Reports whether selection is inside a contribution's explicit nested range.
 *
 * The full controls contribution stays active to paint the selected frame and
 * handles. Only its transition-only text-entry target is suppressed so the
 * editable drawing story beneath it can receive caret hits.
 *
 * @param contribution - Active selected-owner controls contribution.
 * @param selectionFrom - Current selection start.
 * @param selectionTo - Current selection end.
 * @returns Whether the related nested story currently owns selection.
 */
function isRelatedSelectionActive(
  contribution: QuireRetainedLayerContribution,
  selectionFrom: number,
  selectionTo: number
): boolean {
  const relatedRange = contribution.activation?.relatedRange;
  return relatedRange !== undefined
    && selectionFrom >= relatedRange.from
    && selectionTo <= relatedRange.to;
}

/**
 * Creates retained DOM-proxy targets for render-time DOM overlays.
 *
 * @param domOverlays - DOM overlays created after the layout snapshot was built.
 * @param owner - Fallback retained owner facts inherited from the snapshot.
 * @returns DOM-proxy targets used by retained pointer policy dispatch.
 */
export function createQuireRenderDomOverlayLayerTargets(
  domOverlays: readonly QuireLayoutDomOverlay[],
  owner: QuireInteractionSnapshotOwner
): readonly QuireHitTarget[] {
  return createQuireDomOverlayHitTargets({
    idPrefix: "render-dom-overlay",
    overlays: domOverlays,
    ...(owner.viewRegion === undefined ? {} : { viewRegion: owner.viewRegion }),
    ...(owner.source === undefined ? {} : { source: owner.source }),
    ...(owner.capabilities === undefined ? {} : { capabilities: owner.capabilities })
  });
}

/**
 * Creates one pass-through retained layer target.
 *
 * @param options - Target identity, geometry, layer, and retained owner facts.
 * @returns Retained pass-through hit target.
 */
function createPassThroughLayerTarget(
  options: CreateQuirePassThroughLayerTargetOptions
): QuireHitTarget {
  return {
    id: options.id,
    range: options.range,
    rect: options.rect,
    ...(options.owner.viewRegion === undefined
      ? {}
      : { viewRegion: options.owner.viewRegion }),
    ...(options.queryOwner === undefined ? {} : { queryOwner: options.queryOwner }),
    layer: options.layer,
    pointerPolicy: quireInteractionSnapshotPassThroughPolicy
  };
}
