// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { expect, it } from "vitest";
import PresetGallery from "./preset-gallery.vue";

// The hidden label carries the semantic recipe class, which the preset maps onto
// the `sr-only` utilities; asserting the raw utility here would pin an internal
// shortcut name that the Listbox owns.
const visuallyHiddenLabelClass = "qk-listbox__visually-hidden";

it("can hide the visual label without changing the Gallery's accessible name or selection", async () => {
  const props = reactive({ hideLabel: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(PresetGallery, {
    ...props, label: "文本样式", items: [{ value: "plain", label: "正文" }], defaultValue: "plain"
  }) });
  try {
    app.mount(host);
    await nextTick();
    const listbox = host.querySelector('[role="listbox"]')!;
    const label = host.querySelector(".qk-listbox__label")!;
    expect(label.classList.contains(visuallyHiddenLabelClass)).toBe(false);
    expect(listbox.getAttribute("aria-labelledby")).toBe(label.id);
    expect(label.textContent).toBe("文本样式");
    props.hideLabel = true;
    await nextTick();
    expect(host.querySelector('[role="listbox"]')).toBe(listbox);
    expect(label.classList.contains(visuallyHiddenLabelClass)).toBe(true);
    expect(label.hasAttribute("aria-hidden")).toBe(false);
    expect(document.getElementById(listbox.getAttribute("aria-labelledby")!)?.textContent).toBe("文本样式");
    expect(host.querySelector('[role="option"]')?.getAttribute("aria-selected")).toBe("true");
  } finally {
    app.unmount();
    host.remove();
  }
});
