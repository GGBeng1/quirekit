import { describe, expect, it } from "vitest";
import type { MarkdownReference } from "../types";
import type { ReferenceSummary } from "./types";
import { combineReferences, compareReferences, emptyReferences, referenceEntries, referenceLeaf } from "./summary";

/** @param label - Exact normalized key. @param url - Destination. @returns An immutable summary leaf. */
function leaf(label: string, url = `/${label}`): ReferenceSummary { return referenceLeaf(Object.freeze({ label, url, title: "" })); }
/** @param children - Nonempty ordered segments. @returns An independently balanced summary. */
function join(...children: ReferenceSummary[]): ReferenceSummary { return combineReferences(children, { summaryLinks: 0 }); }
/** @returns Fresh deterministic comparison counters. */
function work() { return { definitionComparisons: 0, summaryComparisons: 0, reusedDefinitions: 0 }; }

describe("ordered shared reference summaries", () => {
  it("skips shared subtrees while comparing changed labels, destinations and titles exactly", () => {
    const shared = join(...Array.from({ length: 1000 }, (_, index) => leaf(`ID-${index}`)));
    const before = join(leaf("FIRST"), shared, leaf("LAST")), count = work();
    const after = join(leaf("FIRST", "/new"), shared, leaf("LAST"));
    expect(compareReferences(before, after, count)).toEqual({ entries: false, labels: true });
    expect(count.reusedDefinitions).toBe(1000); expect(count.definitionComparisons).toBe(2);
    expect(count.summaryComparisons).toBeLessThan(10);
    const title = referenceLeaf(Object.freeze({ label: "FIRST", url: "/FIRST", title: "changed" }));
    expect(compareReferences(leaf("FIRST"), title, work())).toEqual({ entries: false, labels: true });
    expect(compareReferences(leaf("FIRST"), leaf("OTHER"), work())).toEqual({ entries: false, labels: false });
  });

  it("preserves duplicates and detects precedence changes across different branch boundaries", () => {
    const first = leaf("ID", "/first"), second = leaf("ID", "/second"), third = leaf("OTHER");
    const before = join(first, join(second, third));
    expect([...referenceEntries(before)].map(value => value.url)).toEqual(["/first", "/second", "/OTHER"]);
    expect(compareReferences(before, join(join(first, second), third), work())).toEqual({ entries: true, labels: true });
    expect(compareReferences(before, join(join(second, first), third), work())).toEqual({ entries: false, labels: true });
    expect(compareReferences(before, join(first, third), work())).toEqual({ entries: false, labels: false });
    expect(compareReferences(emptyReferences, emptyReferences, work())).toEqual({ entries: true, labels: true });
  });

  it("matches flat exact equality through deterministic rebalance, insert, delete and reorder cases", () => {
    let seed = 1234567;
    /** @param limit - Exclusive upper bound. @returns Reproducible pseudo-random index. */
    function next(limit: number): number { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit; }
    /** @param values - Ordered definition segments. @returns Fresh nested grouping, retaining leaf identity. */
    function grouped(values: ReferenceSummary[]): ReferenceSummary {
      if (values.length < 2) return values[0] ?? emptyReferences;
      const middle = 1 + next(values.length - 1);
      return join(grouped(values.slice(0, middle)), grouped(values.slice(middle)));
    }
    const values = Array.from({ length: 40 }, (_, index) => leaf(`ID-${index % 7}`, `/${index}`));
    for (let round = 0; round < 200; round++) {
      const changed = [...values], index = next(changed.length);
      switch (round % 5) {
        case 0: changed.splice(index, 1); break;
        case 1: changed.splice(index, 0, leaf("NEW")); break;
        case 2: changed[index] = leaf(changed[index]!.definition!.label, "/changed"); break;
        case 3: changed.push(changed.shift()!); break;
      }
      const a = grouped(values), b = grouped(changed);
      const left = [...referenceEntries(a)], right = [...referenceEntries(b)];
      /** @param select - Exact fields used by a flat full-summary oracle. @returns Whether each ordered item matches. */
      function equal(select: (value: MarkdownReference) => string): boolean {
        return left.length === right.length && left.every((value, i) => select(value) === select(right[i]!));
      }
      expect(compareReferences(a, b, work())).toEqual({ entries: equal(value => JSON.stringify(value)), labels: equal(value => value.label) });
    }
  });
});
