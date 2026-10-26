import type { QuireBlockLayoutInput } from "../block-types";
import {
  createOwnedActiveExclusions,
  type QuireActiveBlockFlowExclusion
} from "./reflow";

/** Inputs needed to collect placed exclusions for every independent flow scope. */
export interface CollectScopeExclusionsOptions {
  /** Current shaped inputs that own local exclusions. */
  readonly source: readonly QuireBlockLayoutInput[];
  /** Scope identity parallel to source inputs. */
  readonly scopeIds: readonly number[];
  /** Current sibling block offsets parallel to source inputs. */
  readonly blockOffsets: readonly number[];
  /** Optional page/body fragment extent. */
  readonly fragmentBlockSize?: number | undefined;
}

/**
 * Collects every placed exclusion before any sibling is reflowed.
 *
 * @param options - Source ownership, scope ids, offsets, and fragment bound.
 * @returns Complete exclusion registry keyed by independent flow-scope id.
 */
export function collectScopeExclusions(
  options: CollectScopeExclusionsOptions
): ReadonlyMap<number, readonly QuireActiveBlockFlowExclusion[]> {
  const registry = new Map<number, QuireActiveBlockFlowExclusion[]>();

  for (let index = 0; index < options.source.length; index += 1) {
    const input = options.source[index];
    const scopeId = options.scopeIds[index];
    if (input === undefined || scopeId === undefined) continue;

    const exclusions = createOwnedActiveExclusions(
      input.localFlowExclusions ?? [],
      options.blockOffsets[index] ?? 0,
      options.fragmentBlockSize
    );
    if (exclusions.length === 0) continue;

    const existing = registry.get(scopeId) ?? [];
    existing.push(...exclusions);
    registry.set(scopeId, existing);
  }

  return registry;
}
