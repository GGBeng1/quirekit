import type {
  FloatingObjectAttributes,
  FloatingObjectMove,
  FloatingObjectOptions,
  FloatingObjectResize
} from "./types";

/**
 * Reads canonical geometry from a schema node attribute bag.
 *
 * @param value - Candidate node attributes.
 * @returns Valid geometry, or undefined when authority is malformed.
 */
export function readFloatingObjectGeometry(
  value: Readonly<Record<string, unknown>>
): FloatingObjectAttributes | undefined {
  const width = value.width;
  const minHeight = value.minHeight;
  const inlineOffset = value.inlineOffset;
  const blockOffset = value.blockOffset;

  return isPositiveFiniteNumber(width)
    && isPositiveFiniteNumber(minHeight)
    && isNonNegativeFiniteNumber(inlineOffset)
    && isNonNegativeFiniteNumber(blockOffset)
    ? { width, minHeight, inlineOffset, blockOffset }
    : undefined;
}

/**
 * Applies a move delta while preserving canonical non-negative offsets.
 *
 * @param geometry - Current persisted geometry.
 * @param move - Requested deterministic move.
 * @returns Updated geometry, or undefined for malformed deltas.
 */
export function moveFloatingObjectGeometry(
  geometry: FloatingObjectAttributes,
  move: FloatingObjectMove
): FloatingObjectAttributes | undefined {
  if (!isFiniteNumber(move.inlineDelta) || !isFiniteNumber(move.blockDelta)) {
    return undefined;
  }

  return {
    ...geometry,
    inlineOffset: Math.max(0, geometry.inlineOffset + move.inlineDelta),
    blockOffset: Math.max(0, geometry.blockOffset + move.blockDelta)
  };
}

/**
 * Applies a resize delta while preserving configured minimum dimensions.
 *
 * @param geometry - Current persisted geometry.
 * @param resize - Requested deterministic resize.
 * @param options - Extension geometry policy.
 * @returns Updated geometry, or undefined for malformed deltas.
 */
export function resizeFloatingObjectGeometry(
  geometry: FloatingObjectAttributes,
  resize: FloatingObjectResize,
  options: FloatingObjectOptions
): FloatingObjectAttributes | undefined {
  if (!isFiniteNumber(resize.inlineDelta) || !isFiniteNumber(resize.blockDelta)) {
    return undefined;
  }

  const horizontal = resizeHorizontalGeometry(geometry, resize, options);
  const vertical = resizeVerticalGeometry(geometry, resize, options);
  return {
    ...geometry,
    ...horizontal,
    ...vertical
  };
}

/**
 * Resolves one horizontal resize while anchoring the opposite edge.
 *
 * @param geometry - Initial accepted object geometry.
 * @param resize - Direction and pointer displacement.
 * @param options - Extension-owned minimum dimensions.
 * @returns Updated inline offset and width.
 */
function resizeHorizontalGeometry(
  geometry: FloatingObjectAttributes,
  resize: FloatingObjectResize,
  options: FloatingObjectOptions
): Pick<FloatingObjectAttributes, "inlineOffset" | "width"> {
  if (resize.direction.includes("west")) {
    const anchoredRight = geometry.inlineOffset + geometry.width;
    const proposedLeft = Math.max(0, geometry.inlineOffset + resize.inlineDelta);
    const inlineOffset = Math.min(
      proposedLeft,
      Math.max(0, anchoredRight - options.minimumWidth)
    );
    return {
      inlineOffset,
      width: anchoredRight - inlineOffset
    };
  }
  if (resize.direction.includes("east")) {
    return {
      inlineOffset: geometry.inlineOffset,
      width: Math.max(options.minimumWidth, geometry.width + resize.inlineDelta)
    };
  }
  return {
    inlineOffset: geometry.inlineOffset,
    width: geometry.width
  };
}

/**
 * Resolves one vertical resize while anchoring the opposite edge.
 *
 * @param geometry - Initial accepted object geometry.
 * @param resize - Direction and pointer displacement.
 * @param options - Extension-owned minimum dimensions.
 * @returns Updated block offset and minimum height.
 */
function resizeVerticalGeometry(
  geometry: FloatingObjectAttributes,
  resize: FloatingObjectResize,
  options: FloatingObjectOptions
): Pick<FloatingObjectAttributes, "blockOffset" | "minHeight"> {
  if (resize.direction.includes("north")) {
    const anchoredBottom = geometry.blockOffset + geometry.minHeight;
    const proposedTop = Math.max(0, geometry.blockOffset + resize.blockDelta);
    const blockOffset = Math.min(
      proposedTop,
      Math.max(0, anchoredBottom - options.minimumHeight)
    );
    return {
      blockOffset,
      minHeight: anchoredBottom - blockOffset
    };
  }
  if (resize.direction.includes("south")) {
    return {
      blockOffset: geometry.blockOffset,
      minHeight: Math.max(
        options.minimumHeight,
        geometry.minHeight + resize.blockDelta
      )
    };
  }
  return {
    blockOffset: geometry.blockOffset,
    minHeight: geometry.minHeight
  };
}

/**
 * Reports whether a value is finite.
 *
 * @param value - Candidate number.
 * @returns Whether the value is a finite number.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Reports whether a value is positive and finite.
 *
 * @param value - Candidate number.
 * @returns Whether the value is greater than zero.
 */
function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/**
 * Reports whether a value is non-negative and finite.
 *
 * @param value - Candidate number.
 * @returns Whether the value is at least zero.
 */
function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}
