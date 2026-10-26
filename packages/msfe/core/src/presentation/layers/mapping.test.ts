import { describe, expect, it } from "vitest";
import { ChangeSet } from "@quirekit/cm-state";
import { componentView } from "../../views/component/renderer";
import { mapLayerCache, retainLayerIdentities } from "./mapping";
import type { ComponentViewRenderer } from "../../views/component/types";
import type { ProjectionDecoration } from "./types";

const renderer: ComponentViewRenderer<{ position: number }> = () => { throw new Error("Planning must not mount a renderer"); };
/** @param from - Source start. @param to - Source end. @returns A coordinate-bearing projection without mounting or resources. */
function item(from = 10, to = 20): ProjectionDecoration {
  return { type: "replace", from, to, key: String(from), view: componentView(renderer, { position: from + 2 },
    (props, offset) => ({ position: props.position + offset })) };
}

describe("incremental component declaration lifetime", () => {
  it("retains identity and relocates future-mount props across multiple prefix changes", () => {
    const initial = retainLayerIdentities([item()], undefined, 1), identity = [...initial.identities!.values()][0];
    const first = mapLayerCache(initial, ChangeSet.of({ from: 1, insert: "abc" }, 30));
    const second = mapLayerCache(first, ChangeSet.of({ from: 3, to: 5 }, 33));
    const current = second.descriptions[0]!;
    expect(current).toMatchObject({ from: 11, to: 21, view: { props: { position: 13 } } });
    expect(second.identities!.get(current)).toBe(identity);
    expect(initial.descriptions[0]).toMatchObject({ from: 10, view: { props: { position: 12 } } });
  });

  it("reconciles a freshly queried viewport with the mapped source identity", () => {
    const initial = retainLayerIdentities([item()], undefined, 1);
    const mapped = mapLayerCache(initial, ChangeSet.of({ from: 1, insert: "abc" }, 30));
    const fresh = retainLayerIdentities([item(13, 23)], mapped, 2);
    expect([...fresh.identities!.values()]).toEqual([...initial.identities!.values()]);
  });

  it("deduplicates an enclosing owner returned by multiple visible intervals", () => {
    const output = retainLayerIdentities([item(), item()], undefined, 1);
    expect(output.descriptions).toHaveLength(1);
    expect(output.identities!.size).toBe(1);
  });

  it("retires whole replacements even when their source is identical", () => {
    const initial = retainLayerIdentities([item()], undefined, 1);
    const mapped = mapLayerCache(initial, ChangeSet.of({ from: 10, to: 20, insert: "0123456789" }, 30));
    expect(mapped.descriptions).toHaveLength(0);
    const fresh = retainLayerIdentities([item()], mapped, 2);
    expect([...fresh.identities!.values()]).not.toEqual([...initial.identities!.values()]);
  });

  it("maps reveal owners separately from a small normalized fragment", () => {
    const initial = { builds: 1, descriptions: [{ type: "replace" as const, key: "newline", from: 12, to: 13,
      text: " ", block: false, revealRange: { from: 10, to: 20 } }] };
    const mapped = mapLayerCache(initial, ChangeSet.of({ from: 1, insert: "abc" }, 30));
    expect(mapped.descriptions[0]).toMatchObject({ from: 15, to: 16, revealRange: { from: 13, to: 23 } });
  });
});
