import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuireBlockTextFlowReflow } from "../../../../layout/engine/block-types";
import { createQuireBlockShapeCache } from "../../../../layout/cache";
import { createQuireEditorLayoutProviderRegistry } from "../../../providers/registry";
import { collectQuireProseMirrorBlockInputs } from "../../block";
import * as shapingSource from "../source";
import { rebindNativeTextblockReflow, registerNativeTextblockReflow } from "./service";

afterEach(() => vi.restoreAllMocks());

/** @returns A service with observable calls and deterministic replacement output. */
function createService(): QuireBlockTextFlowReflow {
  return {
    lineHeight: 20,
    reflow: vi.fn(() => ({ textFragments: [], localFlowExclusions: [] })),
    reflowInlineReplacements: vi.fn(() => ({ textRuns: [], textFragments: [] }))
  };
}

describe("native current-source reflow binding", () => {
  it("rejects unknown services without constructing current source", () => {
    const resolve = vi.fn(createService);
    expect(rebindNativeTextblockReflow(createService(), resolve)).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("constructs source once on consumption and forwards exact slots and replacements", () => {
    const original = registerNativeTextblockReflow(createService());
    const current = registerNativeTextblockReflow(createService());
    const resolve = vi.fn(() => current);
    const moved = rebindNativeTextblockReflow(original, resolve)!;
    const slots = [[{ x: 40, width: 80 }, { x: 160, width: 140 }]];
    const replacements = new Map();
    expect(moved.lineHeight).toBe(original.lineHeight);
    expect(resolve).not.toHaveBeenCalled();
    moved.reflow(slots, "two-physical-slots");
    moved.reflow(slots, "two-physical-slots");
    moved.reflowInlineReplacements(replacements);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(current.reflow).toHaveBeenCalledWith(slots, "two-physical-slots");
    expect(current.reflowInlineReplacements).toHaveBeenCalledWith(replacements);
    expect(original.reflow).not.toHaveBeenCalled();
    expect(rebindNativeTextblockReflow(moved, () => current)).toBeDefined();
  });

  it("keeps exact identity and rebuilds only a consumed moved source at its current path", () => {
    const editor = createEditor({ extensions: [StarterKit], content: {
      type: "doc", content: ["Lead", "unchanged text wraps across slots", "Tail"].map((text) => ({
        type: "paragraph", content: [{ type: "text", text }]
      }))
    } });
    const cache = createQuireBlockShapeCache();
    const trace = vi.fn();
    const measureText = vi.fn((text: string) => ({ width: text.length * 8 }));
    const options = {
      state: editor.state, snapshotVersion: 1,
      layoutProviderRegistry: createQuireEditorLayoutProviderRegistry(),
      width: 300, font: "16px sans-serif", lineHeight: 20, textBaselineOffset: 15,
      lineBreakMode: "word" as const, textMeasurer: { measureText }, blockShapeCache: cache, trace
    };
    const first = collectQuireProseMirrorBlockInputs(options);
    const exact = collectQuireProseMirrorBlockInputs(options);
    expect(exact[1]).toBe(first[1]);
    const sourceSpy = vi.spyOn(shapingSource, "resolveQuireTextblockShapingSource");
    editor.view.dispatch(editor.state.pm.tr.insertText("grow", 1));
    const currentOptions = { ...options, state: editor.state, snapshotVersion: 2 };
    const moved = collectQuireProseMirrorBlockInputs(currentOptions);
    expect(sourceSpy).toHaveBeenCalledTimes(1); // Only changed Lead, not the suffix.
    const callsBeforeConsume = measureText.mock.calls.length;
    void moved[1]!.textFlowReflow!.lineHeight;
    expect(sourceSpy).toHaveBeenCalledTimes(1);
    expect(measureText).toHaveBeenCalledTimes(callsBeforeConsume);
    const traceBeforeConsume = trace.mock.calls.length;
    const slots = [[{ x: 40, width: 70 }, { x: 170, width: 130 }]];
    const service = moved[1]!.textFlowReflow!;
    const result = service.reflow(slots, "restricted-current-source");
    service.reflow(slots, "restricted-current-source");
    expect(sourceSpy).toHaveBeenCalledTimes(2);
    expect(trace).toHaveBeenCalledTimes(traceBeforeConsume);
    const fresh = collectQuireProseMirrorBlockInputs({ ...currentOptions, blockShapeCache: undefined });
    expect(result).toEqual(fresh[1]!.textFlowReflow!.reflow(slots, "restricted-current-source"));
    expect(result.textFragments[0]!.range.from).toBe(moved[1]!.range.from + 1);
    expect(result.textFragments[0]!.id).toContain(moved[1]!.id);
    expect(first[1]!.range.from + 4).toBe(moved[1]!.range.from);
    editor.destroy();
  });
});
