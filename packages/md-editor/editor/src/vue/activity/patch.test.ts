import { describe, expect, it } from "vitest";
import { unifiedPatch } from "./patch";

/** @param patch - Unified diff. @returns Added and removed counts, after checking every header against its rows. */
function verify(patch: string) {
  let additions = 0, removals = 0;
  for (const hunk of patch.split(/^(?=@@)/m)) {
    const [header, ...rows] = hunk.trimEnd().split("\n");
    const [, , oldCount, , newCount] = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/.exec(header!)!.map(Number);
    expect(rows.filter(row => row[0] !== "+").length).toBe(oldCount);
    expect(rows.filter(row => row[0] !== "-").length).toBe(newCount);
    additions += rows.filter(row => row[0] === "+").length; removals += rows.filter(row => row[0] === "-").length;
  }
  return { additions, removals };
}

describe("unifiedPatch", () => {
  it("groups nearby changes with context and passes the viewer's count checks", () => {
    const before = Array.from({ length: 20 }, (_, index) => `line ${index}`).join("\n") + "\n";
    const after = before.replace("line 2\n", "line two\n").replace("line 5\n", "").replace("line 18\n", "line 18\nadded\n");
    const patch = unifiedPatch(before, after);
    expect(patch.split("\n").filter(line => line.startsWith("@@"))).toEqual(["@@ -1,9 +1,8 @@", "@@ -17,4 +16,5 @@"]);
    expect(verify(patch)).toEqual({ additions: 2, removals: 2 });
    expect(unifiedPatch("", "a\nb\n")).toBe("@@ -0,0 +1,2 @@\n+a\n+b\n");
    expect(unifiedPatch("same\n", "same\n")).toBe("");
  });
});
