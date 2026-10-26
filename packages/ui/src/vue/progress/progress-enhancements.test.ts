// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type VNode } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuireKitProgressSlotProps } from "../../components/progress";
import Progress from "./progress.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

/**
 * Mount a reactive consumer and register cleanup before component initialization.
 *
 * @param render - Consumer render function.
 * @returns The mounted fixture container.
 */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  cleanup.push(() => { app.unmount(); host.remove(); });
  app.mount(host);
  return host;
}

/**
 * Read the progressbar and its visible or visually hidden task label.
 *
 * @param host - Fixture or component container.
 * @returns The progressbar element and its associated label.
 */
function readProgress(host: Element) {
  const bar = host.querySelector<HTMLElement>('[role="progressbar"]')!;
  const label = document.getElementById(bar.getAttribute("aria-labelledby")!)!;
  return { bar, label };
}

describe("Progress loading presentation", () => {
  it("defaults the compact spinner to indeterminate with a hidden accessible label", async () => {
    const host = mount(() => h(Progress, { label: "保存中", shape: "spinner" }));
    await nextTick();
    const { bar, label } = readProgress(host);
    expect(bar.getAttribute("data-state")).toBe("indeterminate");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.getAttribute("aria-valuetext")).toBe("处理中");
    expect(label.textContent).toBe("保存中");
    expect(label.classList.contains("qk-progress__label--hidden")).toBe(true);
    expect(host.querySelector('[data-part="value-text"]')).toBeNull();
  });

  it("allows a determinate spinner with visible task and value text", async () => {
    const host = mount(() => h(Progress, {
      label: "上传附件", shape: "spinner", defaultValue: 35, showLabel: true, showValue: true
    }));
    await nextTick();
    const { bar, label } = readProgress(host);
    expect(bar.getAttribute("aria-valuenow")).toBe("35");
    expect(label.classList.contains("qk-progress__label--hidden")).toBe(false);
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe("35%");
  });

  it.each(["linear", "circle"] as const)("keeps %s defaults determinate and labels accessible when hidden", async shape => {
    const host = mount(() => h(Progress, { label: "处理文件", shape, showLabel: false }));
    await nextTick();
    const { bar, label } = readProgress(host);
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(label.classList.contains("qk-progress__label--hidden")).toBe(true);
    expect(label.textContent).toBe("处理文件");
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe("0%");
  });

  it.each(["linear", "circle", "spinner"] as const)("localizes %s indeterminate slots, visible text and ARIA together", async shape => {
    const state = reactive({ locale: "zh-TW" });
    const host = mount(() => h(QuireLocaleProvider, { locale: state.locale }, () => h(Progress, {
      label: "同步", shape, modelValue: null, showValue: true
    }, {
      label: (context: QuireKitProgressSlotProps) => h("span", { "data-label-value": context.valueText }, "同步")
    })));
    await nextTick();
    const { bar } = readProgress(host);
    for (const [locale, expected] of [
      ["zh-TW", "处理中"],
      ["en-US", "Processing"],
      ["fr-FR", "处理中"],
      ["zh-CN", "处理中"]
    ] as const) {
      state.locale = locale;
      await nextTick();
      expect(bar.getAttribute("aria-valuetext")).toBe(expected);
      expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe(expected);
      expect(host.querySelector('[data-label-value]')?.getAttribute("data-label-value")).toBe(expected);
    }
  });
});

