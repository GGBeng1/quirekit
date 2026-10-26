import {
  isWordNamedParagraphStyle,
  isWordParagraphStyleRegistry
} from "../model";
import type {
  ApplyWordParagraphStyleOptions,
  SetWordParagraphStyleRegistryOptions,
  UpdateWordParagraphStyleOptions
} from "./types";

/**
 * Checks one apply-style command payload.
 *
 * @param value - Candidate command payload.
 * @returns Whether the payload contains one non-empty style identifier.
 */
export function isApplyWordParagraphStyleOptions(
  value: unknown
): value is ApplyWordParagraphStyleOptions {
  return isRecord(value)
    && typeof value.styleId === "string"
    && value.styleId.trim().length > 0;
}

/**
 * Checks one replace-registry command payload.
 *
 * @param value - Candidate command payload.
 * @returns Whether the payload contains one valid complete registry.
 */
export function isSetWordParagraphStyleRegistryOptions(
  value: unknown
): value is SetWordParagraphStyleRegistryOptions {
  return isRecord(value) && isWordParagraphStyleRegistry(value.registry);
}

/**
 * Checks one update-style command payload.
 *
 * @param value - Candidate command payload.
 * @returns Whether the payload contains one complete named style definition.
 */
export function isUpdateWordParagraphStyleOptions(
  value: unknown
): value is UpdateWordParagraphStyleOptions {
  return isRecord(value) && isWordNamedParagraphStyle(value.style);
}

/**
 * Checks one non-null object record.
 *
 * @param value - Candidate record.
 * @returns Whether the value is an object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
