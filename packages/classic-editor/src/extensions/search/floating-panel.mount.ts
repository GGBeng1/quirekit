// @vitest-environment happy-dom
import { QuireEditor } from "@quirekit/core";
import { getSearchSnapshot } from "@quirekit/extension-search";
import { defaultTheme } from "@quirekit/ui";
import { StarterKit } from "@quirekit/starter-kit";
import { nextTick } from "vue";
import { expect, it, vi } from "vitest";
import { createClassicEditorUiApp } from "@classic/shell/vue-app";
import type { ClassicEditorRenderContext } from "@classic/types";
import { ClassicEditorSearch } from "./extension";
import { getClassicSearchSession } from "./session";
import FloatingPanel from "./floating-panel.vue";

it("keeps Classic search activation, Escape and focus restoration inside the shared floating host", async () => {
  const editor = new QuireEditor({ extensions: [StarterKit, ClassicEditorSearch], content: "<p>cat dog cat</p>" });
  const root = document.createElement("div"), mount = document.createElement("div");
  root.innerHTML = '<button>Find</button><main class="qk-classic-editor__workspace-viewport"></main>';
  root.append(mount); document.body.append(root);
  const trigger = root.querySelector("button")!;
  const viewport = root.querySelector("main")!;
  const measure = vi.spyOn(root, "getBoundingClientRect");
  const observe = vi.spyOn(ResizeObserver.prototype, "observe");
  const disconnect = vi.spyOn(ResizeObserver.prototype, "disconnect");
  Object.defineProperties(viewport, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
  const context = { root, editor, ownerDocument: document, locale: "zh-CN" } as unknown as ClassicEditorRenderContext;
  const session = getClassicSearchSession(editor), detach = session.attach();
  const app = createClassicEditorUiApp(FloatingPanel, { host: { context }, session }, () => defaultTheme);
  app.mount(mount);
  try {
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    trigger.focus(); session.open(editor, "replace", document);
    await nextTick(); await nextTick();
    const card = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(card.classList.contains("qk-floating-panel")).toBe(true);
    expect(card.getAttribute("aria-modal")).toBe("false");
    expect(card.style.width).toBe("340px");
    expect(card.style.transform).toBe("translate(448px, 12px)");
    const observer = observe.mock.calls.map(([element], index) => element === viewport ? observe.mock.contexts[index] : undefined)
      .filter(Boolean).pop();
    expect(observer).toBeDefined();
    const reads = measure.mock.calls.length;
    const input = card.querySelector<HTMLInputElement>(".qk-classic-search__field input")!;
    input.value = "cat"; input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextTick();
    expect(getSearchSnapshot(editor.state.pm).count).toBe(2);
    expect(editor.state.pm.selection.from).toBe(1);
    viewport.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(measure.mock.calls.length).toBe(reads);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, isComposing: true }));
    expect(session.state.open).toBe(true);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await nextTick();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(getSearchSnapshot(editor.state.pm).count).toBe(0);
    expect(disconnect.mock.contexts).toContain(observer);
    const closedReads = measure.mock.calls.length;
    editor.commands.setTextSelection(5);
    await nextTick();
    expect(measure.mock.calls.length).toBe(closedReads);
  } finally {
    app.unmount(); detach(); editor.destroy(); root.remove(); vi.restoreAllMocks();
  }
});
