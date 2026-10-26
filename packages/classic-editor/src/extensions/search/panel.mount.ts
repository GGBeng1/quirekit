// @vitest-environment happy-dom

import { QuireEditor } from "@quirekit/core";
import { getSearchSnapshot } from "@quirekit/extension-search";
import { defaultTheme } from "@quirekit/ui";
import { StarterKit } from "@quirekit/starter-kit";
import { nextTick, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { createClassicEditorUiApp } from "@classic/shell/vue-app";
import { ClassicEditorSearch } from "./extension";
import ClassicSearchPanel from "./panel.vue";
import { getClassicSearchSession } from "./session";
import { installClassicSearchShortcut } from "./shortcut";
import type { ClassicEditorRenderContext } from "@classic/types";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
});

describe("Classic search panel", () => {
  it("commits on Enter, selects the first match, and reports the position", async () => {
    const { editor, root } = await mountPanel("cat dog cat");
    await typeQuery(root, "cat");
    pressEnter(root);
    await nextTick();

    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(4);
    expect(root.querySelector("[role=status]")?.textContent).toBe("第 1 / 2 项");
  });

  it("lists match snippets and selects a match from the list", async () => {
    const { editor, root } = await mountPanel("cat dog cat");
    await typeQuery(root, "cat");
    pressEnter(root);
    await nextTick();
    const rows = [...root.querySelectorAll<HTMLButtonElement>("[role=option]")];

    expect(rows.map((row) => row.textContent?.trim())).toEqual(["cat dog cat", "cat dog cat"]);
    expect(rows[0]?.getAttribute("aria-selected")).toBe("true");
    rows[1]?.click();
    await nextTick();
    expect(editor.state.pm.selection.from).toBe(9);
    expect(root.querySelector("[role=status]")?.textContent).toBe("第 2 / 2 项");
  });

  it("limits replace-all to a long selection captured when the card opens", async () => {
    const long = `cat ${"y".repeat(120)} cat`;
    const { editor, root, session } = await mountPanel(`${long} tail cat`);
    const detach = session.attach();
    editor.commands.setTextSelection({ from: 1, to: 1 + long.length });
    session.open(editor, "replace", document);
    await nextTick();
    const scopeBox = [...root.querySelectorAll("label")].find((label) => label.textContent?.includes("仅在选定范围内"));
    expect(scopeBox).toBeDefined();
    expect(session.state.findText).toBe("");

    session.state.inSelection = true;
    session.state.replaceText = "dog";
    await typeQuery(root, "cat");
    pressEnter(root);
    await nextTick();
    expect(getSearchSnapshot(editor.state.pm)).toMatchObject({ count: 2, limited: true });
    [...root.querySelectorAll("button")].find((button) => button.textContent?.trim() === "全部替换")?.click();
    await nextTick();
    expect(editor.state.pm.doc.textContent).toBe(`dog ${"y".repeat(120)} dog tail cat`);
    detach();
  });

  it("replaces every match from replace mode and clears highlights on unmount", async () => {
    const { editor, root, session, app } = await mountPanel("cat dog cat");
    session.state.mode = "replace";
    session.state.replaceText = "fox";
    await typeQuery(root, "cat");
    await nextTick();
    const replaceAll = [...root.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "全部替换");
    replaceAll?.click();
    await nextTick();

    expect(editor.state.pm.doc.textContent).toBe("fox dog fox");
    expect(root.querySelector("[role=status]")?.textContent).toBe("已替换 2 处");
    app.unmount();
    expect(getSearchSnapshot(editor.state.pm).query).toBeNull();
  });

  it("opens only with a mounted host, refocuses while open, and restores focus on close", () => {
    const editor = createEditor("cat");
    const session = getClassicSearchSession(editor);
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(session.open(editor, "find", document)).toBe(false);
    const detach = session.attach();
    expect(session.open(editor, "replace", document)).toBe(true);
    expect(session.open(editor, "find", document)).toBe(true);
    expect(session.state).toMatchObject({ open: true, mode: "find", findText: "cat", focusRequest: 2 });
    document.body.focus();
    session.close();
    expect(session.state.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    detach();
  });

  it("takes over the browser find shortcut only for this root or the page body", () => {
    const editor = createEditor("cat");
    const session = getClassicSearchSession(editor);
    const detach = session.attach();
    const root = document.createElement("div");
    const ribbonButton = document.createElement("button");
    const outsideInput = document.createElement("input");
    root.append(ribbonButton);
    document.body.append(root, outsideInput);
    const context = { root, editor, ownerDocument: document } as unknown as ClassicEditorRenderContext;
    const remove = installClassicSearchShortcut(() => context, session);
    const mac = /Mac|iPhone|iPad/u.test(navigator.platform);
    const press = (target: EventTarget): KeyboardEvent => {
      const event = new KeyboardEvent("keydown", { key: "f", metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };

    expect(press(outsideInput).defaultPrevented).toBe(false);
    expect(session.state.open).toBe(false);
    expect(press(ribbonButton).defaultPrevented).toBe(true);
    expect(session.state.open).toBe(true);
    expect(press(document.body).defaultPrevented).toBe(true);
    remove();
    detach();
  });

  it("navigates with Mod-G / Mod-Shift-G and opens replace with the platform shortcut", () => {
    const editor = createEditor("cat dog cat");
    const session = getClassicSearchSession(editor);
    const detach = session.attach();
    const root = document.createElement("div");
    document.body.append(root);
    const context = { root, editor, ownerDocument: document } as unknown as ClassicEditorRenderContext;
    const remove = installClassicSearchShortcut(() => context, session);
    const mac = /Mac|iPhone|iPad/u.test(navigator.platform);
    const press = (key: string, shiftKey = false): boolean => {
      const event = new KeyboardEvent("keydown", { key, shiftKey, metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true });
      root.dispatchEvent(event);
      return event.defaultPrevented;
    };
    session.state.findText = "cat";

    expect(press("g")).toBe(true);
    expect(session.state.open).toBe(true);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(press("G", true)).toBe(true);
    expect(editor.state.pm.selection.from).toBe(9);
    expect(press("h", mac)).toBe(true);
    expect(session.state.mode).toBe("replace");
    remove();
    detach();
  });
});

/**
 * Creates a headless editor with Classic search.
 *
 * @param text - Single paragraph text.
 * @returns Editor fixture.
 */
function createEditor(text: string): QuireEditor {
  const editor = new QuireEditor({
    extensions: [StarterKit, ClassicEditorSearch],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }
  });
  cleanups.push(() => editor.destroy());
  return editor;
}

/**
 * Mounts the panel body against a real editor.
 *
 * @param text - Single paragraph text.
 * @returns Editor, mounted root, session, and Vue app.
 */
async function mountPanel(text: string): Promise<{
  editor: QuireEditor;
  root: HTMLElement;
  session: ReturnType<typeof getClassicSearchSession>;
  app: App;
}> {
  const editor = createEditor(text);
  const session = getClassicSearchSession(editor);
  const root = document.createElement("div");
  document.body.append(root);
  const app = createClassicEditorUiApp(
    ClassicSearchPanel,
    { editor, session, locale: "zh-CN" },
    () => defaultTheme
  );
  app.mount(root);
  cleanups.unshift(() => app.unmount());
  await nextTick();
  return { editor, root, session, app };
}

/**
 * Types into the find input.
 *
 * @param root - Mounted panel root.
 * @param value - Query text.
 */
async function typeQuery(root: HTMLElement, value: string): Promise<void> {
  const input = root.querySelector<HTMLInputElement>(".qk-classic-search__field input")!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

/**
 * Presses Enter in the find input.
 *
 * @param root - Mounted panel root.
 */
function pressEnter(root: HTMLElement): void {
  root.querySelector(".qk-classic-search__field input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}
