// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { createMemoryActivityStore, createMemoryVersionStore } from "@quirekit/edit-history/memory";
import { createMdEditor } from "../editor";
import { getMdVersions, MdActivity } from "./extension";
import { restoreChanges } from "./versions";
import { describeActivity } from "../vue/activity/describe";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

/** @param markdown - Initial source. @param readOnly - Source permission. @returns Editor with memory activity and version stores. */
function fixture(markdown: string, readOnly = false) {
  const store = createMemoryActivityStore(), versions = createMemoryVersionStore(), parent = document.body.appendChild(document.createElement("div"));
  const editor = createMdEditor({ parent, markdown, readOnly, extensions: [MdActivity.configure({ store, versions, documentId: "doc", epoch: "1",
    actor: { id: "u1", name: "小林", trust: "local" }, sessionId: "s1" })] });
  editors.push(editor);
  const view = EditorView.findFromDOM(editor.element)!;
  /** @param text - Full replacement typed by the user. */
  const write = (text: string) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, userEvent: "input.type" });
  return { editor, view, store, versions, write, controller: getMdVersions(editor)! };
}

describe("versions", () => {
  it("rewrites only differing lines", () => {
    expect(restoreChanges("a\nb\nc\n", "a\nB\nc\nd")).toEqual([{ from: 2, to: 4, insert: "B\n" }, { from: 6, to: 6, insert: "d" }]);
  });

  it("saves named versions with an activity event and reuses unchanged automatic ones", async () => {
    const { controller, versions, store } = fixture("# 草稿\n");
    const first = await controller.save(), again = await controller.save();
    expect(again.id).toBe(first.id);
    const named = await controller.save("  提交审核前 ");
    expect(named).toMatchObject({ trigger: "named", name: "提交审核前", actor: { id: "u1" } });
    expect((await versions.list({ documentId: "doc", limit: 10 })).items).toHaveLength(2);
    await Promise.resolve();
    expect(store.snapshot("doc").map(event => [event.kind, event.facts])).toEqual([["version.create", { versionId: named.id, name: "提交审核前" }]]);
  });

  it("restores as one undoable labelled edit, saving the replaced source first", async () => {
    const { editor, controller, versions, view, write, store } = fixture("# 标题\n\n第一段\n\n第二段\n");
    const saved = await controller.save("初稿");
    write("# 标题\n\n第一段改过\n\n第二段\n\n新增段\n");
    const edited = view.state.doc.toString();
    expect(await controller.restore(saved.id)).toEqual({ ok: true, changed: true });
    expect(view.state.doc.toString()).toBe("# 标题\n\n第一段\n\n第二段\n");
    const listed = (await versions.list({ documentId: "doc", limit: 10 })).items;
    expect(listed.map(record => record.trigger)).toEqual(["restore", "auto", "named"]);
    expect((await versions.read(listed[1]!.id))!.content.value).toBe(edited);
    await new Promise(resolve => setTimeout(resolve, 0));
    const restore = store.snapshot("doc").find(event => event.kind === "version.restore");
    expect(restore?.facts).toMatchObject({ versionId: saved.id, name: "初稿" });
    expect(describeActivity(restore!, "zh-CN")).toBe("恢复了版本“初稿”");
    expect(describeActivity(restore!, "en")).toBe("Restored a version “初稿”");
    editor.undo();
    expect(view.state.doc.toString()).toBe(edited);
    expect(await controller.restore(listed[0]!.id)).toEqual({ ok: true, changed: true });
    expect(await controller.restore(listed[0]!.id)).toEqual({ ok: true, changed: false });
  });

  it("refuses unknown versions, other documents and read-only editors", async () => {
    const { controller, versions } = fixture("x\n");
    expect(await controller.restore("nope")).toEqual({ ok: false, reason: "missing" });
    const other = await versions.create({ documentId: "elsewhere", epoch: "1", sequence: 0, trigger: "auto" }, { format: "markdown", value: "y" });
    expect(await controller.restore(other.id)).toEqual({ ok: false, reason: "missing" });
    const locked = fixture("x\n", true), record = await locked.controller.save("v");
    await locked.versions.create({ documentId: "doc", epoch: "1", sequence: 0, trigger: "auto" }, { format: "markdown", value: "z" });
    expect(await locked.controller.restore(record.id)).toEqual({ ok: false, reason: "readonly" });
  });
});
