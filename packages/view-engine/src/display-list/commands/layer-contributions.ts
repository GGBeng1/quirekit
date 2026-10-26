import {
  doesQuireRectIntersectAny,
  type QuireDisplayCommand,
  type QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type {
  QuireDisplayCommandPaintSurface,
  QuireDisplayListOwnerCommandCollector,
  QuireSurfaceConfig
} from "../types";
import { isQuireRetainedLayerContributionActive } from "../../editor-layout/layer-contribution/activation";
import { resolveQuireLayerContributionProductId } from "../../layout/region-products/layer-contribution/identity";
import { resolveQuireViewLayerPlaneDescriptor } from "../../view-graph";
import { applyQuireDisplayCommandOpacity } from "../ownership";
import { applyQuireObjectSelectionSurfaceConfig } from "./object-selection";

/** Predicate used to route retained contributions into display-list phases. */
export type QuireLayerContributionDisplayFilter = (
  contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number]
) => boolean;

/** Appends content that must paint immediately after one retained contribution. */
export type QuireLayerContributionDisplayFollower = (
  contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number],
  retainedPaintOrder: number
) => void;

/** Resolves transient presentation opacity for one retained contribution. */
export type QuireLayerContributionOpacityResolver = (
  contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number]
) => number | undefined;

/**
 * Appends compiled region-owned commands for one paint surface.
 *
 * @param commands - Mutable display command sink.
 * @param snapshot - Layout snapshot carrying compiled contributions.
 * @param paintSurface - Shared paint surface being assembled.
 * @param clipRects - Optional document-space render clips.
 * @param ownerCommandCollector - Optional exact retained-owner command sink.
 * @param surfaceConfig - Optional semantic surface styling.
 * @param resolveOpacity - Optional owner-state opacity resolver.
 * @param accepts - Optional layer predicate for phase-specific routing.
 * @param appendFollower - Optional adjacent content-group appender.
 */
export function appendQuireLayerContributionCommands(
  commands: QuireDisplayCommand[],
  snapshot: QuireLayoutSnapshot,
  paintSurface: QuireDisplayCommandPaintSurface,
  clipRects?: readonly QuireRect[] | undefined,
  ownerCommandCollector?: QuireDisplayListOwnerCommandCollector | undefined,
  surfaceConfig?: QuireSurfaceConfig | undefined,
  resolveOpacity: QuireLayerContributionOpacityResolver = () => undefined,
  accepts: QuireLayerContributionDisplayFilter = () => true,
  appendFollower?: QuireLayerContributionDisplayFollower | undefined
): void {
  appendMatchingQuireLayerContributionCommands(
    commands,
    snapshot,
    paintSurface,
    clipRects,
    ownerCommandCollector,
    surfaceConfig,
    resolveOpacity,
    accepts,
    appendFollower
  );
}

/**
 * Appends only runtime-activated contribution commands for one paint surface.
 *
 * Overlay-only updates use this path because persistent contribution commands
 * remain in retained chunks. Re-emitting them here would duplicate stable
 * controls and labels every time selection geometry changes.
 *
 * @param commands - Mutable display command list receiving active commands.
 * @param snapshot - Current retained layout snapshot and editor state.
 * @param paintSurface - Content or overlay command surface to append.
 * @param clipRects - Optional document-space realization clips.
 * @param ownerCommandCollector - Optional exact-owner command collector.
 * @param surfaceConfig - Optional semantic surface styling.
 * @param resolveOpacity - Optional owner-state opacity resolver.
 * @returns Nothing.
 */
export function appendQuireRuntimeActivatedLayerContributionCommands(
  commands: QuireDisplayCommand[],
  snapshot: QuireLayoutSnapshot,
  paintSurface: QuireDisplayCommandPaintSurface,
  clipRects?: readonly QuireRect[] | undefined,
  ownerCommandCollector?: QuireDisplayListOwnerCommandCollector | undefined,
  surfaceConfig?: QuireSurfaceConfig | undefined,
  resolveOpacity: QuireLayerContributionOpacityResolver = () => undefined
): void {
  appendMatchingQuireLayerContributionCommands(
    commands,
    snapshot,
    paintSurface,
    clipRects,
    ownerCommandCollector,
    surfaceConfig,
    resolveOpacity,
    (contribution) => contribution.activation !== undefined
  );
}

/**
 * Appends active contribution commands accepted by one realization predicate.
 *
 * @param commands - Mutable display command list receiving commands.
 * @param snapshot - Current retained layout snapshot and editor state.
 * @param paintSurface - Content or overlay command surface to append.
 * @param clipRects - Optional document-space realization clips.
 * @param ownerCommandCollector - Optional exact-owner command collector.
 * @param resolveOpacity - Owner-state opacity resolver.
 * @param accepts - Predicate selecting stable or runtime-activated products.
 * @param appendFollower - Optional adjacent content-group appender.
 * @returns Nothing.
 */
