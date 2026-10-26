import { quireRenderParityAreas } from "./fingerprint";
import type {
  QuireRenderParityComparison,
  QuireRenderParityFingerprint,
  QuireRenderParityMismatch
} from "./types";

/**
 * Compares an incremental candidate with an independent full reference.
 *
 * @param candidate - Fingerprint produced by retained incremental work.
 * @param reference - Fingerprint produced by a fresh full runtime.
 * @returns Typed area mismatches and explicit comparison gaps.
 */
export function compareQuireRenderParityFingerprints(
  candidate: QuireRenderParityFingerprint,
  reference: QuireRenderParityFingerprint
): QuireRenderParityComparison {
  const mismatches: QuireRenderParityMismatch[] = [];

  for (const area of quireRenderParityAreas) {
    if (candidate.facts[area] === reference.facts[area]) {
      continue;
    }
    const difference = findFirstParityDifference(
      JSON.parse(candidate.facts[area]),
      JSON.parse(reference.facts[area])
    );
    mismatches.push({
      area,
      path: difference.path,
      candidateValue: difference.candidate,
      referenceValue: difference.reference,
      candidate: candidate.facts[area],
      reference: reference.facts[area]
    });
  }

  return {
    matches:
      mismatches.length === 0
      && candidate.gaps.length === 0
      && reference.gaps.length === 0,
    mismatches,
    candidateGaps: candidate.gaps,
    referenceGaps: reference.gaps
  };
}

/** First differing canonical value pair. */
interface QuireRenderParityDifference {
  /** Canonical path to the difference. */
  readonly path: string;
  /** Candidate value at the path. */
  readonly candidate: unknown;
  /** Full-reference value at the path. */
  readonly reference: unknown;
}

/**
 * Locates the first deterministic difference between two canonical fact trees.
 *
 * @param candidate - Parsed candidate facts.
 * @param reference - Parsed reference facts.
 * @param path - Current canonical fact path.
 * @returns First differing path, or the current root when values are equal unexpectedly.
 */
function findFirstParityDifference(
  candidate: unknown,
  reference: unknown,
  path = "$"
): QuireRenderParityDifference {
  if (Object.is(candidate, reference)) {
    return { path, candidate, reference };
  }
  if (Array.isArray(candidate) && Array.isArray(reference)) {
    const length = Math.max(candidate.length, reference.length);
    for (let index = 0; index < length; index += 1) {
      if (JSON.stringify(candidate[index]) !== JSON.stringify(reference[index])) {
        return findFirstParityDifference(
          candidate[index],
          reference[index],
          `${path}[${index}]`
        );
      }
    }
    return { path, candidate, reference };
  }
  if (isParityRecord(candidate) && isParityRecord(reference)) {
    const keys = [...new Set([...Object.keys(candidate), ...Object.keys(reference)])].sort();
    for (const key of keys) {
      if (JSON.stringify(candidate[key]) !== JSON.stringify(reference[key])) {
        return findFirstParityDifference(
          candidate[key],
          reference[key],
          `${path}.${key}`
        );
      }
    }
  }
  return { path, candidate, reference };
}

/**
 * Checks whether a parsed fact can be traversed by stable object key.
 *
 * @param value - Parsed canonical fact.
 * @returns Whether the value is a non-array object record.
 */
function isParityRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
