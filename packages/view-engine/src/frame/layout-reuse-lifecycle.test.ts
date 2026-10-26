import { declareQuireLayoutDependency, Mark } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { baselineQuireLineBreakerPolicy } from "@quirekit/layout/inline";
import { canReuseQuireViewEngineLayoutSnapshot } from "./layout";
import { createQuireViewEngineRuntime } from "./runtime";
import { baseOptions, createFixtureEditor, selectionPatch, setSelection } from "../../test-support/frame-layout-reuse";

describe("layout product lifecycle and resources", () => {
  it.each(["state", "accepted frame", "failed frame", "projection window"])(
    "rejects overlay proof when a dependency getter replaces the %s",
    (replacement) => {
      let readEffect: (() => void) | undefined;
      const editor = createFixtureEditor(1, [Mark.create({
        name: "versioned-style",
        canvasStyle: declareQuireLayoutDependency(() => ({ fontWeight: "bold" }), {
          kind: "document",
          getVersion() {
            const effect = readEffect;
            readEffect = undefined;
            effect?.();
            return 1;
          }
        })
      })]);
      const runtime = createQuireViewEngineRuntime({ editor });
      const options = { ...baseOptions, layoutSnapshotClipRects: [{ ...baseOptions.viewportRect }] };
      const initial = runtime.buildFrame(options);
      setSelection(editor, 2);
      readEffect = () => {
        if (replacement === "state") {
          setSelection(editor, 3);
        } else if (replacement === "projection window") {
          options.layoutSnapshotClipRects[0]!.y += 100;
        } else if (replacement === "accepted frame") {
          runtime.buildFrame({ ...baseOptions, widows: 2 });
        } else {
          expect(() => runtime.buildFrame({
            ...baseOptions, widows: 2,
            decorationSourceView: {
              get state() { return editor.state.pm; },
              someProp() { throw new Error("nested failure"); }
            }
          })).toThrow("nested failure");
        }
      };
      expect(canReuseQuireViewEngineLayoutSnapshot({
        snapshot: initial.layoutSnapshot, state: editor.state,
        options: { ...options, updatePatch: selectionPatch() }
      })).toBe(false);
      expect(editor.state.pm.selection.head).toBe(replacement === "state" ? 3 : 2);
    }
  );

  it("does not let an outer frame replace a newer reentrant candidate", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    const innerOptions = { ...baseOptions, widows: 3, updatePatch: selectionPatch() };
    runtime.buildFrame({
      ...baseOptions,
      widows: 2,
      updatePatch: selectionPatch(),
      decorationSourceView: {
        get state() { return editor.state.pm; },
        someProp() {
          runtime.buildFrame(innerOptions);
          return undefined;
        }
      }
    });
    expect(runtime.buildFrame(innerOptions).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 3, reused: 1, fallbackReason: null });
  });

  it("rejects a successful frame whose current source was superseded during decoration work", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    const options = { ...baseOptions, widows: 2, updatePatch: selectionPatch() };
    runtime.buildFrame({
      ...options,
      decorationSourceView: {
        get state() { return editor.state.pm; },
        someProp() {
          setSelection(editor, 3);
          return undefined;
        }
      }
    });
    expect(runtime.buildFrame(options).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 3, reused: 0 });
  });

  it("keeps accepted and transient lanes separate and never admits IME as a stable selection", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = { ...baseOptions, updatePatch: selectionPatch() };
    runtime.buildFrame(options);
    const preview = runtime.buildTransientFrame({
      ...options,
      imePreedit: { range: { from: 1, to: 1 }, text: "输入" }
    });
    expect(preview.layoutSnapshot.state.doc.textContent).toContain("输入");
    expect(editor.state.doc.textContent).not.toContain("输入");
    const accepted = runtime.buildFrame(options);
    expect(accepted.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 1 });
    expect(runtime.buildTransientFrame(options).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 2, reused: 0 });
  });

  it("captures resource versions before a stable measurer is mutated", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    let version = 0;
    const measurer: QuireTextMeasurer = {
      get version() { return version; },
      measureText: (text) => ({ width: text.length * (8 + version) })
    };
    const options = { ...baseOptions, textMeasurer: measurer, updatePatch: selectionPatch() };
    runtime.buildFrame(options);
    expect(runtime.buildFrame(options).cacheCounters!.layoutProduct.reused).toBe(1);
    version += 1;
    expect(runtime.buildFrame(options).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 2, reused: 1, fallbackReason: "layout-inputs" });
  });

  it.each(["measurer", "line-breaker"] as const)("keeps an unproven custom %s on full layout", (kind) => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = {
      ...baseOptions,
      ...(kind === "measurer"
        ? { textMeasurer: { measureText: (text: string) => ({ width: text.length * 8 }) } }
        : { lineBreaker: { ...baselineQuireLineBreakerPolicy } }),
      updatePatch: selectionPatch()
    };
    runtime.buildFrame(options);
    expect(runtime.buildFrame(options).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 2, reused: 0, fallbackReason: "unversioned-layout-service" });
  });
});
