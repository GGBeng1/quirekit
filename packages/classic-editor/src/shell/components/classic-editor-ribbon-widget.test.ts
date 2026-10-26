// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext, ClassicEditorRibbonWidgetContribution } from "@classic/types";
import RibbonWidget from "./classic-editor-ribbon-widget.vue";

it("releases a DOM controller when its stable contribution switches to a Vue component", async () => {
  const destroy = vi.fn();
  const update = vi.fn();
  const contribution = shallowRef<ClassicEditorRibbonWidgetContribution>({
    kind: "ribbon-widget", id: "same-widget", groupId: "format",
    mount: () => ({ element: document.createElement("button"), destroy, update })
  });
  const context = shallowRef({} as ClassicEditorRenderContext);
  const host = document.createElement("div");
  const app = createApp({ render: () => h(RibbonWidget, {
    contribution: contribution.value, context: context.value
  }) });
  document.body.append(host);
  app.mount(host);
  try {
    await nextTick();
    expect(host.querySelector("button")).not.toBeNull();
    contribution.value = {
      kind: "ribbon-widget", id: "same-widget", groupId: "format",
      component: defineComponent({ render: () => h("span", "Vue control") })
    };
    await nextTick();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe("Vue control");
    context.value = {} as ClassicEditorRenderContext;
    await nextTick();
    expect(update).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    host.remove();
  }
  expect(destroy).toHaveBeenCalledTimes(1);
});