describe("Progress numerical presentation", () => {
  it.each(["linear", "circle", "spinner"] as const)("formats %s text, slots and ARIA from the same normalized progress", async shape => {
    const state = reactive({
      value: 12.5, locale: "en-US",
      formatOptions: { style: "percent", minimumFractionDigits: 1 } as Intl.NumberFormatOptions
    });
    const host = mount(() => h(QuireLocaleProvider, { locale: state.locale }, () => h(Progress, {
      label: "下载", shape, min: 10, max: 30, modelValue: state.value, showValue: true,
      formatOptions: state.formatOptions
    }, {
      label: (context: QuireKitProgressSlotProps) => h("span", {
        "data-slot-value": context.value,
        "data-percent": context.percent,
        "data-indeterminate": String(context.indeterminate),
        "data-slot-text": context.valueText
      }, "下载")
    })));
    await nextTick();
    const { bar } = readProgress(host);
    expect(bar.getAttribute("aria-valuetext")).toBe("12.5%");
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe("12.5%");
    expect(host.querySelector('[data-percent]')?.getAttribute("data-percent")).toBe("12.5");
    expect(host.querySelector('[data-slot-text]')?.getAttribute("data-slot-text")).toBe("12.5%");

    state.locale = "de-DE";
    await nextTick();
    const localizedPercent = new Intl.NumberFormat(state.locale, state.formatOptions).format(0.125);
    expect(bar.getAttribute("aria-valuetext")).toBe(localizedPercent);
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe(localizedPercent);
    state.formatOptions = { style: "unit", unit: "megabyte", unitDisplay: "short", minimumFractionDigits: 2 };
    await nextTick();
    const expected = new Intl.NumberFormat(state.locale, state.formatOptions).format(12.5);
    expect(bar.getAttribute("aria-valuetext")).toBe(expected);
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe(expected);
    expect(host.querySelector('[data-slot-text]')?.getAttribute("data-slot-text")).toBe(expected);

    state.value = 50;
    await nextTick();
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
    expect(host.querySelector('[data-slot-value]')?.getAttribute("data-slot-value")).toBe("30");
    expect(host.querySelector('[data-percent]')?.getAttribute("data-percent")).toBe("100");
    expect(host.querySelector('[data-indeterminate]')?.getAttribute("data-indeterminate")).toBe("false");
  });

  it("lets value slots customize visible text while retaining semantic ARIA and normalized unknown context", async () => {
    const state = reactive<{ value: number | null }>({ value: 50 });
    const host = mount(() => h(Progress, { label: "处理批次", modelValue: state.value }, {
      value: (context: QuireKitProgressSlotProps) => h("span", {
        "data-slot-value": context.value === null ? "unknown" : context.value,
        "data-percent": context.percent,
        "data-indeterminate": String(context.indeterminate)
      }, `任务：${context.valueText}`)
    }));
    await nextTick();
    const { bar } = readProgress(host);
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe("任务：50%");
    expect(bar.getAttribute("aria-valuetext")).toBe("50%");
    state.value = null;
    await nextTick();
    expect(host.querySelector('[data-part="value-text"]')?.textContent).toBe("任务：处理中");
    expect(host.querySelector('[data-slot-value]')?.getAttribute("data-slot-value")).toBe("unknown");
    expect(host.querySelector('[data-percent]')?.getAttribute("data-percent")).toBe("0");
    expect(host.querySelector('[data-indeterminate]')?.getAttribute("data-indeterminate")).toBe("true");
    expect(bar.getAttribute("aria-valuetext")).toBe("处理中");
  });

  it.each(["circle", "spinner"] as const)("keeps a %s visible for zero inside a negative range and hides its empty endpoint", async shape => {
    const state = reactive<{ value: number | null }>({ value: 0 });
    const host = mount(() => h(Progress, { label: "任务进度", shape, min: -100, max: 100, modelValue: state.value }));
    await nextTick();
    const range = host.querySelector('[data-part="circle-range"]')!;
    expect(readProgress(host).bar.getAttribute("aria-valuetext")).toBe("50%");
    expect(range.getAttribute("opacity")).not.toBe("0");
    state.value = -100;
    await nextTick();
    expect(readProgress(host).bar.getAttribute("aria-valuetext")).toBe("0%");
    expect(range.getAttribute("opacity")).toBe("0");
    state.value = null;
    await nextTick();
    expect(range.getAttribute("opacity")).not.toBe("0");
    expect(readProgress(host).bar.hasAttribute("aria-valuenow")).toBe(false);
  });

  it("clamps presentation without mutating the model or losing the raw value after bounds expand", async () => {
    const state = reactive({ value: 150, min: 10, max: 100 });
    const update = vi.fn();
    const change = vi.fn();
    const host = mount(() => h(Progress, {
      label: "上传", modelValue: state.value, min: state.min, max: state.max,
      "onUpdate:modelValue": update, onValueChange: change
    }));
    await nextTick();
    const { bar } = readProgress(host);
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(state.value).toBe(150);
    state.max = 200;
    await nextTick();
    expect(bar.getAttribute("aria-valuenow")).toBe("150");
    state.value = -20;
    await nextTick();
    expect(bar.getAttribute("aria-valuenow")).toBe("10");
    state.min = -50;
    await nextTick();
    expect(bar.getAttribute("aria-valuenow")).toBe("-20");
    expect(state.value).toBe(-20);
    expect(update).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it.each([
    [20, 20], [80, 20], [NaN, 100], [0, Infinity], [-Infinity, 100],
    [-Number.MAX_VALUE, Number.MAX_VALUE]
  ])("normalizes invalid initial range %s..%s and subsequent range changes", async (min, max) => {
    const state = reactive({ min, max });
    const host = mount(() => h(Progress, { label: "校验", modelValue: 25, min: state.min, max: state.max }));
    await nextTick();
    const { bar } = readProgress(host);
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("25%");
    state.min = 20;
    state.max = 40;
    await nextTick();
    expect(bar.getAttribute("aria-valuemin")).toBe("20");
    expect(bar.getAttribute("aria-valuemax")).toBe("40");
    expect(bar.getAttribute("aria-valuetext")).toBe("25%");
    state.max = 20;
    await nextTick();
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
  });

  it.each([NaN, Infinity, -Infinity])("treats nonfinite value %s as unknown on mount and during updates", async value => {
    const state = reactive({ value });
    const host = mount(() => h(Progress, { label: "加载", modelValue: state.value }));
    await nextTick();
    const { bar } = readProgress(host);
    expect(bar.getAttribute("data-state")).toBe("indeterminate");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.getAttribute("aria-valuetext")).toBe("处理中");
    state.value = 70;
    await nextTick();
    expect(bar.getAttribute("aria-valuenow")).toBe("70");
    state.value = value;
    await nextTick();
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.getAttribute("data-state")).toBe("indeterminate");
  });

  it("snapshots the raw default once and reuses it after range and control changes", async () => {
    const state = reactive({ defaultValue: 150, max: 100, value: undefined as number | null | undefined });
    const host = mount(() => h(Progress, {
      label: "导出", defaultValue: state.defaultValue, max: state.max, modelValue: state.value
    }));
    await nextTick();
    const { bar } = readProgress(host);
    const labelId = bar.getAttribute("aria-labelledby");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    state.defaultValue = 15;
    state.max = 200;
    await nextTick();
    expect(bar.getAttribute("aria-valuenow")).toBe("150");
    for (const value of [50, null, 200, null, undefined]) {
      state.value = value;
      await nextTick();
      expect(bar.getAttribute("aria-valuenow")).toBe(value === null ? null : String(value ?? 150));
      expect(bar.getAttribute("aria-labelledby")).toBe(labelId);
      expect(bar.getAttribute("data-state")).toBe(value === null ? "indeterminate" : value === 200 ? "complete" : "loading");
    }
  });
});
