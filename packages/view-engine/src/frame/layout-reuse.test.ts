import { Mark } from "@quirekit/core";
import { Decoration, DecorationSet } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { deriveQuireViewUpdatePatch } from "../invalidation";
import { createQuireViewEngineRuntime } from "./runtime";
import type { QuireViewEngineFrameBuildOptions } from "./types";
import { baseOptions, createFixtureEditor, selectionPatch, setSelection } from "../../test-support/frame-layout-reuse";

describe("accepted layout product reuse", () => {
  it("reuses geometry through twenty selection updates while compiling current decoration paint", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    const phases: string[] = [];
    let providerCalls = 0;
    const options: QuireViewEngineFrameBuildOptions = {
      ...baseOptions,
      trace: (phase) => phases.push(phase.name),
      decorationSourceView: {
        get state() { return editor.state.pm; },
        someProp(name, callback) {
          if (name === "decorations" && callback !== undefined) {
            callback((state: typeof editor.state.pm) => {
              providerCalls += 1;
              return state.selection.empty ? DecorationSet.empty : DecorationSet.create(
                state.doc,
                [Decoration.inline(1, 4, { "data-qk-decoration-text-paint": "suppress" })]
              );
            });
          }
          return undefined;
        }
      }
    };
    const initial = runtime.buildFrame(options);
    phases.length = 0;

    for (let index = 0; index < 20; index += 1) {
      const expanded = index % 2 === 0;
      setSelection(editor, 1, expanded ? 4 : 1);
      const frame = runtime.buildFrame({ ...options, updatePatch: selectionPatch() });
      expect(frame.layoutSnapshot.state).toBe(editor.state);
      expect(frame.layoutSnapshot.root).not.toBe(initial.layoutSnapshot.root);
      expect(frame.decorationLane.textStyles.some((span) => span.suppressTextPaint))
        .toBe(expanded);
      expect(frame.cacheCounters!.layoutProduct).toMatchObject({ reused: index + 1, fallbackReason: null });
    }

    expect(providerCalls).toBe(21);
    expect(phases.filter((phase) => phase === "layout:collect")).toEqual([]);
    expect(phases.filter((phase) => phase === "layout:paginate")).toEqual([]);
    expect(phases.filter((phase) => phase === "layout:adapt")).toHaveLength(20);
    expect(phases.filter((phase) => phase === "render:display-list")).toHaveLength(20);
  });

  it.each(["font-epoch", "image-epoch", "resize", "manual", "fill", "composition"])(
    "rebuilds for %s even when document identity is unchanged",
    (reason) => {
      const editor = createFixtureEditor();
      const runtime = createQuireViewEngineRuntime({ editor });
      runtime.buildFrame(baseOptions);
      const frame = runtime.buildFrame({
        ...baseOptions,
        updatePatch: deriveQuireViewUpdatePatch({ reason })
      });
      expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 0 });
    }
  );

  it("captures page geometry values instead of retaining a mutable comparison reference", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    const pageGeometry = {
      pageRect: { x: 0, y: 0, width: 320, height: 240 },
      bodyRect: { x: 20, y: 20, width: 280, height: 200 },
      bodyRectVariants: { even: { x: 30, y: 20, width: 260, height: 200 } }
    };
    const options = { ...baseOptions, pageGeometry };
    runtime.buildFrame(options);
    pageGeometry.bodyRectVariants.even.width = 240;
    setSelection(editor, 2);
    const frame = runtime.buildFrame({ ...options, updatePatch: selectionPatch() });
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 0 });
  });

  it.each([false, true])("materializes an estimated selection head in reverse=%s ranges", (reverse) => {
    const editor = createFixtureEditor(3);
    const runtime = createQuireViewEngineRuntime({ editor });
    const secondStart = editor.state.doc.child(0).nodeSize + 1;
    setSelection(editor, reverse ? secondStart : 1);
    const options = { ...baseOptions, maxBlocks: reverse ? 0 : 1 };
    runtime.buildFrame(options);
    setSelection(editor, reverse ? secondStart : 1, reverse ? 1 : secondStart);
    const frame = runtime.buildFrame({ ...options, updatePatch: selectionPatch() });
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 0 });
    expect(frame.selectionGeometry.ranges.length).toBeGreaterThan(0);
  });

  it.each(["selection", "image-paint"])("rejects unknown style callbacks during %s", (reason) => {
    const editor = createFixtureEditor(1, [Mark.create({
      name: "unproven",
      canvasStyle: () => ({ fontWeight: "bold" })
    })]);
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    setSelection(editor, 2);
    const frame = runtime.buildFrame({ ...baseOptions, updatePatch: deriveQuireViewUpdatePatch({ reason }) });
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 0 });
  });

  it("does not publish a layout candidate when a later decoration callback fails", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    const changedOptions = { ...baseOptions, widows: 2, updatePatch: selectionPatch() };
    expect(() => runtime.buildFrame({
      ...changedOptions,
      decorationSourceView: {
        get state() { return editor.state.pm; },
        someProp() {
          throw new Error("decoration failure");
        }
      }
    })).toThrow("decoration failure");
    const frame = runtime.buildFrame(changedOptions);
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 3, reused: 0 });
  });
});
