import {
  Extension, Mark, declareQuireLayoutDependency, setQuireTransactionRenderImpact,
  type QuireAnyExtension
} from "@quirekit/core";
import { Decoration, DecorationSet, Plugin, PluginKey, type EditorState } from "@quirekit/pm";
import { afterEach, describe, expect, it } from "vitest";
import { baseOptions, createFixtureEditor, setSelection } from "../../test-support/frame-layout-reuse";
import { deriveQuireViewUpdatePatch } from "../invalidation";
import { createQuireViewEngineRuntime } from "./runtime";

const editors: ReturnType<typeof createFixtureEditor>[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("presentation metadata and retained geometry", () => {
  it("reuses geometry while refreshing real plugin decorations, selection and complete paint", () => {
    const key = new PluginKey<boolean>("presentation-test");
    const editor = fixture([Extension.create({
      name: "presentation-test",
      addProseMirrorPlugins: () => [new Plugin({
        key, state: {
          init: () => false,
          apply: (tr, previous) => tr.getMeta(key) ?? previous
        },
        props: { decorations: (state: EditorState) => DecorationSet.create(state.doc, [
          Decoration.inline(1, 4, {
            style: `background-color: ${key.getState(state) ? "#ff0000" : "#0000ff"}`
          })
        ]) }
      })]
    })]);
    setSelection(editor, 2, 5);
    const runtime = createQuireViewEngineRuntime({ editor });
    const phases: string[] = [];
    const options = { ...baseOptions, decorationSourceView: editor.view,
      trace: (phase: { readonly name: string }) => phases.push(phase.name)
    };
    const initial = runtime.buildFrame(options);
    for (const hovered of [true, false, true]) {
      const tr = setQuireTransactionRenderImpact(editor.state.pm.tr.setMeta(key, hovered), {
        kind: "presentation-only"
      });
      editor.dispatchTransaction(tr);
      phases.length = 0;
      const next = runtime.buildFrame({
        ...options, updatePatch: deriveQuireViewUpdatePatch({ reason: "transaction", transactions: [tr] })
      });
      expect(phases).not.toContain("layout:collect");
      expect(phases).not.toContain("layout:paginate");
      expect(phases).toContain("layout:adapt");
      expect(next.layoutSnapshot.state).toBe(editor.state);
      expect(next.selectionGeometry).toEqual(initial.selectionGeometry);
      expect(next.decorationLane.backgrounds.length).toBeGreaterThan(0);
      if (hovered) expect(next.decorationLane.backgrounds).not.toEqual(initial.decorationLane.backgrounds);
      else expect(next.decorationLane.backgrounds).toEqual(initial.decorationLane.backgrounds);
      // An independent fresh runtime must produce exactly the same current paint.
      const oracle = createQuireViewEngineRuntime({ editor }).buildFrame(options);
      expect(next.contentDisplayList).toEqual(oracle.contentDisplayList);
      expect(next.overlayDisplayList).toEqual(oracle.overlayDisplayList);
      expect(next.viewTargets).toEqual(oracle.viewTargets);
      expect(next.decorationLane).toEqual(oracle.decorationLane);
      expect(next.selectionGeometry).toEqual(oracle.selectionGeometry);
    }
  });

  it("rejects unknown providers even when the feature declares presentation-only", () => {
    const editor = fixture([Extension.create({
      name: "unknown-layout",
      addLayoutProviders: () => [{
        id: "unknown-layout", nodeTypes: ["unused"], capabilities: [],
        provider: {
          id: "unknown-layout", nodeTypes: ["unused"], capabilities: [],
          regionContract: {
            rootKind: "block-container", regionKind: "block-container",
            capabilities: { editable: true }, selectionPolicy: "delegate-to-text"
          },
          layout: () => ({})
        }
      }]
    })]);
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    const frame = runtime.buildFrame({ ...baseOptions, updatePatch: presentation(editor) });
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 0 });
    expect(frame.cacheCounters!.layoutProduct.fallbackReason).toContain("unknown-layout-provider");
  });

  it("checks current dependency versions and geometry inputs after presentation declarations", () => {
    let revision = 0;
    const editor = fixture([Mark.create({
      name: "versioned-style",
      canvasStyle: declareQuireLayoutDependency(() => ({ color: "#123456" }), {
        kind: "document", getVersion: () => revision
      })
    })]);
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    expect(runtime.buildFrame({ ...baseOptions, updatePatch: presentation(editor) })
      .cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 1 });
    revision += 1;
    expect(runtime.buildFrame({ ...baseOptions, updatePatch: presentation(editor) })
      .cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 1, fallbackReason: "layout-authority" });
    expect(runtime.buildFrame({ ...baseOptions, widows: 3, updatePatch: presentation(editor) })
      .cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 3, reused: 1, fallbackReason: "layout-inputs" });
  });
});

/**
 * Creates an editor owned by this suite.
 * @param extensions - Feature callbacks under test.
 * @returns Fixture editor released after the test.
 */
function fixture(extensions: QuireAnyExtension[] = []) {
  const editor = createFixtureEditor(1, extensions);
  editors.push(editor);
  return editor;
}

/**
 * Dispatches an explicitly owned presentation transaction and derives its patch.
 * @param editor - Current source editor.
 * @returns Invalidation evidence for the exact accepted transaction.
 */
function presentation(editor: ReturnType<typeof createFixtureEditor>) {
  const tr = setQuireTransactionRenderImpact(editor.state.pm.tr.setMeta("feature", true), {
    kind: "presentation-only"
  });
  editor.dispatchTransaction(tr);
  return deriveQuireViewUpdatePatch({ reason: "transaction", transactions: [tr] });
}
