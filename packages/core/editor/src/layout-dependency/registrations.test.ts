import { afterEach, describe, expect, it } from "vitest";
import { createEditor, type QuireEditor } from "../Editor";
import { Extension } from "../extension";
import { selectionPreset } from "../selection-adapter/presets";
import type { QuireLayoutProviderRegistration } from "../layout-provider/types";
import type { QuireSelectionContribution } from "../selection-adapter/types";
import { readQuireEditorLayoutAuthority } from "./authority";

const editors: QuireEditor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("registered layout dependencies", () => {
  it("rejects unknown layout providers and admits an explicit registration declaration", () => {
    const provider = { layout: () => ({}) };
    const registration = { id: "example", nodeTypes: ["paragraph"], capabilities: [], provider };
    const unknown = fixture([registration]);
    expect(readQuireEditorLayoutAuthority(unknown, unknown.state).known).toBe(false);
    const declared = fixture([{ ...registration, layoutDependency: { kind: "document" } }]);
    const first = tokens(declared);
    declared.commands.setTextSelection(3);
    expect(tokens(declared)).toEqual(first);
    expect(first).toContain(provider);
    expect(first).toContain(provider.layout);
  });

  it("observes explicit provider versions and actual callback replacement", () => {
    let revision = 0;
    const provider = { layout: () => ({}) };
    const editor = fixture([{
      id: "versioned", nodeTypes: ["paragraph"], capabilities: [], provider,
      layoutDependency: { kind: "document", getVersion: () => revision }
    }]);
    const first = tokens(editor);
    revision += 1;
    const second = tokens(editor);
    expect(second).not.toEqual(first);
    provider.layout = () => ({});
    expect(tokens(editor).some((token, index) => !Object.is(token, second[index]))).toBe(true);
  });

  it("invalidates changed provider region metadata even when the payload identity stays the same", () => {
    const provider = {
      id: "region", nodeTypes: ["paragraph"], capabilities: ["child-flow"],
      regionContract: {
        rootKind: "block-container", regionKind: "block-container",
        capabilities: { editable: true }, selectionPolicy: "delegate-to-text"
      },
      layout: () => ({})
    };
    const editor = fixture([{
      id: "region", nodeTypes: ["paragraph"], capabilities: ["child-flow"], provider,
      layoutDependency: { kind: "document" }
    }]);
    const first = tokens(editor);
    provider.regionContract.capabilities.editable = false;
    expect(tokens(editor).some((token, index) => !Object.is(token, first[index]))).toBe(true);
    const second = tokens(editor);
    provider.nodeTypes[0] = "other";
    expect(tokens(editor).some((token, index) => !Object.is(token, second[index]))).toBe(true);
  });

  it("invalidates changed adapter crossing policy with a retained compiler", () => {
    const contribution = selectionPreset.atomicBlock({ id: "owner", nodeTypes: ["paragraph"] });
    const adapter = { ...contribution.adapter, modes: { ...contribution.adapter.modes } };
    const editor = fixture([], [{ ...contribution, adapter }]);
    const first = tokens(editor);
    adapter.modes.entry = "delegate";
    expect(tokens(editor).some((token, index) => !Object.is(token, first[index]))).toBe(true);
  });

  it("captures non-enumerable metadata consumed through normal property access", () => {
    const provider = Object.defineProperty({}, "layout", {
      value: () => ({}), configurable: true
    });
    const editor = fixture([{
      id: "hidden", nodeTypes: ["paragraph"], capabilities: [], provider,
      layoutDependency: { kind: "document" }
    }]);
    const first = tokens(editor);
    Object.defineProperty(provider, "layout", { value: () => ({}) });
    expect(tokens(editor).some((value, index) => !Object.is(value, first[index]))).toBe(true);
  });

  it("retains registration identity and prevents an empty replacement from inheriting its proof", () => {
    const editor = fixture([{
      id: "example", nodeTypes: ["paragraph"], capabilities: [],
      provider: { layout: () => ({}) }, layoutDependency: { kind: "document" }
    }]);
    const first = tokens(editor);
    const replacement = fixture([]);
    expect(tokens(replacement)).not.toEqual(first);
  });

  it("only gives fixed Core presets a document dependency by default", () => {
    for (const contribution of [
      selectionPreset.inline({ id: "inline", nodeTypes: ["paragraph"] }),
      selectionPreset.atomicBlock({ id: "atomic", nodeTypes: ["paragraph"] }),
      selectionPreset.skip({ id: "skip", nodeTypes: ["paragraph"] })
    ]) {
      const editor = fixture([], [contribution]);
      expect(readQuireEditorLayoutAuthority(editor, editor.state).known).toBe(true);
    }
    const editor = fixture([], [selectionPreset.semanticUnits({
      id: "dynamic", nodeTypes: ["paragraph"], compileUnits: () => []
    })]);
    expect(readQuireEditorLayoutAuthority(editor, editor.state).known).toBe(false);
  });

  it("forwards an explicit semantic compiler dependency without invoking the compiler", () => {
    let calls = 0;
    let revision = 0;
    const contribution = selectionPreset.semanticUnits({
      id: "versioned", nodeTypes: ["paragraph"],
      compileUnits: () => { calls += 1; return []; },
      layoutDependency: { kind: "document", getVersion: () => revision }
    });
    const editor = fixture([], [contribution]);
    const first = tokens(editor);
    editor.commands.setTextSelection(3);
    expect(tokens(editor)).toEqual(first);
    revision += 1;
    expect(tokens(editor).some((token, index) => !Object.is(token, first[index]))).toBe(true);
    expect(calls).toBe(0);
  });
});

/**
 * @param layouts - Layout registrations.
 * @param selections - Semantic selection registrations.
 * @returns Owned test editor.
 */
function fixture(
  layouts: readonly QuireLayoutProviderRegistration[],
  selections: readonly QuireSelectionContribution[] = []
): QuireEditor {
  const editor = createEditor({
    extensions: [Extension.create({
      name: "contributions",
      addLayoutProviders: () => layouts,
      addSelection: () => selections
    })],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "body" }] }] }
  });
  editors.push(editor);
  return editor;
}

/** @param editor - Current authority owner. @returns Admitted comparison tokens. */
function tokens(editor: QuireEditor): readonly unknown[] {
  const snapshot = readQuireEditorLayoutAuthority(editor, editor.state);
  expect(snapshot.known).toBe(true);
  if (!snapshot.known) throw new Error(snapshot.reason);
  return snapshot.tokens;
}
