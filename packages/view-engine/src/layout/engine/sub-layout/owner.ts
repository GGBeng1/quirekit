import {
  createQuireLayoutCoordinatePoint,
  translateQuireLayoutCoordinatePoint
} from "@quirekit/layout/identity";
import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireSubLayoutProjection } from "./types";

/**
 * Creates coordinate and retained owner facts for one projected query product.
 *
 * Ownership is attached only when the sidecar is explicitly resolved. An
 * unclaimed result remains geometry-only, while a gap stays observable through
 * the projection instead of receiving invented root or region defaults.
 *
 * @param projection - Child-flow geometry and its View sidecar.
 * @returns Shared query-product owner facts.
 */
export function createQuireSubLayoutQueryProductOwner(
  projection: QuireSubLayoutProjection
): QuireLayoutQueryProductOwner {
  const sourceCoordinateSpace = projection.geometry.root.kind === "table-cell"
    ? "table-cell-local"
    : "region-local";
  const ownership = projection.view.root.ownership;
  const region = ownership.status === "resolved"
    ? createQuireSubLayoutProjectionRegion(projection)
    : undefined;

  return {
    sourceRootId: projection.geometry.root.id,
    sourceFragmentId: projection.geometry.id,
    coordinateSpace: projection.geometry.coordinateSpace,
    sourceCoordinateSpace,
    coordinatePath: translateQuireLayoutCoordinatePoint(
      createQuireLayoutCoordinatePoint(sourceCoordinateSpace, 0, 0),
      projection.geometry.coordinateSpace,
      projection.geometry.localToResult
    ),
    ...(ownership.status === "resolved"
      ? { root: ownership.root }
      : {}),
    ...(region === undefined ? {} : { region })
  };
}

/**
 * Resolves the concrete visual region for one projected child-flow result.
 *
 * @param projection - Projection whose resolved visual owner is addressed.
 * @returns Fragment-qualified region, or undefined without resolved ownership.
 */
export function createQuireSubLayoutProjectionRegion(
  projection: QuireSubLayoutProjection
): QuireLayoutRegionRef | undefined {
  const ownership = projection.view.root.ownership;

  return ownership.status === "resolved"
    ? {
        ...ownership.owner.region,
        visualInstanceId: projection.geometry.id
      }
    : undefined;
}
