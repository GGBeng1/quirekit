import type {
  QuireLineBreakerPolicy,
  QuireLineBreakMetadata,
  QuireLineBreakSegmentInfo,
  QuireLineBreakUnitKind
} from "./types";

/**
 * Classifies a grapheme for the simple word-aware line breaker.
 *
 * @param segment - Grapheme segment to classify.
 * @returns Segment line-breaking role.
 */
export function classifyQuireLineBreakSegment(
  segment: string
): QuireLineBreakUnitKind {
  return describeQuireLineBreakSegment(segment).kind;
}

/**
 * Describes the baseline line-breaking metadata for one grapheme segment.
 *
 * @param segment - Grapheme segment to classify.
 * @returns Segment role and durable break metadata.
 */
export function describeQuireLineBreakSegment(
  segment: string
): QuireLineBreakSegmentInfo {
  if (isQuireHardBreakSegment(segment)) {
    return {
      kind: "hardBreak",
      breakAfter: true,
      nonBreakingGlue: false
    };
  }

  if (segment === "\u00a0") {
    return {
      kind: "word",
      breakAfter: false,
      nonBreakingGlue: true
    };
  }

  if (segment === "-") {
    return {
      kind: "word",
      breakAfter: true,
      nonBreakingGlue: false
    };
  }

  if (segment === "\u00ad") {
    return {
      kind: "word",
      breakAfter: true,
      nonBreakingGlue: false,
      breakMarker: "-"
    };
  }

  if (/^\s+$/u.test(segment)) {
    return {
      kind: "space",
      breakAfter: true,
      nonBreakingGlue: false
    };
  }

  return {
    kind: /^[A-Za-z0-9_]$/u.test(segment) ? "word" : "grapheme",
    breakAfter: false,
    nonBreakingGlue: false
  };
}

/**
 * Merges segment-level line-break metadata into one layout unit metadata value.
 *
 * @param segments - Segment metadata values that form one measured layout unit.
 * @returns Metadata that describes the break behavior of the combined unit.
 */
export function mergeQuireLineBreakMetadata(
  segments: readonly QuireLineBreakMetadata[]
): QuireLineBreakMetadata {
  const lastSegment = segments.at(-1);
  const breakMarker = lastSegment?.breakMarker;

  return {
    breakAfter: lastSegment?.breakAfter ?? false,
    nonBreakingGlue: segments.some((segment) => segment.nonBreakingGlue),
    ...(breakMarker === undefined ? {} : { breakMarker })
  };
}

/**
 * Checks whether a grapheme segment is an explicit hard line break.
 *
 * @param segment - Grapheme segment to inspect.
 * @returns Whether the segment should force a new visual line.
 */
export function isQuireHardBreakSegment(segment: string): boolean {
  return (
    segment === "\n" ||
    segment === "\r" ||
    segment === "\r\n" ||
    segment === "\u2028" ||
    segment === "\u2029"
  );
}

/** Default deterministic line-breaker policy used by inline layout. */
export const baselineQuireLineBreakerPolicy: QuireLineBreakerPolicy = {
  name: "baseline",
  describeSegment: describeQuireLineBreakSegment,
  mergeMetadata: mergeQuireLineBreakMetadata,
  isHardBreakSegment: isQuireHardBreakSegment
};

/**
 * Resolves an optional line-breaker policy to the baseline fallback.
 *
 * @param policy - Optional caller-provided line-breaker policy.
 * @returns Caller-provided policy or the default baseline policy.
 */
export function resolveQuireLineBreakerPolicy(
  policy?: QuireLineBreakerPolicy | undefined
): QuireLineBreakerPolicy {
  return policy ?? baselineQuireLineBreakerPolicy;
}
