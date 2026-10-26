// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { expect, it } from "vitest";
import Inspector from "./index.vue";

it("keeps numeric width and optional descriptions valid through updates", async () => {
  const state = reactive({ width: 240, description: "", hidden: false, variant: "standalone" as "standalone" | "embedded" });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Inspector, { title: "图片属性", ...state }, () => "尺寸") });
  app.mount(host);
  try {
    const panel = host.querySelector<HTMLElement>('[role="region"]')!;
    expect(panel.style.width).toBe("240px");
    expect(panel.hasAttribute("aria-describedby")).toBe(false);
    expect(panel.classList.contains("qk-inspector--embedded")).toBe(false);
    state.variant = "embedded";
    await nextTick();
    expect(panel.classList.contains("qk-inspector--embedded")).toBe(true);
    state.description = "当前图片";
    state.width = 320;
    await nextTick();
    expect(host.querySelector('[role="region"]')).toBe(panel);
    expect(panel.style.width).toBe("320px");
    expect(document.getElementById(panel.getAttribute("aria-describedby")!)?.textContent).toBe("当前图片");
    state.description = "";
    await nextTick();
    expect(panel.hasAttribute("aria-describedby")).toBe(false);
    state.hidden = true;
    await nextTick();
    expect(host.querySelector('[role="region"]')).toBeNull();
  } finally {
    app.unmount();
    host.remove();
  }
});

it("replaces the visible heading while retaining the region name, actions and body", async () => {
  const custom = reactive({ heading: true });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Inspector, { title: "格式设置" }, {
    default: () => h("div", { id: "properties" }, "当前属性"),
    actions: () => h("button", { "aria-label": "关闭" }, "关闭"),
    ...(custom.heading ? { heading: () => h("nav", { "aria-label": "属性类型" }, "文本 · 段落") } : {})
  }) });
  app.mount(host);
  try {
    const region = host.querySelector('[role="region"]')!;
    expect(region.getAttribute("aria-label")).toBe("格式设置");
    expect(region.hasAttribute("aria-labelledby")).toBe(false);
    expect(host.querySelector("h2")).toBeNull();
    expect(host.querySelector('header nav')?.textContent).toBe("文本 · 段落");
    expect(host.querySelector('header button')?.getAttribute("aria-label")).toBe("关闭");
    expect(host.querySelector('#properties')?.textContent).toBe("当前属性");
    custom.heading = false;
    await nextTick();
    expect(region.hasAttribute("aria-label")).toBe(false);
    expect(document.getElementById(region.getAttribute("aria-labelledby")!)?.textContent).toBe("格式设置");
  } finally { app.unmount(); host.remove(); }
});
