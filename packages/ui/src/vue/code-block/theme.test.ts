// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, shallowRef, type StyleValue, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import CodeBlock from "./code-block.vue";
import ScopedTheme from "./fixtures/scoped-theme.vue";
import { codeBlockColors } from "./appearance";
import type { QuireKitCodeBlockActionsSlotProps } from "./types";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

/** @param render - Reactive public consumer. @returns Connected native host. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

it("keeps a real parent SFC's scoped styles on the business root in every scheme", async () => {
  const state = reactive<{ scheme: "auto" | "light" | "dark" }>({ scheme: "auto" });
  const host = mount(() => h(ScopedTheme, { scheme: state.scheme }));
  const parent = host.querySelector(".scoped-host")!;
  const scope = parent.getAttributeNames().find(name => name.startsWith("data-v-"))!;
  expect(scope).toBeTruthy();
  const root = host.querySelector(".qk-code-block")!;
  for (const scheme of ["auto", "light", "dark", "auto"] as const) {
    state.scheme = scheme;
    await nextTick();
    expect(parent.querySelector(`.scoped-code[${scope}]`)).toBe(root);
    expect(parent.firstElementChild).toBe(root);
  }
});

it("retains explicit colors during code, title and collapse updates without moving root attrs", async () => {
  const state = reactive<{ scheme: "light" | "dark"; code: string; title: string; collapsed: boolean }>({
    scheme: "dark", code: "first", title: "First", collapsed: false
  });
  const clicked = vi.fn();
  let actions: QuireKitCodeBlockActionsSlotProps["contentProps"] = {};
  const host = mount(() => h(CodeBlock, {
    code: state.code, scheme: state.scheme, copy: false, collapsible: true,
    collapsed: state.collapsed, id: "the-code", class: "caller-code", style: { padding: "9px" }, onClick: clicked
  }, {
    title: () => state.title,
    actions: ({ contentProps }: QuireKitCodeBlockActionsSlotProps) => { actions = contentProps; return null; }
  }));
  const root = host.querySelector<HTMLElement>(".qk-code-block")!;
  const pre = root.querySelector("pre")!;
  const paletteNames = new Set(Object.keys(codeBlockColors.dark));
  const writes = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
  state.code = "second";
  await nextTick();
  state.title = "Latest";
  await nextTick();
  pre.focus();
  state.collapsed = true;
  await nextTick();
  expect(writes.mock.calls.filter(([name]) => paletteNames.has(name))).toHaveLength(0);
  expect(pre.textContent).toBe("second");
  expect(root.querySelector(".qk-code-block__title")!.textContent).toBe("Latest");
  expect(pre.hidden).toBe(true);
  expect(document.activeElement).toBe(root.querySelector("[aria-expanded]"));
  expect(root.id).toBe("the-code");
  expect(root.classList.contains("caller-code")).toBe(true);
  expect(root.style.padding).toBe("9px");
  root.click();
  expect(clicked).toHaveBeenCalledOnce();
  const color = "--qk-color-surface-page";
  expect(host.firstElementChild).toBe(root);
  expect(root.style.getPropertyValue(color)).toBe(codeBlockColors.dark[color]);
  expect(root.style.getPropertyValue("--qk-type-code-font-family")).toBe("");
  expect(actions["data-qk-scheme"]).toBe("dark");
  expect(actions.style).toBe(codeBlockColors.dark);

  state.scheme = "light";
  await nextTick();
  expect(host.querySelector(".qk-code-block")).toBe(root);
  expect(root.querySelector("pre")).toBe(pre);
  expect(root.parentElement).toBe(host);
  expect(root.dataset.qkScheme).toBe("light");
  expect(root.style.getPropertyValue(color)).toBe(codeBlockColors.light[color]);
  expect(actions["data-qk-scheme"]).toBe("light");
  expect(actions.style).toBe(codeBlockColors.light);
});

it("inherits in auto and preserves root, slot drafts and focus across every scheme", async () => {
  const state = reactive<{ scheme: "auto" | "light" | "dark" }>({ scheme: "auto" });
  const color = "--qk-color-surface-page";
  let actions: QuireKitCodeBlockActionsSlotProps["contentProps"] = {};
  const host = mount(() => h(CodeBlock, {
    code: "source", copy: false, scheme: state.scheme, style: { [color]: "#123456" }
  }, { actions: ({ contentProps }: QuireKitCodeBlockActionsSlotProps) => {
    actions = contentProps;
    return h("input", { "aria-label": "Action draft" });
  } }));
  const root = host.querySelector<HTMLElement>(".qk-code-block")!;
  const pre = root.querySelector("pre")!;
  const input = root.querySelector("input")!;
  expect(host.firstElementChild).toBe(root);
  expect(root.style.getPropertyValue(color)).toBe("#123456");
  expect(host.querySelector("[data-qk-scheme]")).toBeNull();
  expect(actions).toEqual({});
  input.value = "Unsubmitted draft";
  input.focus();
  pre.scrollTop = 30;

  for (const scheme of ["light", "dark", "auto"] as const) {
    state.scheme = scheme;
    await nextTick();
    expect(host.querySelector(".qk-code-block")).toBe(root);
    expect(root.parentElement).toBe(host);
    expect(root.querySelector("pre")).toBe(pre);
    expect(root.querySelector("input")).toBe(input);
    expect(input.value).toBe("Unsubmitted draft");
    expect(document.activeElement).toBe(input);
    expect(pre.scrollTop).toBe(30);
    expect(root.style.getPropertyValue(color)).toBe("#123456");
    expect(root.dataset.qkScheme).toBe(scheme === "auto" ? undefined : scheme);
    expect(actions).toEqual(scheme === "auto" ? {} : { "data-qk-scheme": scheme, style: codeBlockColors[scheme] });
  }
});

it("retains normalized equivalent styles and restores the palette when caller overrides disappear", async () => {
  const color = "--qk-color-surface-page";
  const style = shallowRef<StyleValue>({ padding: "9px", [color]: "#123456" });
  const scheme = shallowRef<"auto" | "dark">("dark");
  const host = mount(() => h(CodeBlock, { code: "source", copy: false, scheme: scheme.value, style: style.value }));
  const root = host.querySelector<HTMLElement>(".qk-code-block")!;
  const writes = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");

  // These public Vue style forms normalize to the same declarations, even
  // though their object identity, property order and syntax all differ.
  for (const equivalent of [
    { [color]: "#123456", padding: "9px" },
    ["padding: 9px", { [color]: "#123456" }],
    `padding: 9px; ${color}: #123456;`
  ]) {
    style.value = equivalent;
    await nextTick();
    expect(root.style.padding).toBe("9px");
    expect(root.style.getPropertyValue(color)).toBe("#123456");
  }
  expect(writes.mock.calls.filter(([name]) => name.startsWith("--qk-color-"))).toHaveLength(0);

  style.value = { padding: "12px" };
  await nextTick();
  expect(root.style.padding).toBe("12px");
  expect(root.style.getPropertyValue(color)).toBe(codeBlockColors.dark[color]);
  style.value = undefined;
  await nextTick();
  expect(root.style.padding).toBe("");
  expect(root.style.getPropertyValue(color)).toBe(codeBlockColors.dark[color]);

  scheme.value = "auto";
  await nextTick();
  expect(root.style.getPropertyValue(color)).toBe("");
  style.value = { [color]: "#789abc" };
  await nextTick();
  expect(root.style.getPropertyValue(color)).toBe("#789abc");
  style.value = null;
  await nextTick();
  expect(root.style.getPropertyValue(color)).toBe("");
  expect(host.firstElementChild).toBe(root);
});
