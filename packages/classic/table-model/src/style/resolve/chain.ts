import { emptyWordTableStyleFormatting, mergeWordTableStyleFormatting } from "./merge";
import type {
  ResolvedWordTableStyle,
  WordTableStyleDefinition,
  WordTableStyleFormatting,
  WordTableStyleRegionType,
  WordTableStyleRegistry
} from "../types";

/**
 * Compiles the effective style for one table instance.
 *
 * The document default table style contributes first, then the selected
 * style's `basedOn` chain from root to leaf; each style id contributes once and
 * inheritance cycles stop at the first repeated id. `wholeTable` is folded into
 * the baseline because it applies to every cell before other regions.
 *
 * @param registry - Document table-style registry.
 * @param styleId - Table instance style id, or null.
 * @returns Compiled style; an empty chain when no style applies.
 */
export function resolveWordTableStyle(
  registry: WordTableStyleRegistry,
  styleId: string | null
): ResolvedWordTableStyle {
  const chain: WordTableStyleDefinition[] = [];
  const contributed = new Set<string>();
  appendChain(registry, registry.defaultStyleId, chain, contributed, new Set());
  appendChain(registry, styleId, chain, contributed, new Set());

  let base = emptyWordTableStyleFormatting;
  const regions: Partial<Record<WordTableStyleRegionType, WordTableStyleFormatting>> = {};
  for (const style of chain) {
    base = mergeWordTableStyleFormatting(base, style.base);
    for (const [type, formatting] of Object.entries(style.regions) as [WordTableStyleRegionType, WordTableStyleFormatting][]) {
      regions[type] = mergeWordTableStyleFormatting(regions[type] ?? emptyWordTableStyleFormatting, formatting);
    }
  }
  const wholeTable = regions.wholeTable;
  delete regions.wholeTable;
  return {
    chain: chain.map(style => style.id),
    base: wholeTable === undefined ? base : mergeWordTableStyleFormatting(base, wholeTable),
    regions
  };
}

/**
 * Appends one style's inheritance chain in base-to-leaf order.
 *
 * @param registry - Style source.
 * @param styleId - Style to visit.
 * @param chain - Mutable output chain.
 * @param contributed - Ids already emitted.
 * @param visiting - Ids on the active recursion stack.
 */
function appendChain(
  registry: WordTableStyleRegistry,
  styleId: string | null,
  chain: WordTableStyleDefinition[],
  contributed: Set<string>,
  visiting: Set<string>
): void {
  if (styleId === null || contributed.has(styleId) || visiting.has(styleId)) return;
  const style = registry.styles[styleId];
  if (style === undefined) return;
  visiting.add(styleId);
  appendChain(registry, style.basedOn, chain, contributed, visiting);
  visiting.delete(styleId);
  if (contributed.has(styleId)) return;
  contributed.add(styleId);
  chain.push(style);
}
