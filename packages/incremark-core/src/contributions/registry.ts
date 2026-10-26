import { Facet } from "@quirekit/cm-state";
import type { ReadingContribution } from "./types";

/** Snapshot-local output-family and syntax index, in extension compiler order. */
export const readingContributions = Facet.define<ReadingContribution<unknown>, ReadonlyMap<symbol, ReadonlyMap<string, readonly ReadingContribution<unknown>[]>>>({
  /** @param values - Dependency/priority ordered installations. @returns One semantic lookup per output family. */
  combine(values) {
    const families = new Map<symbol, Map<string, ReadingContribution<unknown>[]>>();
    const owners = new Map<symbol, Set<string>>();
    for (const value of values) {
      const seen = owners.get(value.key) ?? new Set<string>();
      if (seen.has(value.owner)) throw new Error(`duplicate-reading-owner: ${value.owner}`);
      seen.add(value.owner); owners.set(value.key, seen);
      const index = families.get(value.key) ?? new Map<string, ReadingContribution<unknown>[]>();
      for (const name of new Set(value.codec.nodes)) {
        const entries = index.get(name) ?? []; entries.push(value); index.set(name, entries);
      }
      families.set(value.key, index);
    }
    return families;
  },
});
