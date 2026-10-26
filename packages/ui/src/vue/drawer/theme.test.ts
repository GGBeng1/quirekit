// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { defaultTheme } from "../../theme";
import { QuireThemeProvider } from "../theme-provider";
import DialogRoot from "../dialog/root.vue";
import DialogContent from "../dialog/content.vue";
import DrawerRoot from "./root.vue";
import DrawerContent from "./content.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).reverse().forEach(cleanup => cleanup()));

for (const family of ["dialog", "drawer"] as const) {
  it(`preserves retained ${family} content and draft across closed/open/closed/reopened presence`, async () => {
    const state = reactive({ open: false });
    const host = document.createElement("div");
    document.body.append(host);
    const root = family === "dialog" ? DialogRoot : DrawerRoot;
    const content = family === "dialog" ? DialogContent : DrawerContent;
    const app = createApp({ render: () => h(QuireThemeProvider, { theme: defaultTheme }, () =>
      h(root, { open: state.open, lazyMount: false, unmountOnExit: false, modal: false, trapFocus: false, preventScroll: false }, () =>
        h(content, { title: "Retained task" }, () => h("input", { "aria-label": "Draft", defaultValue: "Start" }))
      )
    ) });
    app.mount(host);
    cleanups.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    const element = document.querySelector<HTMLElement>(`.qk-${family}__content`)!;
    expect(element).not.toBeNull();
    const input = element.querySelector("input")!;
    const scope = element.closest<HTMLElement>("[data-qk-theme-surface]")!;
    expect(scope.style.display).toBe("block");
    for (const open of [true, false, true]) {
      state.open = open;
      await vi.waitFor(() => expect(element.dataset.state).toBe(open ? "open" : "closed"));
      expect(document.querySelector(`.qk-${family}__content`)).toBe(element);
      expect(element.closest("[data-qk-theme-surface]")).toBe(scope);
      expect(element.querySelector("input")).toBe(input);
      if (open && input.value === "Start") input.value = "Kept draft";
      else expect(input.value).toBe("Kept draft");
    }
  });
}

it("keeps dialog form identity, explicit styles and custom portal targets", async () => {
  const state = reactive({ portalled: false, padding: "9px" });
  const host = document.createElement("div");
  const target = document.createElement("section");
  document.body.append(host, target);
  const submit = vi.fn((event: Event) => event.preventDefault());
  const app = createApp({ render: () => h(QuireThemeProvider, { theme: defaultTheme }, () =>
    h(DialogRoot, { open: true, modal: false, trapFocus: false, preventScroll: false }, () =>
      h(DialogContent, {
        title: "Form task", as: "form", portalled: state.portalled, portalTarget: target,
        style: { padding: state.padding, "--qk-color-selection-document": "#123456" }, onSubmit: submit
      }, {
        default: () => h("input", { name: "draft", "aria-label": "Draft", defaultValue: "Initial" }),
        footer: () => h("button", { type: "submit" }, "Save")
      })
    )
  ) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); target.remove(); });
  await nextTick();
  const form = host.querySelector<HTMLFormElement>("form")!;
  const input = form.querySelector("input")!;
  input.value = "Kept draft";
  expect(form.style.padding).toBe("9px");
  expect(form.style.getPropertyValue("--qk-color-selection-document")).toBe("#123456");
  state.portalled = true;
  state.padding = "13px";
  await nextTick();
  expect(target.querySelector("form")).toBe(form);
  expect(form.querySelector("input")).toBe(input);
  expect(input.value).toBe("Kept draft");
  expect(form.style.padding).toBe("13px");
  expect(form.getAttribute("aria-labelledby")).toBe(form.querySelector(".qk-dialog__title")!.id);
  expect(target.querySelector(".qk-dialog__backdrop")?.parentElement).toBe(target.firstElementChild);
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  expect(submit).toHaveBeenCalledOnce();
  state.portalled = false;
  await nextTick();
  expect(host.querySelector("form")).toBe(form);
  expect(target.querySelector("form")).toBeNull();
});

it("keeps the no-provider nested modal control accessible", async () => {
  const state = reactive({ inner: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(DialogRoot, {
    open: true, trapFocus: false, preventScroll: false, restoreFocus: false
  }, () => h(DialogContent, { title: "Outer" }, () => h(DrawerRoot, {
    open: state.inner, trapFocus: false, preventScroll: false, restoreFocus: false
  }, () => h(DrawerContent, { title: "Inner" }, () => "Body")))) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await vi.waitFor(() => expect(host.getAttribute("aria-hidden")).toBe("true"));
  state.inner = true;
  await vi.waitFor(() => expect(document.querySelector(".qk-drawer__content")).not.toBeNull());
  const content = document.querySelector(".qk-drawer__content")!;
  await vi.waitFor(() => expect(content.closest('[aria-hidden="true"]') === null).toBe(true));
  expect(document.querySelector("[data-qk-theme-surface]")).toBeNull();
});
