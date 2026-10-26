import { afterEach, expect, it, vi } from "vitest";
import { Extension } from "@quirekit/core";
import { prepareEditorBlockMenu, registerEditorBlockMenuProvider, type EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { createBlockEditor, type BlockEditorInstance } from "../../index";

const instances: BlockEditorInstance[] = [];
/** @param extensions - Test contributions. @returns A real canonical editor with two independent paragraphs. */
function setup(extensions: readonly Extension[] = []) {
  const instance = createBlockEditor({ extensions, content: { type: "doc", content: ["Alpha", "Beta"].map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) } });
  instances.push(instance); return instance.editor;
}
afterEach(() => instances.splice(0).forEach(instance => instance.destroy()));

it("collects inherited extension contributions once, projects only at open and preserves the captured target", () => {
  const build = vi.fn(() => [provider]), project = vi.fn(({ editor }: Parameters<EditorBlockMenuProvider["getItems"]>[0]) => [
    { value: "heading", label: "标题", run: () => editor.chain().closeHistory().setHeading({ level: 2 }).run() }
  ]);
  const provider: EditorBlockMenuProvider = { id: "third-party", getItems: project };
  const base = Extension.create({ name: "testBlockMenu", addBlockMenuProviders: build });
  const editor = setup([base.extend({})]);
  const before = editor.getJSON(), menu = prepareEditorBlockMenu(editor, 0)!;
  expect(editor.getJSON()).toEqual(before);
  editor.commands.setTextSelection(9);
  expect(menu.execute("third-party/heading")).toBe(true);
  expect(editor.state.doc.child(0).type.name).toBe("heading");
  expect(editor.state.doc.child(1).type.name).toBe("paragraph");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
  prepareEditorBlockMenu(editor, 7);
  expect(build).toHaveBeenCalledTimes(1); expect(project).toHaveBeenCalledTimes(2);
});

it("rejects stale, closed, readonly and unregistered actions and rechecks live availability", () => {
  const editor = setup(), run = vi.fn(() => true);
  let enabled = true;
  const release = registerEditorBlockMenuProvider(editor, { id: "mounted", getItems: () => [{ value: "run", label: "操作", isEnabled: () => enabled, run }] });
  const menu = prepareEditorBlockMenu(editor, 0)!;
  enabled = false; expect(menu.execute("mounted/run")).toBe(false);
  enabled = true; editor.setEditable(false); expect(menu.execute("mounted/run")).toBe(false);
  editor.setEditable(true); release(); expect(menu.execute("mounted/run")).toBe(false);
  const releaseAgain = registerEditorBlockMenuProvider(editor, { id: "mounted", getItems: () => [{ value: "run", label: "操作", run }] });
  expect(menu.execute("mounted/run")).toBe(false);
  const fresh = prepareEditorBlockMenu(editor, 0)!;
  editor.commands.insertContent("changed"); expect(fresh.execute("mounted/run")).toBe(false);
  const closed = prepareEditorBlockMenu(editor, 0)!; closed.dispose(); expect(closed.execute("mounted/run")).toBe(false);
  expect(run).not.toHaveBeenCalled(); releaseAgain();
});

it("filters by the canonical block and isolates action IDs without permitting duplicates", () => {
  const editor = setup();
  const release = registerEditorBlockMenuProvider(editor, { id: "custom", getItems: ({ block }) => block.node.textContent === "Alpha" ? [{ value: "same", label: "Alpha", run: () => true }] : [] });
  expect(prepareEditorBlockMenu(editor, 7)!.items.some(item => item.value === "custom/same")).toBe(false);
  expect(() => registerEditorBlockMenuProvider(editor, { id: "custom", getItems: () => [] })).toThrow(/duplicate/i);
  release();
  registerEditorBlockMenuProvider(editor, { id: "duplicate", getItems: () => [{ value: "same", label: "one" }, { value: "same", label: "two" }] });
  expect(() => prepareEditorBlockMenu(editor, 0)).toThrow(/duplicate/i);
});

it("scopes radio values and carries ancestor availability through nested menus", () => {
  const editor = setup(), run = vi.fn(() => true);
  registerEditorBlockMenuProvider(editor, { id: "choices", getItems: () => [
    { value: "group", label: "选择", kind: "radio-group", selectedValue: "one", children: [{ value: "one", label: "一", run }] },
    { value: "parent", label: "不可用", kind: "submenu", disabled: true, children: [{ value: "child", label: "子操作", run }] }
  ] });
  const menu = prepareEditorBlockMenu(editor, 0)!;
  expect(menu.items.find(item => item.value === "choices/group")?.selectedValue).toBe("choices/one");
  expect(menu.execute("choices/child")).toBe(false);
  expect(run).not.toHaveBeenCalled();
  expect(menu.execute("choices/one")).toBe(true);
});
