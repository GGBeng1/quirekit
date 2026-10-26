// @vitest-environment happy-dom
import { Menu } from "@ark-ui/vue/menu";
import { createApp, h, nextTick, ref } from "vue";
import { afterEach, expect, it } from "vitest";
import Submenu from "./menu-submenu.vue";
import Item from "./menu-item.vue";
import RadioGroup from "./menu-radio-group.vue";
import RadioItem from "./menu-radio-item.vue";
import { provideSubmenuSiblings } from "./surface/siblings";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).reverse().forEach(cleanup => cleanup()));

/** @param element - Real menu content receiving a keyboard event. @param key - Navigation key. */
function press(element: HTMLElement, key: string): void {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** @param controlled - Whether the host acknowledges a public open model. @param embedded - Include a focusable header control. @returns The actual parent menu content. */
async function mountSubmenu(controlled: boolean, embedded = false) {
  const open = ref(false);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Menu.Root, { defaultOpen: true, id: "parent-menu" }, { default: () =>
    h(Menu.Content, { "aria-label": "Root actions" }, { default: () => [
      ...(embedded ? [h("button", { type: "button" }, "Header action")] : []),
      h(Item, { value: "copy" }, { default: () => "Copy" }),
      h(Submenu, { id: "nested-menu", portalled: false, ...(controlled ? { open: open.value, "onUpdate:open": (value: boolean | undefined) => { open.value = !!value; } } : {}) }, {
        trigger: () => "Move",
        default: () => [
          h(Item, { value: "locked", disabled: true }, { default: () => "Unavailable" }),
          h(Item, { value: "personal" }, { default: () => "Personal" }),
          h(Item, { value: "team" }, { default: () => "Team" })
        ]
      })
    ] })
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host.querySelector<HTMLElement>('[role="menu"]')!;
}

it("returns from a child to parent menu navigation instead of its first embedded button", async () => {
  const parent = await mountSubmenu(true, true);
  parent.focus();
  press(parent, "Home");
  await nextTick();
  press(parent, "ArrowDown");
  await nextTick();
  for (const key of ["Escape", "ArrowLeft"]) {
    press(parent, "ArrowRight");
    await expect.poll(() => document.querySelector('[data-qk-submenu-content]')?.getAttribute("data-state")).toBe("open");
    const child = document.querySelector<HTMLElement>("[data-qk-submenu-content]")!;
    child.focus();
    press(child, key);
    await expect.poll(() => document.activeElement).toBe(parent);
    expect(parent.getAttribute("data-state")).toBe("open");
  }
});

for (const controlled of [false, true]) {
  it(`highlights the first enabled submenu item on both keyboard openings when controlled=${controlled}`, async () => {
    const parent = await mountSubmenu(controlled);
    parent.focus();
    press(parent, "Home");
    await nextTick();
    press(parent, "ArrowDown");
    await nextTick();
    for (let opening = 0; opening < 2; opening += 1) {
      press(parent, "ArrowRight");
      await expect.poll(() => document.querySelector('[data-qk-submenu-content]')?.getAttribute("data-state")).toBe("open");
      const child = document.querySelector<HTMLElement>("[data-qk-submenu-content]")!;
      const first = child.querySelector<HTMLElement>('[data-value="personal"]')!;
      await expect.poll(() => first.hasAttribute("data-highlighted")).toBe(true);
      expect(child.getAttribute("aria-activedescendant")).toBe(first.id);
      expect(child.querySelector('[data-value="locked"]')?.hasAttribute("data-highlighted")).toBe(false);
      press(child, "ArrowDown");
      await expect.poll(() => child.querySelector('[data-value="team"]')?.hasAttribute("data-highlighted")).toBe(true);
      press(child, opening === 0 ? "ArrowLeft" : "Escape");
      await expect.poll(() => child.getAttribute("data-state")).toBe("closed");
      expect(parent.getAttribute("data-state")).toBe("open");
      await expect.poll(() => document.activeElement).toBe(parent);
    }
  });
}

it("closes an open sibling submenu when another one opens", async () => {
  const opened = [ref(false), ref(false)];
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      provideSubmenuSiblings();
      return () => h(Menu.Root, { defaultOpen: true }, { default: () =>
        h(Menu.Content, { "aria-label": "File" }, { default: () => ["import", "export"].map((name, index) =>
          h(Submenu, { id: name, portalled: false, open: opened[index]!.value, "onUpdate:open": (value: boolean | undefined) => { opened[index]!.value = !!value; } }, {
            trigger: () => name,
            default: () => [h(Item, { value: `${name}-docx` }, { default: () => "Word" })]
          })) })
      });
    }
  });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  opened[0]!.value = true;
  await expect.poll(() => host.querySelectorAll('[data-qk-submenu-content][data-state="open"]').length).toBe(1);
  opened[1]!.value = true;
  await expect.poll(() => opened[0]!.value).toBe(false);
  await expect.poll(() => host.querySelectorAll('[data-qk-submenu-content][data-state="open"]').length).toBe(1);
  expect(host.querySelector('[data-qk-submenu-content][data-state="open"]')?.textContent).toContain("Word");
});

it("emits one accepted selection for checked and changed radio choices and skips disabled items", async () => {
  const selected: string[] = [], value = ref("rounded"), host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Menu.Root, { defaultOpen: true }, { default: () =>
    h(Menu.Content, {}, { default: () => h(Submenu, { portalled: false, open: true, onSelect: (choice: string) => selected.push(choice) }, {
      trigger: () => "Path",
      default: () => h(RadioGroup, { modelValue: value.value, "onUpdate:modelValue": (choice: string) => { value.value = choice; } }, { default: () => [
        h(RadioItem, { value: "rounded" }, { default: () => "Rounded" }),
        h(RadioItem, { value: "straight" }, { default: () => "Straight" }),
        h(RadioItem, { value: "locked", disabled: true }, { default: () => "Locked" })
      ] })
    }) })
  }) });
  app.mount(host); cleanups.push(() => { app.unmount(); host.remove(); });
  await expect.poll(() => host.querySelector('[data-qk-submenu-content]')?.getAttribute("data-state")).toBe("open");
  const child = host.querySelector<HTMLElement>("[data-qk-submenu-content]")!;
  child.querySelector<HTMLElement>('[data-value="rounded"]')!.click();
  await expect.poll(() => selected).toEqual(["rounded"]);
  child.focus(); press(child, "Home"); await nextTick(); press(child, "ArrowDown"); await nextTick(); press(child, "Enter");
  await expect.poll(() => selected).toEqual(["rounded", "straight"]);
  expect(value.value).toBe("straight");
  child.querySelector<HTMLElement>('[data-value="locked"]')!.click(); await nextTick();
  expect(selected).toEqual(["rounded", "straight"]);
});
