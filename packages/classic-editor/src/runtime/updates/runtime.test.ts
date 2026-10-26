import {
  Extension,
  type CommandProps,
  type QuireEditor
} from "@quirekit/core";
import type { Plugin } from "@quirekit/pm";
import { createTheme } from "@quirekit/ui";
import { StarterKit } from "@quirekit/starter-kit";
import { Formatting, readFormatPainterState } from "@quirekit/extensions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassicEditorImportContext, ClassicEditorOptions, ClassicEditorRenderContext } from "../../types";
import type { CreateClassicEditorDocumentFontReadinessOptions } from "../document-fonts/types";
import type { MountClassicEditorResourcesOptions } from "../mount";

const observations = vi.hoisted(() => ({
  project: vi.fn(),
  fontCreate: vi.fn(),
  fontUpdate: vi.fn(),
  sequence: [] as string[]
}));

vi.mock("../document-fonts", () => ({
  gateClassicEditorFirstPaint: () => () => undefined,
  createClassicEditorDocumentFontReadiness: (options: CreateClassicEditorDocumentFontReadinessOptions) => {
    observations.fontCreate(options);
    return {
      status: { requestedFamily: null, renderedFamily: null, status: "unresolved", source: null },
      update: observations.fontUpdate,
      destroy: () => undefined
    };
  }
}));

vi.mock("../mount", async () => {
  const { QuireEditor } = await import("@quirekit/core");
  return {
    /** @param options - Runtime mount inputs. @returns Real Core with an observed Shell. */
    mountClassicEditorResources(options: MountClassicEditorResourcesOptions) {
      const editor = new QuireEditor({
        content: options.document,
        extensions: [StarterKit, ...options.resolved.extensions]
      });
      editor.on("update", options.onEditorUpdate);
      editor.on("selectionUpdate", options.onEditorSelectionUpdate);
      editor.on("transaction", options.onEditorTransaction);
      editor.on("focus", options.onEditorUpdate);
      editor.on("blur", options.onEditorUpdate);
      return {
        editor,
        shell: {
          root: options.element,
          workspaceViewport: { scrollTo: vi.fn() },
          /** @param context - Current product projection inputs. */
          update(context: ClassicEditorRenderContext) {
            observations.sequence.push("shell");
            observations.project(context.editor.state.pm, context.editor.isFocused);
          }
        }
      };
    },
    /** @param resources - Mounted Core owner. @returns Its final canonical JSON. */
    releaseClassicEditorResources({ editor }: { readonly editor: QuireEditor }) {
      const document = editor.getJSON();
      editor.destroy();
      return document;
    }
  };
});

import { ClassicEditorRuntime } from "../runtime";
import { classicEditorBuiltinPlugin } from "../../preset/builtin/plugin";

/**
 * Mounts real Core transactions with an observed product projection boundary.
 *
 * @param options - Optional extensions or product hooks under test.
 * @returns Mounted Classic instance with its initial caret inside ordinary prose.
 */
function createRuntime(options: Partial<ClassicEditorOptions> = {}): ClassicEditorRuntime {
  const runtime = new ClassicEditorRuntime({
    document: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Prose" }] }] },
    preset: { id: "update-fixture", features: {}, resolveExtensions: () => [] },
    ...options
  });
  runtime.mount({ ownerDocument: {}, style: { setProperty: vi.fn() } } as unknown as HTMLElement);
  runtime.editor!.commands.setTextSelection(2);
  observations.project.mockClear();
  observations.fontUpdate.mockClear();
  observations.sequence.length = 0;
  return runtime;
}

