// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import ColorPicker from "./color-picker.vue";
import ColorPickerRoot from "./color-picker-root.vue";
import ColorEditor from "./color-editor.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));

/**
 * Mounts the public picker with its real palette and Ark behavior.
 * @param controlledReset - Whether no-color state is controlled by the fixture.
 * @param defaultInputFormat - Color input format opened by the fixture.
 * @returns Mutable consumer state, rendered controls and accepted events.
 */
async function mountPicker(controlledReset: boolean, defaultInputFormat: "hex" | "rgb" = "hex") {
  const state = reactive({ value: "#3E63DD", reset: controlledReset, open: true, disabled: false });
  const committed: string[] = [];
  const resetChanges: boolean[] = [];
  const reset = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => h(ColorPicker, {
      modelValue: state.value, open: state.open, disabled: state.disabled,
      ...(controlledReset ? { resetActive: state.reset } : {}),
      colors: [["#3E63DD", "#E5484D"]], recentColors: [], portalled: false,
      defaultInputFormat,
      "onUpdate:modelValue": (value: string) => { state.value = value; },
      "onUpdate:resetActive": (value: boolean) => { resetChanges.push(value); state.reset = value; },
      "onUpdate:open": (value: boolean) => { state.open = value; },
      onCommit: (value: string) => committed.push(value), onReset: reset
    })
  });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await vi.waitFor(() => expect(host.querySelector(".qk-color-picker__reset")).not.toBeNull());
  /** @param selector - CSS selector for a real palette button. */
  async function click(selector: string): Promise<void> {
    host.querySelector<HTMLButtonElement>(selector)!.click();
    await nextTick();
  }
  return { host, state, committed, resetChanges, reset, click };
}

