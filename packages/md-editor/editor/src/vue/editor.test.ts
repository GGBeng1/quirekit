// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Extension } from "@quirekit/msfe-core";
import MdEditor from "./editor.vue";
import type { MdEditorInstance, MdEditorLocale } from "./types";

const dispose: (() => void)[] = [];
beforeEach(() => {
  // Happy DOM omits FontFaceSet; this fixture tests error ownership, not font measurements.
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve() }) });
});
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); });

describe("product error presentation", () => {
  it.each<MdEditorLocale>(["zh-CN", "en"])("uses the shared Alert and preserves original source on mount failure (%s)", async locale => {
    const failure = new Error("editor-not-created"), onError = vi.fn(), unhandled = vi.fn();
    const markdown = "# Keep **my source**\n\n- [ ] Retain this\n", product = shallowRef<MdEditorInstance>();
    const broken = Extension.create({ name: "broken-consumer",
      /** @returns Never resolves: the consumer extension rejects creation. */
      addCodeMirrorExtensions() { throw failure; },
    });
    const element = document.createElement("div"); document.body.append(element);
    const app = createApp({ render: () => h(MdEditor, { markdown, locale, extensions: [broken], ref: product, onError }) });
    app.config.errorHandler = unhandled;
    dispose.push(() => { app.unmount(); element.remove(); });
    app.mount(element); await nextTick();
    const alert = element.querySelector('[role="alert"]');
    expect(alert?.classList.contains("qk-alert")).toBe(true);
    expect(alert?.textContent).toContain(locale === "en" ? "Could not start the editor" : "编辑器未能启动");
    expect(alert?.textContent).not.toContain("editor-not-created");
    expect(element.querySelector('pre code')?.textContent).toBe(markdown);
    expect(product.value?.editor).toBeUndefined();
    expect(element.querySelector('[role="toolbar"]')).toBeNull();
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("keeps the mounted source and undo history when a runtime extension reports an error", async () => {
    const failure = new Error("extension-start-failed"), onError = vi.fn(), product = shallowRef<MdEditorInstance>();
    const broken = Extension.create({ name: "broken-lifecycle",
      /** Deliberately reports a failure after the editor has mounted. */
      onCreate() { throw failure; },
    });
    const element = document.createElement("div"); document.body.append(element);
    const app = createApp({ render: () => h(MdEditor, { markdown: "Original", extras: false, extensions: [broken], ref: product, onError }) });
    dispose.push(() => { app.unmount(); element.remove(); });
    app.mount(element); await nextTick();
    const editor = product.value!.editor!;
    expect(editor.getMarkdown()).toBe("Original");
    expect(element.querySelector('[role="alert"]')?.textContent).toContain("部分编辑功能发生错误");
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    editor.commands.insertText(" edited");
    expect(editor.getMarkdown()).toBe("Original edited");
    const close = element.querySelector<HTMLButtonElement>('button[aria-label="关闭提示"]')!;
    close.click(); await nextTick();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(product.value?.editor).toBe(editor);
    expect(editor.undo()).toBe(true);
    expect(editor.getMarkdown()).toBe("Original");
  });
});
