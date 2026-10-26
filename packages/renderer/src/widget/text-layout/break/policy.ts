import type {
  QuireTextBreaker,
  QuireTextBreakInfo,
  QuireTextBreakMetadata
} from "./types";

/** Code point of a no-break space (NBSP), which glues adjacent text. */
const NBSP = 0x00a0;
/** Code point of a soft hyphen, a discretionary break opportunity. */
const SOFT_HYPHEN = 0x00ad;
/** Code point of the Unicode line separator. */
const LINE_SEPARATOR = 0x2028;
/** Code point of the Unicode paragraph separator. */
const PARAGRAPH_SEPARATOR = 0x2029;

/**
 * Reads the single code point of a one-grapheme segment, or undefined when the
 * segment is empty or spans several code points.
 *
 * @param segment - Grapheme segment to inspect.
 * @returns The lone code point, or undefined for multi-code-point segments.
 */
function singleCodePoint(segment: string): number | undefined {
  if (segment.length === 0) {
    return undefined;
  }

  const code = segment.codePointAt(0);
  if (code === undefined) {
    return undefined;
  }

  return code > 0xffff
    ? (segment.length === 2 ? code : undefined)
    : (segment.length === 1 ? code : undefined);
}

/**
 * Checks whether a grapheme segment is an explicit hard line break.
 *
 * @param segment - Grapheme segment to inspect.
 * @returns Whether the segment should force a new visual line.
 */
export function isQuireTextHardBreak(segment: string): boolean {
  if (segment === "\n" || segment === "\r" || segment === "\r\n") {
    return true;
  }
  const code = singleCodePoint(segment);
  return code === LINE_SEPARATOR || code === PARAGRAPH_SEPARATOR;
}

/**
 * Classifies one grapheme segment with the baseline line-break policy.
 *
 * Mirrors the deterministic baseline used for inline layout: hard breaks force a
 * new line, NBSP glues adjacent text, ordinary and soft hyphens allow a break
 * after them, whitespace is a break opportunity, ASCII word characters group
 * into words, and every other grapheme (for example CJK) breaks on its own.
 *
 * @param segment - Grapheme segment to classify.
 * @returns Segment role and durable break metadata.
 */
export function describeQuireTextSegment(segment: string): QuireTextBreakInfo {
  if (isQuireTextHardBreak(segment)) {
    return { kind: "hardBreak", breakAfter: true, nonBreakingGlue: false };
  }

  const code = singleCodePoint(segment);

  if (code === NBSP) {
    return { kind: "word", breakAfter: false, nonBreakingGlue: true };
  }

  if (code === 0x002d) {
    return { kind: "word", breakAfter: true, nonBreakingGlue: false };
  }

  if (code === SOFT_HYPHEN) {
    return { kind: "word", breakAfter: true, nonBreakingGlue: false, breakMarker: "-" };
  }

  if (code !== undefined && isAsciiWhitespaceCode(code)) {
    return { kind: "space", breakAfter: true, nonBreakingGlue: false };
  }

  if (code !== undefined && isAsciiWordCode(code)) {
    return { kind: "word", breakAfter: false, nonBreakingGlue: false };
  }

  if (/^\s+$/u.test(segment)) {
    return { kind: "space", breakAfter: true, nonBreakingGlue: false };
  }

  return {
    kind: "grapheme",
    breakAfter: false,
    nonBreakingGlue: false
  };
}

/**
 * Checks whether one code point is common ASCII whitespace.
 *
 * @param code - Code point to inspect.
 * @returns Whether the code point is covered by the ASCII whitespace fast path.
 */
function isAsciiWhitespaceCode(code: number): boolean {
  return (
    code === 0x0020 ||
    code === 0x0009 ||
    code === 0x000a ||
    code === 0x000b ||
    code === 0x000c ||
    code === 0x000d
  );
}

/**
 * Checks whether one code point is an ASCII word character.
 *
 * @param code - Code point to inspect.
 * @returns Whether the code point is `[A-Za-z0-9_]`.
 */
function isAsciiWordCode(code: number): boolean {
  return (
    (code >= 0x0030 && code <= 0x0039) ||
    (code >= 0x0041 && code <= 0x005a) ||
    code === 0x005f ||
    (code >= 0x0061 && code <= 0x007a)
  );
}

/**
 * Merges segment-level break metadata into one unit's metadata value.
 *
 * @param segments - Segment metadata values that form one unit.
 * @returns Metadata describing the combined unit's break behavior.
 */
export function mergeQuireTextBreakMetadata(
  segments: readonly QuireTextBreakMetadata[]
): QuireTextBreakMetadata {
  const last = segments.at(-1);
  const breakMarker = last?.breakMarker;

  return {
    breakAfter: last?.breakAfter ?? false,
    nonBreakingGlue: segments.some((segment) => segment.nonBreakingGlue),
    ...(breakMarker === undefined ? {} : { breakMarker })
  };
}

/** Default deterministic line breaker used by the text layout primitive. */
export const baselineQuireTextBreaker: QuireTextBreaker = {
  name: "baseline",
  describe: describeQuireTextSegment,
  merge: mergeQuireTextBreakMetadata
};

/**
 * Resolves an optional caller breaker to the baseline fallback.
 *
 * @param breaker - Optional caller-provided breaker policy.
 * @returns Caller-provided breaker or the default baseline breaker.
 */
export function resolveQuireTextBreaker(
  breaker?: QuireTextBreaker | undefined
): QuireTextBreaker {
  return breaker ?? baselineQuireTextBreaker;
}
