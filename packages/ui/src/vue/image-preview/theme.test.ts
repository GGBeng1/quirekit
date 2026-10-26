// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { createTheme } from "../../theme";
import { QuireThemeProvider } from "../theme-provider";
import Preview from "./image-preview.vue";
import { previewColors } from "./appearance";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

it("retains its contrast palette across mask changes, switches scheme and returns focus on close", async () => {
  const state = reactive<{ open: boolean; scheme?: "light" | "dark"; opacity: number; blur: number; title: string }>({
    open: false, opacity: 0.8, blur: 0, title: "First"
  });
  const hostTheme = createTheme({ sources: { primary: "#246b55" } });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(QuireThemeProvider, { theme: hostTheme }, () => [
    h("button", { id: "theme-preview-opener", onClick: () => { state.open = true; } }, "Open preview"),
    h(Preview, {
      open: state.open, ...(state.scheme === undefined ? {} : { scheme: state.scheme }), items: [], toolbar: false,
      maskOpacity: state.opacity, maskBlur: state.blur,
      finalFocusEl: () => host.querySelector<HTMLButtonElement>("button"),
      "onUpdate:open": (open: boolean) => { state.open = open; }
    }, { actions: () => h("span", { "data-preview-action": "" }, state.title) })
  ]) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  const opener = host.querySelector<HTMLButtonElement>("button")!;
  opener.focus();
  opener.click();
  await vi.waitFor(() => expect(document.querySelector(".qk-image-preview")).not.toBeNull());
  const content = document.querySelector<HTMLElement>(".qk-image-preview")!;
  const palette = content.parentElement!;
  const color = "--qk-color-surface-overlay";
  expect(palette.style.getPropertyValue(color)).toBe(previewColors.dark[color]);
  expect(palette.style.display).toBe("contents");
  expect(content.style.getPropertyValue(color)).toBe("");
  expect(palette.style.getPropertyValue("--qk-control-default")).toBe("");
  expect(content.getAttribute("aria-labelledby")).toBe(content.querySelector('[data-part="title"]')!.id);
  const writes = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
  const paletteNames = new Set(Object.keys(previewColors.dark));
  state.opacity = 0.5;
  state.blur = 4;
  state.title = "Latest";
  await nextTick();
  expect(content.querySelector("[data-preview-action]")?.textContent).toBe("Latest");
  expect(content.style.getPropertyValue("--qk-preview-mask-opacity")).toBe("0.5");
  expect(content.style.getPropertyValue("--qk-preview-mask-blur")).toBe("4px");
  expect(writes.mock.calls.filter(([name]) => paletteNames.has(name))).toHaveLength(0);
  state.scheme = "light";
  await nextTick();
  expect(content.parentElement).toBe(palette);
  expect(palette.style.getPropertyValue(color)).toBe(previewColors.light[color]);
  expect(content.dataset.qkScheme).toBe("light");
  expect(writes.mock.calls.some(([name]) => paletteNames.has(name))).toBe(true);
  content.querySelector<HTMLButtonElement>(".qk-image-preview__close")!.click();
  await vi.waitFor(() => expect(document.querySelector(".qk-image-preview")).toBeNull());
  await vi.waitFor(() => expect(document.activeElement === opener).toBe(true));
  opener.click();
  await vi.waitFor(() => expect(document.querySelector(".qk-image-preview")).not.toBeNull());
  expect(document.querySelector<HTMLElement>(".qk-image-preview")!.parentElement!.style.getPropertyValue(color))
    .toBe(previewColors.light[color]);
});

it("lets public content styles override inherited scheme colors while mask props retain authority", async () => {
  const color = "--qk-color-surface-overlay";
  const state = reactive<{ scheme: "light" | "dark"; color: string | undefined }>({
    scheme: "dark", color: "#123456"
  });
  const theme = shallowRef(createTheme());
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(QuireThemeProvider, { theme: theme.value }, () => h(Preview, {
    open: true, items: [], toolbar: false, scheme: state.scheme, maskOpacity: 0.7,
    style: {
      padding: "9px", "--qk-preview-mask-opacity": "0.1",
      ...(state.color === undefined ? {} : { [color]: state.color })
    }
  })) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await vi.waitFor(() => expect(document.querySelector(".qk-image-preview")).not.toBeNull());
  const content = document.querySelector<HTMLElement>(".qk-image-preview")!;
  const palette = content.parentElement!;
  expect(palette.style.getPropertyValue(color)).toBe(previewColors.dark[color]);
  expect(getComputedStyle(content).getPropertyValue(color)).toBe("#123456");
  expect(content.style.padding).toBe("9px");
  expect(content.style.getPropertyValue("--qk-preview-mask-opacity")).toBe("0.7");

  state.scheme = "light";
  theme.value = createTheme({ scheme: "dark" });
  await nextTick();
  expect(content.parentElement).toBe(palette);
  expect(palette.style.getPropertyValue(color)).toBe(previewColors.light[color]);
  expect(getComputedStyle(content).getPropertyValue(color)).toBe("#123456");

  state.color = "#654321";
  await nextTick();
  expect(getComputedStyle(content).getPropertyValue(color)).toBe("#654321");
  state.color = undefined;
  await nextTick();
  expect(content.style.getPropertyValue(color)).toBe("");
  expect(content.parentElement).toBe(palette);
  expect(palette.style.getPropertyValue(color)).toBe(previewColors.light[color]);
});

it("keeps portal placement and focus inside an explicit owner document", async () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const ownerDocument = frame.contentDocument!;
  const host = ownerDocument.createElement("div");
  ownerDocument.body.append(host);
  const app = createApp({
    render: () => h(Preview, {
      portalTarget: ownerDocument.body,
      items: []
    }, {
      default: ({ open }: { open: () => void }) => h("button", {
        id: "foreign-preview-opener",
        onClick: open
      }, "Open preview")
    })
  });
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    frame.remove();
  });

  const opener = ownerDocument.getElementById("foreign-preview-opener") as HTMLButtonElement;
  opener.focus();
  opener.click();
  await vi.waitFor(() => expect(ownerDocument.querySelector(".qk-image-preview")).not.toBeNull());
  expect(document.body.querySelector(".qk-image-preview")).toBeNull();
  const close = ownerDocument.querySelector<HTMLButtonElement>(".qk-image-preview__close")!;
  await vi.waitFor(() => expect(ownerDocument.activeElement).toBe(close));
  close.click();
  await vi.waitFor(() => expect(ownerDocument.querySelector(".qk-image-preview")).toBeNull());
  await vi.waitFor(() => expect(ownerDocument.activeElement).toBe(opener));
});
