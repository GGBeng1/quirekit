// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import ContextMenu from "./context-menu.vue";
import MenuItem from "../menu-item.vue";
import MenuSubmenu from "../menu-submenu.vue";

const cleanup: Array<() => void> = [];
afterEach(async () => {
  cleanup.splice(0).forEach(dispose => dispose());
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
});

/**
 * Mounts the real menu and waits for its initial focus before a synchronous selection.
 * @returns The region, an outside control, focus policy, reopening, and frame completion.
 */
async function mountMenu() {
  const state = reactive({ restoreFocus: true });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h("div", [
    h("button", { id: "outside" }, "Another task"),
    h(ContextMenu, { id: "focus-fixture", label: "File operations", restoreFocus: state.restoreFocus }, {
      trigger: () => "Design draft",
      default: () => [
        h(MenuItem, { value: "duplicate" }, () => "Duplicate"),
        h(MenuSubmenu, {}, {
          trigger: () => "Move to",
          default: () => h(MenuItem, { value: "archive" }, () => "Archive")
        })
      ]
    })
  ]) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();

  /** Waits for one browser frame after Vue has committed the current state. */
  async function frame(): Promise<void> {
    await nextTick();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await nextTick();
  }

  const target = host.querySelector<HTMLElement>('[data-part="context-trigger"]')!;
  /** @returns The reopened, focused menu without replacing its context region. */
  async function openMenu() {
    target.focus();
    target.dispatchEvent(new MouseEvent("contextmenu", { button: 2, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(target.getAttribute("aria-expanded")).toBe("true"));
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    await vi.waitFor(() => expect(document.activeElement).toBe(menu));
    return menu;
  }
  return { target, state, openMenu, outside: host.querySelector<HTMLButtonElement>("#outside")!, frame };
}

it("resolves pending focus across selections, portalled submenus, deliberate handoff, and opt-out", async () => {
  const { target, state, openMenu, outside, frame } = await mountMenu();
  for (const destination of ["region", "submenu", "outside", "disabled"] as const) {
    state.restoreFocus = destination !== "disabled";
    let menu = await openMenu();
    if (destination === "submenu") {
      menu.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      await nextTick();
      menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await vi.waitFor(() => expect(document.querySelector('[data-qk-submenu-content]')).not.toBeNull());
      menu = document.querySelector<HTMLElement>('[data-qk-submenu-content]')!;
      await vi.waitFor(() => expect(document.activeElement).toBe(menu));
    }
    const item = menu.querySelector<HTMLElement>('[role="menuitem"]')!;
    // All pointer events and activation occur before the next browser frame.
    item.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "mouse", bubbles: true }));
    item.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", bubbles: true, clientX: 10 }));
    item.dispatchEvent(new PointerEvent("pointerup", { pointerType: "mouse", bubbles: true }));
    item.click();
    if (destination === "outside") outside.focus();
    await frame();
    await frame();
    expect(target.getAttribute("aria-expanded")).toBe("false");
    if (destination === "region" || destination === "submenu") expect(document.activeElement).toBe(target);
    else if (destination === "outside") expect(document.activeElement).toBe(outside);
    else expect(document.activeElement).not.toBe(target);
  }
});
