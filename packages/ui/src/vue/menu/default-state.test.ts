// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Menu from "./menu.vue";
import MenuItem from "./menu-item.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a default-open Menu with an optional host-owned open value.
 * @param open - Initial controlled value, omitted for an uncontrolled Menu.
 * @returns The actual trigger, host state and recorded update requests.
 */
async function mountMenu(open?: boolean) {
  const state = reactive({ open });
  const updates: Array<boolean | undefined> = [];
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup: () => () => h(Menu, {
      defaultOpen: true,
      lang: "zh-CN",
      "data-theme-owner": "first",
      style: { "--qk-color-action-primary": "#7257d5" },
      portalled: false,
      ...(state.open === undefined ? {} : { open: state.open }),
      "onUpdate:open": (next: boolean | undefined) => { updates.push(next); }
    }, {
      trigger: () => h("button", { type: "button" }, "文档操作"),
      default: () => h("div", "菜单内容")
    })
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { host, trigger: host.querySelector<HTMLButtonElement>("button")!, state, updates };
}

describe("Menu initial and controlled open state", () => {
  it("leaves touch presses native so WebKit can deliver the menu activation click", async () => {
    const { trigger, updates } = await mountMenu(false);
    const touch = new PointerEvent("pointerdown", { pointerType: "touch", button: 0, bubbles: true, cancelable: true });
    trigger.dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(false);
    expect(updates).toEqual([]);
    trigger.click();
    await nextTick();
    expect(updates).toEqual([true]);
    const mouse = new PointerEvent("pointerdown", { pointerType: "mouse", button: 0, bubbles: true, cancelable: true });
    trigger.dispatchEvent(mouse);
    expect(mouse.defaultPrevented).toBe(true);
  });

  it("keeps keyboard selection and host coordinates without a competing floating positioner", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const select = vi.fn();
    const app = createApp(defineComponent({ setup: () => () => h(Menu, {
      open: true, positioned: false, portalled: false, ariaLabel: "Block actions",
      style: { position: "absolute", left: "80px", top: "120px", maxHeight: "250px" }
    }, { default: () => h(MenuItem, { value: "move", onSelect: select }, () => "Move") }) }));
    app.mount(host); cleanups.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    const content = host.querySelector<HTMLElement>('[role="menu"]')!;
    expect(host.querySelector(".qk-menu__positioner")).toBeNull();
    expect(content.getAttribute("aria-label")).toBe("Block actions");
    expect(content.style.left).toBe("80px");
    expect(content.style.maxHeight).toBe("250px");
    expect(content.style.transitionProperty).toBe("opacity");
    await expect.poll(() => document.activeElement).toBe(content);
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await expect.poll(() => select.mock.calls.length).toBe(1);
  });
  it("keeps ordinary Escape dismissal and focus return after cancelling submenu root dismissal", async () => {
    const { host, trigger, updates } = await mountMenu();
    const content = host.querySelector<HTMLElement>('[role="menu"]')!;
    await expect.poll(() => document.activeElement).toBe(content);
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await expect.poll(() => trigger.getAttribute("aria-expanded")).toBe("false");
    await expect.poll(() => document.activeElement).toBe(trigger);
    expect(updates).toEqual([false]);
  });

  it("uses defaultOpen once and allows the uncontrolled menu to close and reopen", async () => {
    const { host, trigger, updates } = await mountMenu();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const content = host.querySelector<HTMLElement>('[role="menu"]')!;
    expect(content.classList.contains("qk-menu--viewport")).toBe(true);
    expect(content.style.maxWidth).toContain("100vw - 16px");
    expect(content.style.maxHeight).toContain("100dvh - 16px");
    expect(content.getAttribute("lang")).toBe("zh-CN");
    expect(content.dataset.themeOwner).toBe("first");
    expect(content.style.getPropertyValue("--qk-color-action-primary")).toBe("#7257d5");
    trigger.click();
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(updates).toEqual([false, true]);
  });

  it("honors controlled false over defaultOpen and waits for subsequent host updates", async () => {
    const { host, trigger, state, updates } = await mountMenu(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector('[role="menu"]')).toBeNull();
    state.open = true;
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    await nextTick();
    expect(updates).toEqual([false]);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    state.open = false;
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(updates).toEqual([false]);
  });

  it("preserves focus handed to an editor before a controlled menu closes", async () => {
    const { host, state } = await mountMenu(true);
    const content = host.querySelector<HTMLElement>('[role="menu"]')!;
    await expect.poll(() => document.activeElement).toBe(content);
    const input = document.createElement("textarea");
    document.body.append(input);
    cleanups.push(() => input.remove());
    input.focus();
    state.open = false;
    await nextTick();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(document.activeElement).toBe(input);
  });
});
