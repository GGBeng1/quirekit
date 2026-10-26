// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Progress from "./progress.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

describe("Progress accessible task names", () => {
  it("links linear and circular progress to their own visible label while values change", async () => {
    const state = reactive<{ value: number | null; label: string }>({ value: 64, label: "上传设计稿" });
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render: () => h("div", [
      h(Progress, { label: state.label, modelValue: state.value, showValue: false }),
      h(Progress, { label: "同步资源", shape: "circle", modelValue: null }, {
        label: () => h("strong", "同步团队资源")
      })
    ]) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await nextTick();

    const bars = host.querySelectorAll('[role="progressbar"]');
    const labelIds = Array.from(bars, bar => bar.getAttribute("aria-labelledby"));
    expect(labelIds.every(Boolean)).toBe(true);
    expect(new Set(labelIds).size).toBe(2);
    expect(labelIds.map(id => document.getElementById(id!)?.textContent)).toEqual(["上传设计稿", "同步团队资源"]);
    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("64");
    expect(bars[0]!.getAttribute("aria-valuetext")).toBe("64%");
    expect(bars[1]!.hasAttribute("aria-valuenow")).toBe(false);
    expect(bars[1]!.getAttribute("aria-valuetext")).toBe("处理中");

    state.label = "上传最终设计稿";
    state.value = null;
    await nextTick();
    expect(bars[0]!.getAttribute("aria-labelledby")).toBe(labelIds[0]);
    expect(document.getElementById(labelIds[0]!)?.textContent).toBe("上传最终设计稿");
    expect(bars[0]!.hasAttribute("aria-valuenow")).toBe(false);
    expect(bars[0]!.getAttribute("aria-valuetext")).toBe("处理中");
  });
});

it("renders indeterminate text and number formatting in the active language", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: "en" }, () => h("div", [
    h(Progress, { label: "Upload", modelValue: null, showValue: true }),
    h(Progress, { label: "Sync", modelValue: 42 })
  ])) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const bars = host.querySelectorAll('[role="progressbar"]');
  expect(bars[0]!.getAttribute("aria-valuetext")).toBe("Processing");
  expect(bars[1]!.getAttribute("aria-valuetext")).toBe("42%");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
