import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor, Extension, type QuireAnyExtension } from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { createClassicEditorRegistry } from "../../plugin";
import type { ClassicEditorImportExportService, ClassicEditorRenderContext } from "../../types";
import { ClassicDocumentImportController } from "./controller";

const editors: Editor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); });

/** @returns A caller-controlled asynchronous preparation with no timer. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

/** @param read - Service under test. @param extensions - Optional transaction policy. @returns Real Core and an instance-owned import boundary. */
function fixture(read: NonNullable<ClassicEditorImportExportService["import"]>, extensions: readonly QuireAnyExtension[] = []) {
  const editor = new Editor({ extensions: [StarterKit, ...extensions], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original" }] }] } });
  editors.push(editor);
  let current: ClassicEditorRenderContext | undefined = { editor } as ClassicEditorRenderContext;
  let revision = 0;
  let previous = editor.state.doc;
  const controller = new ClassicDocumentImportController({ readContext: () => current, readRevision: () => revision });
  editor.on("transaction", () => {
    if (editor.state.doc !== previous) { previous = editor.state.doc; revision++; controller.cancel(); }
  });
  const registry = createClassicEditorRegistry({ features: {}, plugins: [{ id: "fixture", services: [{
    id: "json", label: "JSON", format: { id: "json", extensions: [".json"], mimeTypes: ["application/json"] }, import: read,
  }] }] });
  return { editor, controller,
    /** @param signal - Optional host cancellation. @returns Whether this operation still owns metadata. */
    open: (signal?: AbortSignal) => controller.run(registry, "json", { data: "", fileName: "opened.json" }, { signal }),
    /** Invalidates the current mounted product context. */
    unmount: () => { current = undefined; controller.cancel(); },
  };
}

/** @param text - Replacement body. @returns Canonical JSON for the same schema. */
function document(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

describe("guarded Classic document imports", () => {
  it("commits once without serializing the live document during preparation", async () => {
    const pending = deferred();
    const ready = fixture(async context => {
      await pending.promise;
      context.commit(() => context.editor.commands.replaceDocument(document("Imported"), { errorOnInvalidContent: true }));
    });
    const serialize = vi.spyOn(ready.editor, "getJSON");
    const opened = ready.open();
    expect(ready.editor.getText()).toBe("Original");
    pending.resolve();
    expect(await opened).toBe(true);
    expect(ready.editor.getText()).toBe("Imported");
    expect(serialize).not.toHaveBeenCalled();
  });

  for (const invalidate of ["edit", "undo", "readonly", "unmount", "destroy", "cancel", "signal"] as const) {
    it(`rejects ${invalidate} before a late command or success report`, async () => {
      const pending = deferred();
      const report = vi.fn();
      const ready = fixture(async context => {
        await pending.promise;
        context.commit(() => context.editor.commands.replaceDocument(document("Late")));
        report();
      });
      const abort = new AbortController();
      const opened = ready.open(abort.signal);
      const rejected = expect(opened).rejects.toMatchObject({ name: "AbortError" });
      if (invalidate === "edit" || invalidate === "undo") ready.editor.commands.insertContent("new");
      if (invalidate === "undo") ready.editor.commands.undo();
      if (invalidate === "readonly") ready.editor.setEditable(false, false);
      if (invalidate === "unmount") ready.unmount();
      if (invalidate === "destroy") ready.editor.destroy();
      if (invalidate === "cancel") ready.controller.cancel();
      if (invalidate === "signal") abort.abort();
      pending.resolve();
      await rejected;
      expect(ready.editor.state.doc.textContent).not.toContain("Late");
      expect(report).not.toHaveBeenCalled();
    });
  }

  it("supersedes the first operation and cannot rename a result after another session wins", async () => {
    const pending = deferred();
    let attempt = 0;
    const ready = fixture(async context => {
      const number = ++attempt;
      if (number === 1) await pending.promise;
      context.commit(() => context.editor.commands.replaceDocument(document(`Result ${number}`)));
    });
    const first = ready.open();
    const rejected = expect(first).rejects.toMatchObject({ name: "AbortError" });
    expect(await ready.open()).toBe(true);
    pending.resolve();
    await rejected;
    expect(ready.editor.getText()).toBe("Result 2");
  });

  it("refuses readonly and pre-cancelled requests before calling a service", async () => {
    const service = vi.fn(async () => {});
    const ready = fixture(service);
    ready.editor.setEditable(false, false);
    await expect(ready.open()).rejects.toThrow("read-only");
    ready.editor.setEditable(true, false);
    const abort = new AbortController(); abort.abort();
    await expect(ready.open(abort.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(service).not.toHaveBeenCalled();
  });

  it("requires an accepted synchronous commit and rejects duplicate commits", async () => {
    const missing = fixture(async () => {});
    await expect(missing.open()).rejects.toThrow("must commit");
    const refused = fixture(async context => context.commit(() => false));
    await expect(refused.open()).rejects.toThrow("not accepted");
    const write = vi.fn();
    const duplicate = fixture(async context => {
      write.mockImplementation(() => context.editor.commands.replaceDocument(document("Once")));
      context.commit(write); context.commit(write);
    });
    await expect(duplicate.open()).rejects.toThrow("only once");
    expect(write).toHaveBeenCalledOnce();
  });

  it("rejects a true command result whose transaction was filtered out", async () => {
    const ready = fixture(async context => context.commit(() => context.editor.commands.replaceDocument(document("Rejected"))), [
      Extension.create({ name: "reject-import", addProseMirrorPlugins: () => [new Plugin({ filterTransaction: () => false })] }),
    ]);
    await expect(ready.open()).rejects.toThrow("not accepted");
    expect(ready.editor.getText()).toBe("Original");
  });

  it("does not cancel an already accepted command while a service finishes its report", async () => {
    const pending = deferred();
    const ready = fixture(async context => {
      context.commit(() => context.editor.commands.replaceDocument(document("Committed")));
      await pending.promise;
    });
    const abort = new AbortController();
    const opened = ready.open(abort.signal);
    abort.abort();
    pending.resolve();
    expect(await opened).toBe(true);
    expect(ready.editor.getText()).toBe("Committed");
  });
});
