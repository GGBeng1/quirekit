// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowRef, type ComponentPublicInstance } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultTheme } from "@quirekit/ui";
import type { ClassicEditorRibbonTabContribution } from "@classic/types";
import { useClassicEditorTaskTabWidthBudget } from "./use-width-budget";

const destroy: Array<() => void> = [];
afterEach(() => {
  for (const release of destroy.splice(0)) release();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("task tab width invalidation", () => {
  it("ignores equivalent contribution arrays and coalesces changed source and locale", async () => {
    const fixture = mountBudget();
    await settle();
    fixture.read.mockClear();
    for (let revision = 0; revision < 4; revision++) {
      fixture.tabs.value = fixture.tabs.value.map(tab => ({ ...tab,
        label: typeof tab.label === "string" ? tab.label : { ...tab.label }
      }));
      await settle();
    }
    expect(fixture.read).not.toHaveBeenCalled();

    fixture.tabs.value = [...fixture.tabs.value].reverse().map(tab => ({ ...tab,
      label: { "zh-CN": "新文案", en: "Updated label" }
    }));
    fixture.locale.value = "en";
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(3);
  });

  it("keeps active overflow responsive without reading dimensions", async () => {
    const fixture = mountBudget();
    await settle();
    fixture.read.mockClear();
    fixture.active.value = "third";
    await settle();
    expect(fixture.visible()).toContain("third");
    expect(fixture.overflow().length).toBeGreaterThan(0);
    expect(fixture.read).not.toHaveBeenCalled();
  });

  it("remeasures resize, theme and font changes and releases pending work", async () => {
    const fixture = mountBudget();
    await settle();
    fixture.read.mockClear();
    fixture.resize(240);
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(3);
    expect(fixture.overflow()).toEqual([]);

    fixture.read.mockClear();
    fixture.theme.value = { ...defaultTheme };
    fixture.fonts.dispatchEvent(new Event("loadingdone"));
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(3);

    fixture.read.mockClear();
    fixture.locale.value = "en";
    fixture.unmount();
    fixture.fonts.dispatchEvent(new Event("loadingdone"));
    await settle();
    expect(fixture.read).not.toHaveBeenCalled();
  });
});

/** @returns Fixture with native geometry counters and explicit resize/font boundaries. */
function mountBudget() {
  const tabs = shallowRef<readonly ClassicEditorRibbonTabContribution[]>([
    { id: "first", kind: "ribbon-tab", label: { "zh-CN": "开始", en: "Home" } },
    { id: "second", kind: "ribbon-tab", label: "Insert" },
    { id: "third", kind: "ribbon-tab", label: "Review" }
  ]);
  const active = shallowRef<string | undefined>("first");
  const locale = shallowRef("zh-CN");
  const theme = shallowRef(defaultTheme);
  const fonts = new EventTarget();
  const fontsDescriptor = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
  let width = 110;
  let notifyResize: () => void = () => undefined;
  vi.stubGlobal("ResizeObserver", class {
    /** @param callback - Geometry observer scheduled by the composable. */
    constructor(callback: () => void) { notifyResize = callback; }
    /** Registers a fixture element. */
    observe(): void {}
    /** Releases a fixture element. */
    unobserve(): void {}
    /** Stops observing the fixture. */
    disconnect(): void {}
  });
  const read = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(() => new DOMRect(0, 0, 50, 24));
  const host = document.createElement("div");
  document.body.append(host);
  let budget: ReturnType<typeof useClassicEditorTaskTabWidthBudget>;
  const app = createApp(defineComponent({
    setup() {
      budget = useClassicEditorTaskTabWidthBudget({ tabs, activeId: active, locale, theme });
      return () => h("div", {
        ref: (value: Element | ComponentPublicInstance | null) => {
          const element = value instanceof Element ? value : null;
          if (element) Object.defineProperty(element, "clientWidth", { configurable: true, get: () => width });
          budget.captureRoot(element);
        },
        style: "--qk-control-default: 20px; --qk-space-inline-tight: 4px"
      }, tabs.value.map(tab => h("button", {
        key: tab.id,
        ref: (value: Element | ComponentPublicInstance | null) =>
          budget.captureTab(tab.id, value instanceof Element ? value : null)
      }, tab.id)));
    }
  }));
  app.mount(host);
  let mounted = true;
  /** Ends the fixture once, including restoration of document font ownership. */
  function unmount(): void {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    if (fontsDescriptor) Object.defineProperty(document, "fonts", fontsDescriptor);
    else Reflect.deleteProperty(document, "fonts");
  }
  destroy.push(unmount);
  return { tabs, active, locale, theme, fonts, read, unmount,
    /** @param next - Available task-row width. */
    resize(next: number): void { width = next; notifyResize(); },
    /** @returns Current direct ids. */
    visible: () => budget!.visibleIds.value,
    /** @returns Current overflow ids. */
    overflow: () => budget!.overflowIds.value
  };
}

/** Lets Vue projection and the deferred ResizeObserver phase finish. */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await nextTick();
}
