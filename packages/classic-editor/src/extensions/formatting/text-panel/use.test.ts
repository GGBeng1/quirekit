// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowReactive } from "vue";
import { expect, it, vi } from "vitest";
import { createEditor } from "@quirekit/core";
import type { ClassicEditorRenderContext } from "@classic/types";
import * as selection from "@classic/extensions/typography/effective-format/selection";
import { ClassicEditorKit } from "../../kit";
import { useTextPanel } from "./use";

it("projects only changed selections, handles mixed fields and releases mounted listeners", async () => {
  const editor = createEditor({ extensions: [ClassicEditorKit], content: { type: "doc", content: Array.from({ length: 500 }, () => ({ type: "paragraph", content: [{ type: "text", text: "ABC" }] })) } });
  const collect = vi.spyOn(selection, "collectClassicSelectedTextSegments");
  const serialize = vi.spyOn(editor, "getJSON");
  const off = vi.spyOn(editor, "off");
  const context = shallowReactive({ editor, locale: "zh-CN" });
  let controller!: ReturnType<typeof useTextPanel>;
  const host = document.createElement("div");
  const app = createApp(defineComponent({ setup() {
    controller = useTextPanel(() => context as unknown as ClassicEditorRenderContext);
    return () => h('div', `${controller.value('underline', 'underlineType', 'none')}:${controller.value('textStyle', 'emphasisMark', 'none')}`);
  } }));
  app.mount(host);
  try {
    expect(collect).toHaveBeenCalledTimes(1);
    collect.mockClear();
    editor.dispatchTransaction(editor.state.pm.tr);
    await nextTick();
    expect(collect).not.toHaveBeenCalled();
    controller.setUnderline('double');
    await nextTick();
    expect(host.textContent).toBe('double:none');
    expect(collect).toHaveBeenCalledTimes(1);
    controller.setEmphasis('underDot');
    await nextTick();
    expect(host.textContent).toBe('double:underDot');
    editor.chain().setTextSelection({ from: 1, to: 2 }).setUnderline({ underlineType: 'wave' }).run();
    editor.commands.setTextSelection({ from: 1, to: 4 });
    await nextTick();
    expect(controller.value('underline', 'underlineType', 'none')).toBeUndefined();
    expect(serialize).not.toHaveBeenCalled();
    editor.setEditable(false);
    await nextTick();
    expect(controller.disabled.value).toBe(true);
    const doc = editor.state.doc;
    controller.setUnderline('thick');
    expect(editor.state.doc).toBe(doc);
    context.locale = 'en';
    await nextTick();
    expect(controller.message('title')).toBe('Text');
  } finally {
    app.unmount();
    expect(off).toHaveBeenCalledWith('transaction', expect.any(Function));
    expect(off).toHaveBeenCalledWith('update', expect.any(Function));
    editor.destroy(); vi.restoreAllMocks();
  }
});

it("sets, reads and clears the highlight through Word's named palette", async () => {
  const editor = createEditor({ extensions: [ClassicEditorKit], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ABCD" }] }] } });
  const context = shallowReactive({ editor, locale: "zh-CN" });
  let controller!: ReturnType<typeof useTextPanel>;
  const app = createApp(defineComponent({ setup() {
    controller = useTextPanel(() => context as unknown as ClassicEditorRenderContext);
    return () => h('div');
  } }));
  app.mount(document.createElement("div"));
  try {
    editor.commands.setTextSelection({ from: 1, to: 3 });
    controller.setHighlight('#008080');
    await nextTick();
    expect(controller.value('highlight', 'color')).toBe('darkCyan');
    const doc = editor.state.doc;
    controller.setHighlight('#FFF2A8');
    expect(editor.state.doc).toBe(doc);
    editor.commands.setTextSelection({ from: 1, to: 5 });
    await nextTick();
    expect(controller.value('highlight', 'color')).toBeUndefined();
    controller.setHighlight(null);
    await nextTick();
    expect(controller.value('highlight', 'color')).toBeNull();
  } finally {
    app.unmount();
    editor.destroy();
  }
});
