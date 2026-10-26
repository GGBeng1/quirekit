import type { QuireInlineSourceActivationMetadata, QuireInlineSourceCapabilitySidecar } from "./types";

/**
 * Creates a stable cache signature for one compiled source capability.
 *
 * @param sidecar - Claimed View capability product, when one exists.
 * @returns Deterministic signature fragment for block-layout identity.
 */
export function createQuireInlineSourceCapabilitySignature<TActivation extends QuireInlineSourceActivationMetadata>(
  sidecar: QuireInlineSourceCapabilitySidecar<TActivation> | undefined
): string {
  if (sidecar?.status === "resolved") {
    const declaration = sidecar.placement;
    const inline = declaration.inlinePlacement;
    const block = declaration.blockPlacement;
    const exclusion = declaration.flowExclusion;
    return [
      "resolved",
      sidecar.nodeType,
      declaration.objectId,
      sidecar.presentation.presentationSignature ?? "",
      declaration.extent.inlineSize,
      declaration.extent.blockSize,
      declaration.extent.baselineOffset ?? "",
      declaration.layoutMode,
      declaration.anchorMovement,
      inline.kind,
      inline.reference,
      inline.kind === "offset" ? inline.offset : inline.alignment,
      block.kind,
      block.reference,
      block.kind === "offset" ? block.offset : block.alignment,
      exclusion.kind,
      exclusion.kind !== "none" && "side" in exclusion ? exclusion.side : "",
      exclusion.kind !== "none" ? exclusion.clearance.blockStart : "",
      exclusion.kind !== "none" ? exclusion.clearance.inlineEnd : "",
      exclusion.kind !== "none" ? exclusion.clearance.blockEnd : "",
      exclusion.kind !== "none" ? exclusion.clearance.inlineStart : "",
      exclusion.kind === "contour-envelope" || exclusion.kind === "contour-through"
        ? exclusion.paths.map((path) => path.points
            .map((point) => `${point.x},${point.y}`)
            .join(";")
          ).join("|")
        : "",
      declaration.paintOrder,
      declaration.stackingOrder,
      declaration.allowOverlap,
      declaration.constrainToRegion,
      declaration.constraintOwnerKind ?? "",
      declaration.lockAspectRatio,
      declaration.storyId ?? "",
      sidecar.presentation.interactionTransform?.rotation ?? "",
      JSON.stringify(sidecar.presentation.interactionHitAreas ?? null),
      sidecar.presentation.viewVisualOverflow?.top ?? "",
      sidecar.presentation.viewVisualOverflow?.right ?? "",
      sidecar.presentation.viewVisualOverflow?.bottom ?? "",
      sidecar.presentation.viewVisualOverflow?.left ?? "",
      sidecar.presentation.selectedViewVisualOverflow?.top ?? "",
      sidecar.presentation.selectedViewVisualOverflow?.right ?? "",
      sidecar.presentation.selectedViewVisualOverflow?.bottom ?? "",
      sidecar.presentation.selectedViewVisualOverflow?.left ?? "",
      sidecar.presentation.selectedViewActivation?.relatedRange?.from ?? "",
      sidecar.presentation.selectedViewActivation?.relatedRange?.to ?? ""
    ].join("\u0004");
  }

  if (sidecar?.status === "gap") {
    return `gap\u0004${sidecar.gaps.map((gap) => [
      gap.code,
      gap.nodeType,
      gap.message
    ].join("\u0002")).join("\u0004")}`;
  }

  return "unclaimed";
}
