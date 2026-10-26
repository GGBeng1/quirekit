import type { LitAstNode } from "../../core/contracts.js";
import type { DocxNodeImportSource } from "../types.js";

type NormalizedNodeSource = {
  readonly nodeType: string;
  readonly matches?: ((node: LitAstNode) => boolean) | undefined;
};

/**
 * Normalizes semantic and exact node source declarations.
 *
 * @param value - One or many high-level source declarations.
 * @returns Frozen source selectors.
 */
export function normalizeNodeSources(
  value:
    | string
    | DocxNodeImportSource
    | readonly (string | DocxNodeImportSource)[]
): readonly NormalizedNodeSource[] {
  const values: readonly (string | DocxNodeImportSource)[] =
    typeof value === "string" || !Array.isArray(value)
      ? [value as string | DocxNodeImportSource]
      : value;
  return Object.freeze(values.map((source) =>
    typeof source === "string"
      ? Object.freeze({ nodeType: source })
      : source
  ));
}

/**
 * Normalizes one or many exact mark source types.
 *
 * @param value - Source type declaration.
 * @returns Immutable source type list.
 */
export function normalizeMarkSources(
  value: string | readonly string[]
): readonly string[] {
  return Object.freeze(typeof value === "string" ? [value] : [...value]);
}
