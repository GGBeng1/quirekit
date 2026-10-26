// @vitest-environment happy-dom
import { createApp, h, nextTick, ref } from "vue";
import { expect, it } from "vitest";
import Toolbar from "../toolbar.vue";

it("keeps configured toggles controlled and routes only enabled actions", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const pressed = ref(false);
  const selected: string[] = [];
  const toggles: Array<[string, boolean]> = [];
  const app = createApp({ render: () => h(Toolbar, {
    label: "Configured", variant: "outlined", items: [
      { value: "save", label: "Save" },
      { value: "format", label: "Format", kind: "group", children: [
        { value: "bold", label: "Bold", kind: "toggle", pressed: pressed.value },
        { value: "locked", label: "Locked", disabled: true }
      ] }
    ], onSelect: (value: string) => selected.push(value),
    onToggle: (value: string, state: boolean) => toggles.push([value, state])
  }) });
  try {
    app.mount(host);
    await nextTick();
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    buttons[0]!.click();
    buttons[1]!.click();
    buttons[2]!.click();
    await nextTick();
    expect(selected).toEqual(["save"]);
    expect(toggles).toEqual([["bold", true]]);
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("false");
    pressed.value = true;
    await nextTick();
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
    buttons[1]!.click();
    expect(toggles).toEqual([["bold", true], ["bold", false]]);
    expect(buttons[2]!.getAttribute("tabindex")).toBe("-1");
  } finally { app.unmount(); host.remove(); }
});
