import { Facet } from "@quirekit/cm-state";
import type { BlockInputRule } from "./types";

/** Installation-local ownership lookup; input never scans the extension list. */
export const blockInputRegistry = Facet.define<ReadonlyMap<string, BlockInputRule>, ReadonlyMap<string, BlockInputRule>>({
  combine: values => values[0] ?? new Map(),
});

/** @param rules - Compiled feature contributions. @returns Validated static ownership before editor allocation. */
export function compileBlockInput(rules: readonly BlockInputRule[]): ReadonlyMap<string, BlockInputRule> {
  const registry = new Map<string, BlockInputRule>();
  for (const rule of rules) for (const name of rule.nodes) {
    if (registry.has(name)) throw new Error(`duplicate-block-input-owner: ${name}`);
    registry.set(name, rule);
  }
  return registry;
}
