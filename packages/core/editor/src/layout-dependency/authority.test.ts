import { afterEach, describe, expect, it, vi } from "vitest";
import { Plugin, PluginKey } from "@quirekit/pm";
import { createEditor, type QuireEditor } from "../Editor";
import { Extension } from "../extension";
import { Mark } from "../Mark";
import { Node } from "../Node";
import type { QuireAnyExtension, QuireEditorState } from "../types";
import { declareQuireLayoutDependency } from "./declaration";
import { readQuireEditorLayoutAuthority } from "./authority";

const editors: QuireEditor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("layout contribution dependency authority", () => {
  it("reuses a declared raw node resolver without executing or comparing its bound copies", () => {
    const resolve = vi.fn(() => ({ fontWeight: "bold" as const }));
    const node = Node.create({
      name: "callout", group: "block", content: "inline*",
      canvasTextStyle: declareQuireLayoutDependency(resolve, { kind: "document" })
    });
    const editor = fixture([node]);
    const first = tokens(editor);
    expect(node.canvasTextStyle?.callout).not.toBe(node.canvasTextStyle?.callout);
    editor.commands.setTextSelection(3);
    expect(tokens(editor)).toEqual(first);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("invalidates the style map key when a current owner is renamed", () => {
    const mark = Mark.create({
      name: "paint",
      canvasStyle: declareQuireLayoutDependency(() => ({ color: "red" }), { kind: "document" })
    });
    const editor = fixture([mark]);
    const first = tokens(editor);
    mark.name = "renamed";
    const next = tokens(editor);
    expect(next.some((value, index) => !Object.is(value, first[index]))).toBe(true);
    expect(Object.keys(mark.canvasStyle ?? {})).toEqual(["renamed"]);
  });

  it("keeps configured inherited proofs and rejects an unannotated override with the same name", () => {
    const mark = Mark.create<{ color: string }>({
      name: "paint", addOptions: () => ({ color: "red" }),
      canvasStyle: declareQuireLayoutDependency(() => ({ color: "red" }), {
        kind: "document",
        getVersion: ({ extension }) => extension?.options.color
      })
    });
    const configured = mark.configure({ color: "blue" });
    const editor = fixture([configured]);
    const first = tokens(editor);
    expect(first).toContain("blue");
    expect(first).toContain(configured);
    const override = mark.extend({ canvasStyle: () => ({ color: "green" }) });
    const other = fixture([override]);
    expect(readQuireEditorLayoutAuthority(other, other.state)).toMatchObject({ known: false });
  });

  it("does not invoke unknown factories while deciding whether layout is reusable", () => {
    const factory = vi.fn(() => ({ paragraph: () => ({ fontWeight: "bold" as const }) }));
    const editor = fixture([Extension.create({
      name: "dynamic", addNodeCanvasTextStyles: factory
    })]);
    factory.mockClear();
    expect(readQuireEditorLayoutAuthority(editor, editor.state)).toMatchObject({ known: false });
    expect(factory).not.toHaveBeenCalled();
  });

  it("does not trust a runtime getter that bypasses an annotated config resolver", () => {
    const mark = Mark.create({
      name: "paint",
      canvasStyle: declareQuireLayoutDependency(() => ({ color: "red" }), { kind: "document" })
    });
    Object.defineProperty(mark, "canvasStyle", {
      get: () => ({ paint: () => ({ color: "blue" }) })
    });
    const editor = fixture([mark]);
    expect(readQuireEditorLayoutAuthority(editor, editor.state)).toMatchObject({ known: false });
  });

  it.each(["non-enumerable", "inherited"])("rejects an unknown %s direct-map resolver", (kind) => {
    const mark = Mark.create({ name: "paint" });
    const hidden = () => ({ color: "red" });
    const map = kind === "inherited"
      ? Object.create({ paint: hidden })
      : Object.defineProperty({}, "paint", { value: hidden });
    Object.defineProperty(mark, "canvasStyle", { value: map });
    const editor = fixture([mark]);
    expect(readQuireEditorLayoutAuthority(editor, editor.state).known).toBe(false);
  });

  it("reads versions from the exact supplied state after PM metadata has been applied", () => {
    const key = new PluginKey<number>("layout-version");
    const versions = vi.fn(({ state }: { state: QuireEditorState }) => key.getState(state.pm));
    const editor = fixture([Extension.create({
      name: "versioned",
      addNodeCanvasTextStyles: declareQuireLayoutDependency(() => ({}), {
        kind: "document", getVersion: versions
      }),
      addProseMirrorPlugins: () => [new Plugin({
        key,
        state: { init: () => 0, apply: (tr, value) => tr.getMeta(key) ?? value }
      })]
    })]);
    const before = tokens(editor);
    const pm = editor.state.pm.apply(editor.state.pm.tr.setMeta(key, 7));
    const current = { ...editor.state, pm, doc: pm.doc };
    const after = readQuireEditorLayoutAuthority(editor, current);
    expect(after.known).toBe(true);
    if (after.known) {
      expect(after.tokens).not.toEqual(before);
      expect(after.tokens).toContain(7);
    }
    expect(versions.mock.calls.at(-1)?.[0].state).toBe(current);
  });

  it("copies bounded version vectors so mutable mapping configuration cannot hide a change", () => {
    const types = ["paragraph"];
    const registry = Object.freeze({ revision: 1 });
    const editor = fixture([Extension.create({
      name: "mapping",
      addNodeCanvasTextStyles: declareQuireLayoutDependency(() => ({}), {
        kind: "document", getVersion: () => [registry, ...types]
      })
    })]);
    const first = tokens(editor);
    expect(tokens(editor)).toEqual(first);
    types.push("callout");
    expect(tokens(editor)).not.toEqual(first);
  });

  it("does not keep a previous proof when the current version getter throws", () => {
    let fail = false;
    const editor = fixture([Extension.create({
      name: "versioned",
      addNodeCanvasTextStyles: declareQuireLayoutDependency(() => ({}), {
        kind: "document", getVersion: () => {
          if (fail) throw new Error("version unavailable");
          return 1;
        }
      })
    })]);
    expect(readQuireEditorLayoutAuthority(editor, editor.state).known).toBe(true);
    fail = true;
    expect(() => readQuireEditorLayoutAuthority(editor, editor.state)).toThrow("version unavailable");
  });

  it("keeps editor and extension ownership isolated", () => {
    const create = () => Extension.create({
      name: "same-name",
      addNodeCanvasTextStyles: declareQuireLayoutDependency(() => ({}), { kind: "document" })
    });
    const left = fixture([create()]);
    const right = fixture([create()]);
    expect(tokens(left)).not.toEqual(tokens(right));
  });
});

/** @param extensions - Extra layout contributions. @returns Owned test editor. */
function fixture(extensions: readonly QuireAnyExtension[]): QuireEditor {
  const editor = createEditor({
    extensions,
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
