import type { QuireRetainedRegionProducts } from "../../../../../layout/region-products";
import { compileQuireRetainedRegionProductSet } from "../../../../../layout/region-products";
import {
  createMarkerTarget,
  createMarkerTargetRect
} from "./target";
import { createTaskCheckboxCommands } from "../task-checkbox";
import type { CreateWordNumberingMarkerProductsOptions } from "../types";

export type { CreateWordNumberingMarkerProductsOptions } from "../types";

/** Exact capabilities owned by generated list marker controls. */
const markerCapabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

/**
 * Compiles one marker into retained ownership, paint, and action targets.
 *
 * @param options - Stable paragraph identity and local marker geometry.
 * @returns Products translated with the owning block during page projection.
 */
export function createWordNumberingMarkerProducts(
  options: CreateWordNumberingMarkerProductsOptions
): QuireRetainedRegionProducts {
  const targetRect = createMarkerTargetRect(options.fragment.rect, options.bodyStartX);
  const sourceId = `${options.id}:word-numbering-marker`;
  const regionId = "region:word-numbering-marker";
  const target = createMarkerTarget(options, targetRect);
  const commands = options.marker.kind === "task"
    ? createTaskCheckboxCommands(options, targetRect)
    : [];

  const products = compileQuireRetainedRegionProductSet([{
    producerId: `${options.id}:word-numbering-marker-products`,
    sourceKind: options.sourceKind,
    source: { sourceId, range: options.range },
    productKinds: ["view-root", "view-region", "layer-contribution"],
    root: {
      rootId: `root:${sourceId}`,
      kind: "block-container",
      source: { sourceId, range: options.range },
      capabilities: markerCapabilities
    },
    regions: [{
      regionId,
      kind: "block-container",
      source: { sourceId, range: options.range },
      rect: targetRect,
      coordinateSpace: "document",
      visualInstance: { kind: "single" },
      capabilities: markerCapabilities
    }],
    layerContributions: [{
      contributionId: `${options.id}:word-numbering-marker-control`,
      regionId,
      range: options.range,
      rect: targetRect,
      coordinateSpace: "document",
      layer: { plane: "controls" },
      paintSurface: "content",
      commands,
      domOverlays: [],
      targets: [target]
    }],
    selectionPolicies: [{
      policyId: `${options.id}:word-numbering-marker-selection`,
      regionId,
      kind: "control-dispatch"
    }]
  }]);
  return {
    ...products,
    regions: products.regions.map((region) => ({
      ...region,
      textLine: {
        topOffset: options.fragment.rect.y - targetRect.y,
        baselineOffset: options.fragment.baseline - targetRect.y
      }
    }))
  };
}
