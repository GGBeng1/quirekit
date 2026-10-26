import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireBlockShapeCache } from "../../../layout/cache";
import { createQuireEditorLayoutProviderRegistry } from "../../providers/registry";
import { collectQuireProseMirrorBlockInputs, collectQuireProseMirrorContainerBlockInputs } from "../block";
import type { QuireProseMirrorBlockInputOptions } from "../block";

describe("per-story text wrap cache identity", () => {
  it.each([false, true])("keeps source line policy distinct with top-level caching %s", (topLevel) => {
    const editor = createEditor({ extensions: [StarterKit], content: {
      type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "内部资料" }] }]
    } });
    const options: QuireProseMirrorBlockInputOptions = {
      state: editor.state, width: 25, font: "16px Arial", lineHeight: 24, textBaselineOffset: 18,
      textMeasurer: { measureText: (text: string) => ({ width: text.length * 10, ascent: 12, descent: 4 }) },
      lineBreakMode: "word", blockShapeCache: createQuireBlockShapeCache(), wordNumberingMarkers: new Map(),
      snapshotVersion: 1, layoutProviderRegistry: createQuireEditorLayoutProviderRegistry()
    };
    /** @param mode - Policy in this source context. @returns Count of shaped lines. */
    const collect = (mode: "word" | "none") => {
      const resolved = { ...options, lineBreakMode: mode };
      const inputs = topLevel
        ? collectQuireProseMirrorBlockInputs(resolved)
        : collectQuireProseMirrorContainerBlockInputs({ node: editor.state.doc, contentStart: 0, path: [1] }, resolved);
      return new Set(inputs[0]!.textFragments!.map(fragment => fragment.rect.y)).size;
    };
    expect(collect("word")).toBe(2);
    expect(collect("none")).toBe(1);
    expect(collect("word")).toBe(2);
    expect(collect("none")).toBe(1);
    editor.destroy();
  });
});
