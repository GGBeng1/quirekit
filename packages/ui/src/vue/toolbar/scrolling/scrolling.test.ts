// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Toolbar from "../toolbar.vue";
import Action from "../toolbar-action.vue";
import QuireLocaleProvider from "../../locale-provider/locale-provider.vue";
import type { QuireKitToolbarOrientation, QuireKitToolbarOverflow, QuireKitToolbarScrollbar } from "../../../components/toolbar/types";

const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); vi.unstubAllGlobals(); });

/** @returns A completed Vue render and the shared measurement frame. */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await nextTick();
}

/**
 * @param configured - Whether the real Toolbar uses its declarative entries.
 * @param locale - Active language; omitted renders without a provider.
 * @returns Native viewport fixture with deterministic CSS geometry.
 */
async function mountToolbar(configured = false, locale?: string) {
  const callbacks: Array<() => void> = [];
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    /** @param callback - Native resize notification. */
    constructor(callback: () => void) { callbacks.push(callback); }
    /** Begins observation in the deterministic layout fixture. */
    observe(): void {}
    /** Releases observed nodes. */
    disconnect(): void { disconnect(); }
  });
  const state = reactive({
    orientation: "horizontal" as QuireKitToolbarOrientation,
    overflow: "scroll" as QuireKitToolbarOverflow,
    scrollbar: "hidden" as QuireKitToolbarScrollbar,
    dir: "ltr" as "ltr" | "rtl" | undefined, count: 4
  });
  const host = document.createElement("div");
  document.body.append(host);
  const toolbar = () => h(Toolbar, {
    label: "Tools", orientation: state.orientation, overflow: state.overflow, scrollbar: state.scrollbar,
    ...(state.dir ? { dir: state.dir } : {}),
    ...(configured ? { items: Array.from({ length: state.count }, (_, index) => ({ value: String(index), label: `Action ${index}` })) } : {})
  }, configured ? {} : { default: () => Array.from({ length: state.count }, (_, index) => h(Action, { label: `Action ${index}` })) });
  const app = createApp({ render: () => locale === undefined ? toolbar() : h(QuireLocaleProvider, { locale }, toolbar) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  const root = host.querySelector<HTMLElement>('[role="toolbar"]')!;
  const viewport = host.querySelector<HTMLElement>('[data-qk-toolbar-viewport]')!;
  const content = host.querySelector<HTMLElement>('[data-qk-toolbar-content]')!;
  const geometry = { available: 300, viewport: 240, content: 800 };
  Object.defineProperty(root, "clientWidth", { get: () => geometry.available });
  Object.defineProperty(viewport, "clientWidth", { get: () => geometry.viewport });
  Object.defineProperty(viewport, "scrollWidth", { get: () => geometry.content });
  Object.defineProperty(content, "scrollWidth", { get: () => geometry.content });
  const scroll = vi.spyOn(viewport, "scrollTo").mockImplementation((options: ScrollToOptions | number) => {
    viewport.scrollLeft = typeof options === "number" ? options : options.left ?? viewport.scrollLeft;
    viewport.dispatchEvent(new Event("scroll"));
  });
  /** @param left - Physical start of a target. @param width - Target's CSS width. @returns Minimal native rectangle. */
  const rectangle = (left: number, width: number): DOMRect => ({ left, right: left + width, top: 0, bottom: 32, width, height: 32, x: left, y: 0, toJSON: () => ({}) });
  viewport.getBoundingClientRect = () => rectangle(0, geometry.viewport);
  for (const [index, button] of Array.from(content.querySelectorAll<HTMLElement>("button")).entries()) {
    button.getBoundingClientRect = () => rectangle(index * 200 - viewport.scrollLeft, 32);
  }
  const previous = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('[data-qk-toolbar-scroll="previous"]')!;
  const next = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('[data-qk-toolbar-scroll="next"]')!;
  await settle();
  return { host, root, viewport, content, geometry, state, scroll, previous, next, disconnect, resize: () => callbacks.forEach(callback => callback()) };
}

for (const configured of [false, true]) {
  it(`keeps one keyboard scope and only shows overflow arrows for ${configured ? "items" : "slots"}`, async () => {
    const fixture = await mountToolbar(configured);
    expect(fixture.host.querySelectorAll('[role="toolbar"]')).toHaveLength(1);
    expect(fixture.viewport.classList.contains("qk-toolbar__viewport--hidden")).toBe(true);
    expect(fixture.previous().disabled).toBe(true);
    expect(fixture.next().disabled).toBe(false);
    expect(fixture.previous().tabIndex).toBe(-1);
    expect(fixture.next().hasAttribute("data-qk-toolbar-item")).toBe(false);
    expect(fixture.previous().querySelector("svg")).not.toBeNull();
    expect(fixture.next().querySelector('[data-icon-missing="true"]')).toBeNull();
    expect(fixture.host.querySelectorAll('[data-qk-toolbar-item][tabindex="0"]')).toHaveLength(1);
    fixture.geometry.available = 900;
    fixture.resize();
    await settle();
    expect(fixture.host.querySelectorAll('[data-qk-toolbar-scroll]')).toHaveLength(0);
    fixture.geometry.available = 300;
    fixture.state.scrollbar = "auto";
    fixture.resize();
    await settle();
    expect(fixture.viewport.classList.contains("qk-toolbar__viewport--auto")).toBe(true);
    fixture.state.overflow = "visible";
    await settle();
    expect(fixture.host.querySelectorAll('[data-qk-toolbar-scroll]')).toHaveLength(0);
    fixture.state.overflow = "scroll";
    fixture.state.orientation = "vertical";
    await settle();
    expect(fixture.viewport.classList.contains("qk-toolbar__viewport--visible")).toBe(true);
    expect(fixture.host.querySelectorAll('[data-qk-toolbar-scroll]')).toHaveLength(0);
  });
}

it("preserves host mouse focus, scrolls by logical screens in RTL and respects reduced motion", async () => {
  const fixture = await mountToolbar();
  const input = document.createElement("input");
  document.body.append(input);
  cleanup.push(() => input.remove());
  input.focus();
  const pointer = new PointerEvent("pointerdown", { pointerType: "mouse", button: 0, bubbles: true, cancelable: true });
  fixture.next().dispatchEvent(pointer);
  expect(pointer.defaultPrevented).toBe(true);
  fixture.next().click();
  await nextTick();
  expect(document.activeElement).toBe(input);
  expect(fixture.viewport.scrollLeft).toBe(192);
  expect(fixture.scroll).toHaveBeenLastCalledWith({ left: 192, behavior: "smooth" });
  fixture.state.dir = "rtl";
  fixture.viewport.scrollLeft = 0;
  await settle();
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  fixture.next().click();
  await nextTick();
  expect(fixture.viewport.scrollLeft).toBe(-192);
  expect(fixture.scroll).toHaveBeenLastCalledWith({ left: -192, behavior: "instant" });
  expect(fixture.previous().disabled).toBe(false);
  fixture.previous().click();
  await nextTick();
  expect(fixture.viewport.scrollLeft).toBeCloseTo(0);
  expect(fixture.previous().disabled).toBe(true);
});

it("updates inherited direction without a resize and does not undo intentional scrolling on a style mutation", async () => {
  const fixture = await mountToolbar();
  const first = fixture.content.querySelector<HTMLElement>("button")!;
  first.focus();
  fixture.next().click();
  expect(fixture.viewport.scrollLeft).toBe(192);
  fixture.host.className = "surface-ready";
  await settle();
  expect(fixture.viewport.scrollLeft).toBe(192);
  first.blur();
  fixture.viewport.scrollLeft = 0;
  fixture.state.dir = undefined;
  fixture.host.style.direction = "ltr";
  await settle();
  const initialArrow = fixture.previous().querySelector("svg")!.innerHTML;
  // happy-dom inherits CSS direction but does not map the HTML dir attribute to CSS.
  fixture.host.dir = "rtl";
  fixture.host.style.direction = "rtl";
  await settle();
  expect(fixture.previous().querySelector("svg")!.innerHTML).not.toBe(initialArrow);
  fixture.next().click();
  expect(fixture.viewport.scrollLeft).toBe(-192);
  fixture.host.dir = "ltr";
  fixture.host.style.direction = "ltr";
  await settle();
  expect(fixture.previous().querySelector("svg")!.innerHTML).toBe(initialArrow);
});

it("reveals keyboard and external field focus and stops observers after dynamic resize and unmount", async () => {
  const fixture = await mountToolbar();
  fixture.host.setAttribute("data-scope", "popover");
  fixture.host.setAttribute("data-part", "content");
  const first = fixture.content.querySelector<HTMLElement>("button")!;
  first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
  await nextTick();
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Action 3");
  expect(fixture.viewport.scrollLeft).toBe(392);
  const field = document.createElement("input");
  field.getBoundingClientRect = () => ({ left: -120, right: -40, width: 80 } as DOMRect);
  fixture.content.append(field);
  field.focus();
  expect(fixture.viewport.scrollLeft).toBe(272);
  fixture.geometry.available = 0;
  fixture.resize();
  await settle();
  expect(fixture.root.dataset.overflowing).toBe("false");
  field.blur();
  fixture.geometry.available = 300;
  fixture.resize();
  await settle();
  expect(fixture.root.dataset.overflowing).toBe("true");
  cleanup.splice(0).reverse().forEach(dispose => dispose());
  expect(fixture.disconnect).toHaveBeenCalled();
});

it("projects only unowned vertical wheels and leaves fields, child popups and viewport edges native", async () => {
  const fixture = await mountToolbar();
  fixture.host.setAttribute("role", "dialog");
  /** @param target - Native gesture target. @param values - Native wheel input. @returns Dispatched wheel event. */
  function wheel(target: Element, values: WheelEventInit = {}): WheelEvent {
    const event = new WheelEvent("wheel", { deltaY: 80, bubbles: true, cancelable: true, ...values });
    // happy-dom's WheelEvent omits modifier initialization from WheelEventInit.
    for (const key of ["ctrlKey", "metaKey", "altKey", "shiftKey"] as const) Object.defineProperty(event, key, { value: values[key] ?? false });
    target.dispatchEvent(event);
    return event;
  }
  expect(wheel(fixture.content).defaultPrevented).toBe(true);
  expect(fixture.viewport.scrollLeft).toBe(80);
  for (const values of [{ ctrlKey: true }, { shiftKey: true }, { deltaX: 50 }]) expect(wheel(fixture.content, values).defaultPrevented).toBe(false);
  const input = document.createElement("input");
  fixture.content.append(input);
  expect(wheel(input).defaultPrevented).toBe(false);
  const child = document.createElement("div");
  child.setAttribute("role", "menu");
  fixture.content.append(child);
  expect(wheel(child).defaultPrevented).toBe(false);
  child.removeAttribute("role");
  child.style.overflowY = "auto";
  Object.defineProperty(child, "scrollHeight", { get: () => 300 });
  Object.defineProperty(child, "clientHeight", { get: () => 100 });
  expect(wheel(child).defaultPrevented).toBe(false);
  fixture.viewport.scrollLeft = 560;
  expect(wheel(fixture.content).defaultPrevented).toBe(false);
  fixture.viewport.scrollLeft = 0;
  expect(wheel(fixture.content, { deltaY: -80 }).defaultPrevented).toBe(false);
});

it("names the scroll buttons from the active language", async () => {
  const chinese = await mountToolbar();
  expect(chinese.previous().getAttribute("aria-label")).toBe("向前滚动");
  cleanup.splice(0).reverse().forEach(dispose => dispose());
  const english = await mountToolbar(false, "en");
  expect(english.previous().getAttribute("aria-label")).toBe("Scroll back");
  expect(english.next().getAttribute("aria-label")).toBe("Scroll forward");
  expect(english.host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