function appendMatchingQuireLayerContributionCommands(
  commands: QuireDisplayCommand[],
  snapshot: QuireLayoutSnapshot,
  paintSurface: QuireDisplayCommandPaintSurface,
  clipRects: readonly QuireRect[] | undefined,
  ownerCommandCollector: QuireDisplayListOwnerCommandCollector | undefined,
  surfaceConfig: QuireSurfaceConfig | undefined,
  resolveOpacity: QuireLayerContributionOpacityResolver,
  accepts: (
    contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number]
  ) => boolean,
  appendFollower?: QuireLayerContributionDisplayFollower | undefined
): void {
  const contributions = (snapshot.layerContributions ?? [])
    .map((contribution, index) => ({ contribution, index }))
    .filter(({ contribution }) =>
      contribution.paintSurface === paintSurface
      && accepts(contribution)
      && isQuireRetainedLayerContributionActive(contribution, snapshot.state)
      && intersectsAnyClip(contribution.visualBounds ?? contribution.rect, clipRects)
    )
    .sort((left, right) => compareQuireLayerContributionPaintOrder(
      left.contribution,
      right.contribution,
      left.index,
      right.index
    ));
  for (let orderIndex = 0; orderIndex < contributions.length; orderIndex += 1) {
    const { contribution } = contributions[orderIndex]!;
    if (
      contribution.paintSurface !== paintSurface
    ) {
      continue;
    }
    const paintOrders = resolveQuireLayerContributionRetainedPaintOrders(
      contribution,
      paintSurface,
      orderIndex,
      contributions.length
    );
    const contributionCommands = applyQuireDisplayCommandOpacity(
      applyQuireObjectSelectionSurfaceConfig(
        contribution.commands,
        surfaceConfig?.objectSelection
      ),
      resolveOpacity(contribution)
    );
    commands.push(...contributionCommands);
    ownerCommandCollector?.append({
      productId: resolveQuireLayerContributionProductId(contribution),
      paintScope: paintSurface === "content" ? "layer-content" : "layer-overlay",
      paintOrder: paintOrders.contribution,
      commands: contributionCommands
    });
    appendFollower?.(contribution, paintOrders.follower);
  }
}

/**
 * Compares retained contributions from back to front using the canonical stack.
 *
 * @param left - First contribution.
 * @param right - Second contribution.
 * @param leftIndex - Stable source index of the first contribution.
 * @param rightIndex - Stable source index of the second contribution.
 * @returns Negative when the first contribution must paint first.
 */
function compareQuireLayerContributionPaintOrder(
  left: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number],
  right: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number],
  leftIndex: number,
  rightIndex: number
): number {
  return resolveQuireViewLayerPlaneDescriptor(left.layer.plane).displayOrder
      - resolveQuireViewLayerPlaneDescriptor(right.layer.plane).displayOrder
    || (left.layer.zIndex ?? 0) - (right.layer.zIndex ?? 0)
    || (left.layer.priority ?? 0) - (right.layer.priority ?? 0)
    || leftIndex - rightIndex;
}

/**
 * Resolves page-stack segment order from the same canonical layer facts.
 *
 * @param contribution - Retained contribution being emitted.
 * @param paintSurface - Content or overlay owner lane.
 * @param orderIndex - Canonical sorted contribution index.
 * @param contributionCount - Number of contributions in this paint phase.
 * @returns Adjacent retained orders for the contribution and its follower.
 */
function resolveQuireLayerContributionRetainedPaintOrders(
  contribution: NonNullable<QuireLayoutSnapshot["layerContributions"]>[number],
  paintSurface: QuireDisplayCommandPaintSurface,
  orderIndex: number,
  contributionCount: number
): { readonly contribution: number; readonly follower: number } {
  if (paintSurface === "overlay") {
    const contributionOrder = 300_000 + orderIndex;
    return { contribution: contributionOrder, follower: contributionOrder + 0.5 };
  }

  const contentOrder = resolveQuireViewLayerPlaneDescriptor("content").displayOrder;
  const planeOrder = resolveQuireViewLayerPlaneDescriptor(
    contribution.layer.plane
  ).displayOrder;
  if (planeOrder <= contentOrder) {
    const step = 1 / (contributionCount + 1);
    const contributionOrder = 50 + orderIndex * step * 2;
    return { contribution: contributionOrder, follower: contributionOrder + step };
  }

  const contributionOrder = 5_000 + orderIndex * 2;
  return { contribution: contributionOrder, follower: contributionOrder + 1 };
}

/**
 * Reports whether one contribution intersects the active render clips.
 *
 * @param rect - Contribution bounds in document space.
 * @param clipRects - Optional active render clips.
 * @returns Whether the contribution should enter the current display list.
 */
function intersectsAnyClip(
  rect: QuireRect,
  clipRects: readonly QuireRect[] | undefined
): boolean {
  return clipRects === undefined || doesQuireRectIntersectAny(rect, clipRects);
}
