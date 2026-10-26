import type {
  QuireDecorationInteractionDescriptor,
  QuireDecorationSpec
} from "./types";

/**
 * Reads valid typed interaction descriptors from an unknown decoration spec.
 *
 * Invalid third-party values are ignored at the extension boundary so View
 * Engine never needs to interpret feature-owned attribute strings.
 *
 * @param value - Unknown ProseMirror decoration spec.
 * @returns Valid interaction descriptors in source order.
 */
export function readQuireDecorationInteractions(
  value: unknown
): readonly QuireDecorationInteractionDescriptor[] {
  if (!isRecord(value)) return [];
  const interactions = (value as QuireDecorationSpec).quireInteractions;
  return Array.isArray(interactions)
    ? interactions.filter(isQuireDecorationInteractionDescriptor)
    : [];
}

/**
 * Validates one decoration interaction descriptor.
 *
 * @param value - Unknown descriptor candidate.
 * @returns Whether the value is a complete retained interaction descriptor.
 */
function isQuireDecorationInteractionDescriptor(
  value: unknown
): value is QuireDecorationInteractionDescriptor {
  if (!isRecord(value) || !isRecord(value.owner) || !isRecord(value.placement)) {
    return false;
  }
  const placement = value.placement;
  const validPlacement = placement.kind === "range"
    || (
      placement.kind === "inline-start"
      && isFiniteNonNegativeNumber(placement.width)
      && placement.width > 0
      && isFiniteNonNegativeNumber(placement.gap)
    )
    || (
      placement.kind === "point"
      && isFiniteNonNegativeNumber(placement.width)
      && placement.width > 0
      && isFiniteNonNegativeNumber(placement.height)
      && placement.height > 0
      && isFiniteNonNegativeNumber(placement.gap)
      && (
        placement.alignment === undefined
        || placement.alignment === "caret-after"
        || placement.alignment === "visual-line-end"
      )
    );
  return validPlacement
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.role)
    && isNonEmptyString(value.part)
    && isNonEmptyString(value.owner.kind)
    && isNonEmptyString(value.owner.id)
    && (value.cursor === undefined || isNonEmptyString(value.cursor))
    && (
      value.handler === undefined
      || (
        isRecord(value.handler)
        && isNonEmptyString(value.handler.id)
      )
    );
}

/**
 * Reports whether a value is a non-array object record.
 *
 * @param value - Unknown value.
 * @returns Whether property reads are safe.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reports whether a value is a non-empty string.
 *
 * @param value - Unknown value.
 * @returns Whether the value contains non-whitespace text.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Reports whether a value is a finite non-negative number.
 *
 * @param value - Unknown value.
 * @returns Whether the value is valid renderer geometry.
 */
function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
