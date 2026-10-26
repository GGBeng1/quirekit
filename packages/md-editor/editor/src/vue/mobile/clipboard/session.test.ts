// @vitest-environment happy-dom
import { createApp, h, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor, Extension } from "@quirekit/msfe-core";
import { mobileSelectionActions, mobileSelectionActionsVisible } from "../../../presentation/mobile/actions";
import { useMobileClipboard } from "./use-clipboard";

const dispose: (() => void)[] = [];
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); });
/** @returns A product session observing the same accepted state as its mounted source owner. */
function mount() {
  const parent = document.createElement("div"), host = document.createElement("div"); document.body.append(parent, host);
  const editor = createMsfeEditor({ parent, markdown: "original after", extensions: [Extension.create({
    name: "selectionMenu", addCodeMirrorExtensions: () => [mobileSelectionActions],
  })] });
  editor.setSelection(EditorSelection.single(0, 8));
  const state = shallowRef(editor.state), enabled = shallowRef(true);
  const stop = editor.subscribeState({ select: value => value, change: value => { state.value = value; } });
  let session!: ReturnType<typeof useMobileClipboard>;
  const app = createApp({ setup() { session = useMobileClipboard(shallowRef(editor), state, enabled); return () => h("div"); } });
  app.mount(host);
  dispose.push(() => { app.unmount(); stop(); editor.destroy(); });
  return { editor, session, enabled, app };
}

it("reads only on explicit activation, suppresses duplicate clicks and closes immediately", async () => {
  let resolve!: (text: string) => void;
  const readText = vi.fn(() => new Promise<string>(done => { resolve = done; }));
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText } as unknown as Clipboard);
  const { editor, session } = mount(); expect(readText).not.toHaveBeenCalled();
  const pending = session.execute("paste"); await session.execute("paste");
  expect(readText).toHaveBeenCalledOnce(); expect(mobileSelectionActionsVisible(editor.state)).toBe(false);
  resolve("pasted"); await pending;
  expect(editor.getMarkdown()).toBe("pasted after"); expect(session.busy.value).toBe(false);
  expect(session.fallback.value).toBe(false); expect(mobileSelectionActionsVisible(editor.state)).toBe(false);
});

it.each(["resolve", "reject"])("ignores a stale read's %s without reopening its UI", async completion => {
  let resolve!: (text: string) => void, reject!: (error: Error) => void;
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText: () => new Promise<string>((a, b) => { resolve = a; reject = b; }) } as Clipboard);
  const { editor, session } = mount(), pending = session.execute("paste");
  editor.setSelection(EditorSelection.single(9, 14));
  if (completion === "resolve") resolve("wrong"); else reject(new Error("denied"));
  await pending;
  expect(editor.getMarkdown()).toBe("original after"); expect(session.fallback.value).toBe(false); expect(session.error.value).toBe("");
});

it("keeps the exact target through a denied read's manual fallback and cancels without a write", async () => {
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
  const { editor, session } = mount();
  await session.execute("paste"); expect(session.fallback.value).toBe(true);
  session.paste(""); expect(session.fallback.value).toBe(true); expect(session.error.value).toBe("empty");
  session.cancel(); expect(editor.history.canUndo).toBe(false);
  await session.execute("paste"); session.paste("manual");
  expect(editor.getMarkdown()).toBe("manual after"); expect(session.fallback.value).toBe(false);
  editor.undo(); expect(editor.getMarkdown()).toBe("original after");
});

it("ends the fallback and releases its target when another task takes ownership", async () => {
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
  const { editor, session, enabled } = mount();
  await session.execute("paste"); enabled.value = false; session.paste("late");
  expect(session.fallback.value).toBe(false); expect(editor.getMarkdown()).toBe("original after");
});
