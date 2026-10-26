import type { QuireLayoutCoordinateRect } from "../../identity";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type {
  QuireInlineFlowOccurrence,
  QuireInlineFlowRegionGap
} from "./types";

/** Shared validation input for one line or exclusion declaration. */
export interface QuireInlineFlowDeclarationValidationInput {
  /** Declaration family used by diagnostics. */
  readonly productKind: QuireInlineFlowRegionGap["productKind"];
  /** Stable declaration id. */
  readonly productId: string;
  /** Exact retained owner supplied by the producer. */
  readonly owner: QuireLayoutOwnerFacts;
  /** Explicit single or repeated occurrence. */
  readonly occurrence: QuireInlineFlowOccurrence;
  /** Coordinate-space-tagged declaration rectangle. */
  readonly rect: QuireLayoutCoordinateRect;
}

/**
 * Validates identity and geometry shared by lines and exclusions.
 *
 * @param input - Declaration facts to validate.
 * @returns Typed gaps; an empty array means the declaration is usable.
 */
export function validateQuireInlineFlowDeclaration(
  input: QuireInlineFlowDeclarationValidationInput
): readonly QuireInlineFlowRegionGap[] {
  const gaps: QuireInlineFlowRegionGap[] = [];
  if (input.productId.trim().length === 0
    || input.owner.source.sourceId.trim().length === 0
    || input.owner.region.rootId.value.trim().length === 0
    || input.owner.region.regionId.value.trim().length === 0) {
    gaps.push(createGap(
      input,
      "invalid-identity",
      "Inline flow declarations require non-empty product, source, root, and region ids."
    ));
  }
  if (!isValidRect(input.rect)) {
    gaps.push(createGap(
      input,
      "invalid-geometry",
      "Inline flow rectangles require finite coordinates and positive extents."
    ));
  }

  const ownerInstanceId = input.owner.region.visualInstanceId;
  if (input.occurrence.kind === "single") {
    if (ownerInstanceId !== undefined) {
      gaps.push(createGap(
        input,
        "visual-instance-mismatch",
        "A single occurrence cannot use a repeated retained-region owner."
      ));
    }
    return gaps;
  }

  if (input.occurrence.visualInstanceId.trim().length === 0) {
    gaps.push(createGap(
      input,
      "visual-instance-missing",
      "A repeated occurrence requires a non-empty visual-instance id."
    ));
  }
  if (ownerInstanceId === undefined || ownerInstanceId.trim().length === 0) {
    gaps.push(createGap(
      input,
      "visual-instance-missing",
      "A repeated occurrence requires visual-instance identity on its retained owner."
    ));
  } else if (ownerInstanceId !== input.occurrence.visualInstanceId) {
    gaps.push(createGap(
      input,
      "visual-instance-mismatch",
      "The occurrence and retained-region visual-instance ids must match."
    ));
  }
  return gaps;
}

/**
 * Creates one typed declaration gap.
 *
 * @param input - Invalid declaration facts.
 * @param code - Machine-readable gap code.
 * @param message - Human-readable diagnostic.
 * @returns Typed inline flow gap.
 */
function createGap(
  input: QuireInlineFlowDeclarationValidationInput,
  code: QuireInlineFlowRegionGap["code"],
  message: string
): QuireInlineFlowRegionGap {
  return {
    code,
    productKind: input.productKind,
    productId: input.productId,
    message
  };
}

/**
 * Checks finite positive rectangle geometry.
 *
 * @param rect - Coordinate-space-tagged rectangle.
 * @returns Whether the rectangle can participate in interval subtraction.
 */
function isValidRect(rect: QuireLayoutCoordinateRect): boolean {
  return Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width > 0
    && rect.height > 0;
}