describe("Classic synchronous input projections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observations.sequence.length = 0;
  });

  it("projects each typed state once after Core update hooks without serializing it", () => {
    const extension = Extension.create({
      name: "projection-observer",
      onUpdate() { observations.sequence.push("core-hook"); }
    });
    const runtime = createRuntime({ extensions: [extension] });
    const editor = runtime.editor!;
    const serialize = vi.spyOn(editor, "getJSON");
    editor.on("selectionUpdate", () => observations.sequence.push("selection"));
    editor.on("update", () => observations.sequence.push("update"));

    editor.commands.insertContent("x");

    expect(observations.sequence).toEqual(["selection", "core-hook", "shell", "update"]);
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    expect(serialize).not.toHaveBeenCalled();
    expect(editor.state.doc.textContent).toBe("Pxrose");
    expect(observations.fontUpdate).toHaveBeenCalledExactlyOnceWith(editor.state.doc);
    runtime.destroy();
  });

  it("keeps every rapid input synchronous and serializes the latest document only on demand", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    const serialize = vi.spyOn(editor, "getJSON");
    for (const character of "abcdefghijkl") {
      editor.commands.insertContent(character);
      expect(observations.project.mock.lastCall?.[0]).toBe(editor.state.pm);
    }
    expect(observations.project).toHaveBeenCalledTimes(12);
    expect(serialize).not.toHaveBeenCalled();
    const expected = editor.state.doc.toJSON();
    expect(runtime.getJSON()).toEqual(expected);
    expect(serialize).toHaveBeenCalledOnce();
    serialize.mockClear();
    runtime.unmount();
    expect(serialize).toHaveBeenCalledOnce();
    expect(runtime.getJSON()).toEqual(expected);
    runtime.mount({ ownerDocument: {} } as HTMLElement);
    expect(runtime.getJSON()).toEqual(expected);
    runtime.destroy();
  });

  it("keeps the same Core, selection and history for a locale update without serializing", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    editor.commands.insertContent("x");
    const serialize = vi.spyOn(editor, "getJSON");
    runtime.update({ locale: "en" });
    expect(serialize).not.toHaveBeenCalled();
    expect(runtime.editor).toBe(editor);
    expect(runtime.editor!.state.doc.textContent).toBe("Pxrose");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("Prose");
    runtime.destroy();
  });

  it("keeps listeners, storage and history through editability and supported theme updates", () => {
    const presentation = vi.fn();
    const runtime = createRuntime({
      preset: { id: "presentation", features: {}, resolveExtensions: () => [], updatePresentation: presentation },
      extensions: [Extension.create({ name: "session-storage", addStorage: () => ({ retained: true }) })]
    });
    const editor = runtime.editor!;
    const storage = editor.storage["session-storage"];
    const update = vi.fn();
    editor.on("update", update);
    editor.commands.insertContent("x");
    const document = editor.state.doc;
    const selection = editor.state.pm.selection;
    const serialize = vi.spyOn(editor, "getJSON");
    runtime.update({ editable: false });
    runtime.update({ editable: true });
    runtime.update({ theme: createTheme({ scheme: "dark" }) });
    expect(editor.isEditable).toBe(true);
    expect(runtime.editor).toBe(editor);
    expect(editor.storage["session-storage"]).toBe(storage);
    expect(editor.state.doc).toBe(document);
    expect(editor.state.pm.selection).toBe(selection);
    expect(serialize).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(presentation).toHaveBeenCalledOnce();
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("Prose");
    runtime.destroy();
  });

  it("still establishes a fresh Core when explicitly opening a different document", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    runtime.update({ document: { type: "doc", content: [{ type: "paragraph" }] } });
    expect(editor.isDestroyed).toBe(true);
    expect(runtime.editor).not.toBe(editor);
    expect(runtime.editor!.state.doc.textContent).toBe("");
    runtime.destroy();
  });

  it("invalidates a preparing import on silent edits, including an edit followed by undo", async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const report = vi.fn();
    const runtime = createRuntime({ plugins: [{ id: "import-fixture", services: [{
      id: "json", label: "JSON", format: { id: "json", extensions: [".json"], mimeTypes: ["application/json"] },
      /** @param context - Instance-owned guarded write. */
      async import(context: ClassicEditorImportContext) {
        await pending;
        context.commit(() => context.editor.commands.insertContent("Stale import"));
        report();
      },
    }] }] });
    runtime.setDocumentName("Keep this name");
    const editor = runtime.editor!;
    const serialize = vi.spyOn(editor, "getJSON");
    const importing = runtime.importDocument("json", { data: "{}", fileName: "obsolete.json" });
    const rejected = expect(importing).rejects.toMatchObject({ name: "AbortError" });
    editor.dispatchTransaction(editor.state.pm.tr.insertText("x").setMeta("preventUpdate", true));
    editor.commands.undo();
    await rejected;
    release();
    await Promise.resolve();
    expect(editor.state.doc.textContent).toBe("Prose");
    expect(runtime.documentName).toBe("Keep this name");
    expect(report).not.toHaveBeenCalled();
    expect(serialize).not.toHaveBeenCalled();
    runtime.destroy();
  });

  it("imports native JSON through the same commit boundary and retains the draft on invalid input", async () => {
    const runtime = createRuntime({ plugins: [classicEditorBuiltinPlugin] });
    await runtime.importDocument("json", { data: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Native JSON" }] }] }), fileName: "native.json" });
    expect(runtime.editor!.state.doc.textContent).toBe("Native JSON");
    expect(runtime.documentName).toBe("native");
    const document = runtime.editor!.state.doc;
    await expect(runtime.importDocument("json", { data: JSON.stringify({ type: "doc", content: [{ type: "unknownNode" }] }), fileName: "invalid.json" })).rejects.toThrow();
    expect(runtime.editor!.state.doc).toBe(document);
    expect(runtime.documentName).toBe("native");
    runtime.destroy();
  });

  it("keeps font readiness and status callbacks synchronous without document serialization", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    const serialize = vi.spyOn(editor, "getJSON");
    const fontOptions = observations.fontCreate.mock.lastCall![0] as CreateClassicEditorDocumentFontReadinessOptions;
    fontOptions.onStatusChange?.();
    fontOptions.onReady();
    expect(observations.project).toHaveBeenCalledTimes(2);
    expect(serialize).not.toHaveBeenCalled();
    runtime.destroy();
  });

  it("refreshes selection-only, explicit UI and focus changes before returning", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    editor.commands.setTextSelection(4);
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.refreshProductUi();
    runtime.ui.setRulerVisible(false);
    expect(observations.project).toHaveBeenCalledTimes(3);
    editor.dispatchTransaction(editor.state.pm.tr.setMeta("focus", { event: {} as FocusEvent }));
    expect(observations.project.mock.lastCall).toEqual([editor.state.pm, true]);
    editor.dispatchTransaction(editor.state.pm.tr.setMeta("blur", { event: {} as FocusEvent }));
    expect(observations.project.mock.lastCall).toEqual([editor.state.pm, false]);
    expect(observations.project).toHaveBeenCalledTimes(5);
    runtime.destroy();
  });

  it("refreshes selection immediately when preventUpdate suppresses the later event", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    const update = vi.fn();
    editor.on("update", update);
    editor.dispatchTransaction(editor.state.pm.tr.insertText("x").setMeta("preventUpdate", true));
    expect(update).not.toHaveBeenCalled();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.destroy();
  });

  it("refreshes an equal-document replacement whose selection changes without update", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    const update = vi.fn();
    editor.on("update", update);
    const transaction = vi.fn();
    editor.on("transaction", transaction);
    editor.chain().command(({ tr }: CommandProps) => {
      tr.replaceWith(0, editor.state.doc.content.size, editor.state.doc.content);
      return true;
    }).setTextSelection(4).run();
    expect(transaction.mock.lastCall?.[0].transaction.docChanged).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.destroy();
  });

  it("coalesces an appended document change after a selection-only root transaction", () => {
    const extension = Extension.create({
      name: "append-input",
      addProseMirrorPlugins() {
        // Only the PM append contract is needed by this state-only fixture.
        return [{
          key: "classic-append-input-fixture",
          props: {},
          spec: {
            appendTransaction(transactions, _previous, state) {
              return transactions.some(transaction => transaction.getMeta("append-input"))
                ? state.tr.insertText("x") : null;
            }
          }
        } as Plugin];
      }
    });
    const runtime = createRuntime({ extensions: [extension] });
    const editor = runtime.editor!;
    const transaction = vi.fn();
    editor.on("transaction", transaction);
    editor.chain().setTextSelection(4).command(({ tr }: CommandProps) => {
      tr.setMeta("append-input", true);
      return true;
    }).run();
    expect(transaction.mock.lastCall?.[0].transaction.docChanged).toBe(false);
    expect(editor.state.doc.textContent).toBe("Proxse");
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.destroy();
  });

  it("refreshes update-only changes that leave the caret unchanged", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    const selection = vi.fn();
    editor.on("selectionUpdate", selection);
    editor.dispatchTransaction(editor.state.pm.tr.insertText("x", 5));
    expect(selection).not.toHaveBeenCalled();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.destroy();
  });

  it("refreshes exactly once for metadata-only painter state and ignores unrelated metadata", () => {
    const runtime = createRuntime({ extensions: [Formatting] });
    const editor = runtime.editor!;

    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(readFormatPainterState(editor.state).mode).toBe("once");
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(
      editor.state.pm,
      false
    );

    editor.dispatchTransaction(editor.state.pm.tr.setMeta("unrelated", true));
    expect(observations.project).toHaveBeenCalledTimes(1);

    expect(editor.commands.cancelFormatPainter()).toBe(true);
    expect(readFormatPainterState(editor.state).mode).toBe("off");
    expect(observations.project).toHaveBeenCalledTimes(2);
    runtime.destroy();
  });

  it("projects stored marks once without document serialization or font work", () => {
    const runtime = createRuntime();
    const editor = runtime.editor!;
    const serialize = vi.spyOn(editor, "getJSON");
    const before = editor.state.doc;
    expect(editor.commands.toggleBold()).toBe(true);
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    expect(editor.state.doc).toBe(before);
    expect(serialize).not.toHaveBeenCalled();
    expect(observations.fontUpdate).not.toHaveBeenCalled();
    observations.project.mockClear();
    editor.commands.setBold();
    editor.dispatchTransaction(editor.state.pm.tr.setMeta("unrelated", true));
    expect(observations.project).not.toHaveBeenCalled();
    editor.commands.unsetBold();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    observations.project.mockClear();
    editor.chain().setTextSelection(editor.state.pm.selection.from).toggleBold().run();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    observations.project.mockClear();
    editor.chain().setTextSelection(3).toggleBold().run();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    observations.project.mockClear();
    editor.chain().toggleBold().insertContent("x").run();
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.destroy();
  });

  it("projects appended stored marks and explicit clears of inherited formatting", () => {
    const extension = Extension.create({
      name: "append-caret-format",
      addProseMirrorPlugins() {
        return [{ key: "append-caret-format", props: {}, spec: {
          appendTransaction(transactions, _previous, state) {
            return transactions.some(transaction => transaction.getMeta("caret-format"))
              ? state.tr.addStoredMark(state.schema.marks.bold!.create()) : null;
          }
        } } as Plugin];
      }
    });
    const runtime = createRuntime({ extensions: [extension] });
    const editor = runtime.editor!;
    editor.dispatchTransaction(editor.state.pm.tr.setMeta("caret-format", true));
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    editor.chain().setTextSelection({ from: 1, to: 6 }).setBold().setTextSelection(3).run();
    expect(editor.state.pm.storedMarks).toBeNull();
    expect(editor.isActive("bold")).toBe(true);
    observations.project.mockClear();
    editor.commands.unsetBold();
    expect(editor.isActive("bold")).toBe(false);
    expect(observations.project).toHaveBeenCalledExactlyOnceWith(editor.state.pm, false);
    runtime.destroy();
  });

  it("preserves Shell-before-hook order for every external product update hook", () => {
    const onUpdate = vi.fn(({ editor }: { readonly editor: QuireEditor | undefined }) => {
      expect(observations.project.mock.lastCall?.[0]).toBe(editor!.state.pm);
      observations.sequence.push("product-hook");
    });
    const runtime = createRuntime({
      plugins: [{ id: "product-observer", onUpdate }],
      extensions: [Extension.create({ name: "core-observer", onUpdate() { observations.sequence.push("core-hook"); } })]
    });
    onUpdate.mockClear();
    runtime.editor!.commands.insertContent("x");
    expect(observations.sequence).toEqual(["shell", "product-hook", "core-hook", "shell", "product-hook"]);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    runtime.destroy();
  });

  it("keeps nested product commands observable and leaves the final Shell current", () => {
    let inserted = false;
    const onUpdate = vi.fn(({ editor }: { readonly editor: QuireEditor | undefined }) => {
      expect(observations.project.mock.lastCall?.[0]).toBe(editor!.state.pm);
      if (!inserted && editor!.state.doc.textContent === "Pxrose") {
        inserted = true;
        editor!.commands.insertContent("y");
      }
    });
    const runtime = createRuntime({ plugins: [{ id: "nested-product", onUpdate }] });
    onUpdate.mockClear();
    runtime.editor!.commands.insertContent("x");
    expect(runtime.editor!.state.doc.textContent).toBe("Pxyrose");
    expect(onUpdate).toHaveBeenCalledTimes(4);
    expect(observations.project).toHaveBeenCalledTimes(4);
    expect(observations.project.mock.lastCall?.[0]).toBe(runtime.editor!.state.pm);
    runtime.destroy();
  });

  it("projects after reentrant Core updates without retaining a superseded state", () => {
    let inserted = false;
    const extension = Extension.create({
      name: "nested-core",
      onUpdate({ editor }) {
        if (!inserted && editor.state.doc.textContent === "Pxrose") {
          inserted = true;
          editor.commands.insertContent("y");
        }
      }
    });
    const runtime = createRuntime({ extensions: [extension] });
    runtime.editor!.commands.insertContent("x");
    expect(runtime.editor!.state.doc.textContent).toBe("Pxyrose");
    expect(observations.project).toHaveBeenCalledTimes(2);
    expect(observations.project.mock.calls.every(([state]) => state === runtime.editor!.state.pm)).toBe(true);
    runtime.destroy();
  });
});