describe("ColorPicker no-color state", () => {
  it("owns a nested dialog and discards it when the host closes the picker", async () => {
    const fixture = await mountPicker(false);
    const more = fixture.host.querySelector<HTMLButtonElement>(".qk-color-picker__more")!;
    await fixture.click(".qk-color-picker__more");
    const panel = fixture.host.querySelector<HTMLElement>(".qk-color-picker__editor-panel")!;
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("data-scope")).toBe("popover");
    expect(more.getAttribute("aria-controls")).toBe(panel.id);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(panel.parentElement!.classList.contains("qk-color-picker__editor-positioner")).toBe(true);

    fixture.state.open = false;
    await nextTick();
    await vi.waitFor(() => expect(fixture.host.querySelector(".qk-color-picker__editor-panel")).toBeNull());
    fixture.state.open = true;
    await nextTick();
    await vi.waitFor(() => expect(fixture.host.querySelector(".qk-color-picker__more")).not.toBeNull());
    expect(fixture.host.querySelector(".qk-color-picker__editor-panel")).toBeNull();
    expect(fixture.host.querySelector(".qk-color-picker__more")!.getAttribute("aria-expanded")).toBe("false");
  });

  it("forwards content markers without replacing the picker dialog contract", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render: () => h(ColorPicker, {
      open: true, portalled: false, label: "Cell fill",
      contentAttributes: { "data-owner": "document-color", class: "host-color-panel", lang: "en", dir: "rtl" }
    }) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await vi.waitFor(() => expect(host.querySelector(".qk-color-picker__content")).not.toBeNull());
    const content = host.querySelector<HTMLElement>(".qk-color-picker__content")!;
    expect(content.dataset.owner).toBe("document-color");
    expect(content.classList.contains("host-color-panel")).toBe(true);
    expect(content.lang).toBe("en");
    expect(content.dir).toBe("rtl");
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("aria-label")).toBe("Cell fill");
    expect(content.getAttribute("data-scope")).toBe("color-picker");
    expect(host.querySelector(".qk-color-picker__trigger")!.getAttribute("aria-controls")).toBe(content.id);
  });

  it.each(["element", "selector"] as const)("mounts the color panel into a host %s portal target", async (targetKind) => {
    const host = document.createElement("div");
    const target = document.createElement("div");
    target.id = "color-picker-host-target";
    document.body.append(host, target);
    const app = createApp({ render: () => h(ColorPicker, {
      open: true, portalTarget: targetKind === "element" ? target : `#${target.id}`
    }) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); target.remove(); });
    await vi.waitFor(() => expect(target.querySelector(".qk-color-picker__content")).not.toBeNull());
    expect(host.querySelector(".qk-color-picker__content")).toBeNull();
    expect(target.querySelector(".qk-color-picker__content")!.getAttribute("role")).toBe("dialog");
  });

  it("takes palette text from the active language and keeps the host reset meaning", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render: () => h(QuireLocaleProvider, { locale: "en" }, () => h(ColorPicker, {
      open: true, portalled: false,
      recentColors: ["#3E63DD"],
      resetLabel: "No fill"
    })) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await vi.waitFor(() => expect(host.querySelector(".qk-color-picker__reset")).not.toBeNull());
    expect(Array.from(host.querySelectorAll(".qk-color-picker__section-title"), element => element.textContent))
      .toEqual(["Recent colors", "Preset colors"]);
    expect(host.querySelector(".qk-color-picker__reset")!.textContent).toBe("No fill");
    expect(host.querySelector(".qk-color-picker__more")!.textContent).toBe("More colors");
    expect(host.querySelector(".qk-color-picker__current")!.textContent).toBe("Current color");
    expect(host.querySelector(".qk-color-picker__trigger")!.getAttribute("aria-label")).toBe("Choose color");
    expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
  });

  it("renders Chinese palette text without a language provider", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render: () => h(ColorPicker, { open: true, portalled: false }) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await vi.waitFor(() => expect(host.querySelector(".qk-color-picker__reset")).not.toBeNull());
    expect(host.querySelector(".qk-color-picker__reset")!.textContent).toBe("无颜色");
    expect(host.querySelector(".qk-color-picker__more")!.textContent).toBe("更多颜色");
  });

  it("clears and reselects the same editable color without losing history or duplicating commits", async () => {
    const fixture = await mountPicker(false);
    await fixture.click(".qk-color-picker__reset");
    expect(fixture.reset).toHaveBeenCalledTimes(1);
    expect(fixture.state.value).toBe("#3E63DD");
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).not.toBeNull();
    fixture.state.open = true;
    await nextTick();
    await fixture.click('[aria-label="#3E63DD"]');
    expect(fixture.committed).toEqual(["#3E63DD"]);
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).toBeNull();
    expect(fixture.state.reset).toBe(false);
    expect(fixture.resetChanges).toEqual([true, false]);
  });

  it("reflects external no-color changes and clears them when the user chooses another color", async () => {
    const fixture = await mountPicker(true);
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).not.toBeNull();
    fixture.state.reset = false;
    await nextTick();
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).toBeNull();
    fixture.state.reset = true;
    await nextTick();
    await fixture.click('[aria-label="#E5484D"]');
    expect(fixture.state.reset).toBe(false);
    expect(fixture.state.value).toBe("#E5484D");
    expect(fixture.committed).toEqual(["#E5484D"]);
    expect(fixture.resetChanges).toEqual([false]);
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).toBeNull();
  });

  it("blocks palette actions when an already-open picker becomes disabled", async () => {
    const fixture = await mountPicker(false);
    fixture.state.disabled = true;
    await nextTick();
    expect(fixture.host.querySelector<HTMLButtonElement>(".qk-color-picker__reset")!.disabled).toBe(true);
    expect(fixture.host.querySelector<HTMLButtonElement>(".qk-color-picker__more")!.disabled).toBe(true);
    await fixture.click(".qk-color-picker__reset");
    await fixture.click('[aria-label="#E5484D"]');
    expect(fixture.reset).not.toHaveBeenCalled();
    expect(fixture.committed).toEqual([]);
    expect(fixture.state.value).toBe("#3E63DD");
  });

  it("keeps controlled no-color authoritative until a precise color edit restores a color", async () => {
    const fixture = await mountPicker(true);
    fixture.state.value = "#E5484D";
    await nextTick();
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).not.toBeNull();
    await fixture.click(".qk-color-picker__more");
    const input = fixture.host.querySelector<HTMLInputElement>('[aria-label="HEX 颜色值"]')!;
    input.value = "#12A594";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await vi.waitFor(() => expect(fixture.state.reset).toBe(false));
    expect(fixture.state.value).toBe("#12A594");
    expect(fixture.host.querySelector(".qk-color-picker__trigger-none")).toBeNull();
  });

  it("disables numeric editor channels when the picker becomes unavailable", async () => {
    const fixture = await mountPicker(false, "rgb");
    await fixture.click(".qk-color-picker__more");
    fixture.state.disabled = true;
    await nextTick();
    const inputs = fixture.host.querySelectorAll<HTMLInputElement>('.qk-color-picker__editor input[role="spinbutton"]');
    expect(inputs).toHaveLength(4);
    for (const input of inputs) expect(input.disabled).toBe(true);
    expect(fixture.state.value).toBe("#3E63DD");
  });

  it("previews complete HEX before blur without committing partial or composing input", async () => {
    const fixture = await mountPicker(false);
    await fixture.click(".qk-color-picker__more");
    const input = fixture.host.querySelector<HTMLInputElement>('[aria-label="HEX 颜色值"]')!;
    // Firefox may remove a focused input without blur when its popup closes.
    for (const event of ["blur", "focusout"]) input.addEventListener(event, e => e.stopImmediatePropagation(), true);
    input.focus();
    for (const value of ["#", "#12", "#12345", "invalid"]) {
      input.value = value; input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      await nextTick(); expect(fixture.state.value).toBe("#3E63DD");
    }
    input.value = "#C8E4D6";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true }));
    await nextTick(); expect(fixture.state.value).toBe("#3E63DD");
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await nextTick(); expect(fixture.state.value).toBe("#C8E4D6");
    expect(input.value).toBe("#C8E4D6"); expect(fixture.committed).toEqual([]);
    input.value = "#12345680"; input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await nextTick(); expect(fixture.state.value).toBe("#12345680"); expect(fixture.committed).toEqual([]);
    fixture.state.disabled = true; await nextTick(); input.value = "#102030";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await nextTick(); expect(fixture.state.value).toBe("#12345680");
  });

  it.each(["hex", "rgb"] as const)("preserves Root read-only semantics for %s and alpha inputs", async format => {
    const changed = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({ render: () => h(ColorPickerRoot, {
      modelValue: "#3E63DD", readOnly: true, inline: true,
      "onUpdate:modelValue": changed
    }, { default: () => h(ColorEditor, { defaultInputFormat: format }) }) });
    app.mount(host);
    cleanup.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    const inputs = host.querySelectorAll<HTMLInputElement>('input[role="spinbutton"], input[data-channel="hex"]');
    expect(inputs).toHaveLength(format === "hex" ? 2 : 4);
    for (const input of inputs) {
      expect(input.readOnly).toBe(true);
      expect(input.disabled).toBe(false);
      input.value = input.dataset.channel === "hex" ? "#102030" : "0";
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    }
    await nextTick();
    expect(changed).not.toHaveBeenCalled();
  });
});
