// @vitest-environment happy-dom
import { Drawer } from "@ark-ui/vue/drawer";
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import DrawerRoot from "./root.vue";
import DrawerContent from "./content.vue";
import DrawerContentFrame from "./content-frame.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

it("places the private complete header outside the one scroll body and preserves search identity", async () => {
  const state = reactive({ error: "", query: "Draft", portalled: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(DrawerRoot, {
    defaultOpen: true, side: "bottom", modal: false, trapFocus: false, preventScroll: false,
    onCloseRequest: request => request.preventDefault()
  }, { default: () => h(DrawerContentFrame, {
    title: "Task", portalled: state.portalled, contentClass: "task-surface", contentStyle: { maxHeight: "480px" }
  }, {
    header: () => h("header", { "data-task-header": "" }, [
      h(Drawer.Title, {}, () => "Search task"),
      h("input", { "aria-label": "Search", value: state.query })
    ]),
    default: () => h("button", "Candidate"),
    footer: () => [h("span", { role: state.error ? "alert" : "status" }, state.error || "Ready"), h("button", "Confirm")]
  }) }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const content = host.querySelector<HTMLElement>(".qk-drawer__content")!;
  const header = content.querySelector<HTMLElement>("[data-task-header]");
  expect(header).not.toBeNull();
  expect([...content.children]).toEqual([header, content.querySelector(".qk-drawer__body"), content.querySelector(".qk-drawer__footer")]);
  expect(content.classList.contains("task-surface")).toBe(true);
  expect(content.style.maxHeight).toBe("480px");
  const input = header!.querySelector("input")!;
  expect(input.closest(".qk-drawer__body,.qk-drawer__header-actions")).toBeNull();
  expect(content.getAttribute("aria-labelledby")).toBe(header!.querySelector('[data-part="title"]')!.id);
  state.error = "Try again";
  state.query = "Keep typing";
  state.portalled = true;
  await nextTick();
  expect(document.querySelector(".qk-drawer__content")).toBe(content);
  expect(content.parentElement!.parentElement).toBe(document.body);
  expect(content.querySelector("input")).toBe(input);
  expect(input.value).toBe("Keep typing");
  state.portalled = false;
  await nextTick();
  expect(host.querySelector(".qk-drawer__content")).toBe(content);
});

it("preserves public headerActions, footer, guarded close and the absence of a public header override", async () => {
  const requested = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(DrawerRoot, {
    defaultOpen: true, side: "bottom", modal: false, trapFocus: false, preventScroll: false,
    onCloseRequest: request => { requested(request); request.preventDefault(); }
  }, { default: () => h(DrawerContent, { title: "Public title", description: "Details", portalled: false }, {
    default: () => h("input", { "aria-label": "Draft" }),
    headerActions: () => h("button", "Header action"),
    header: () => h("header", "Unsupported header"),
    footer: () => h("button", "Finish")
  }) }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const content = host.querySelector<HTMLElement>(".qk-drawer__content")!;
  expect(content.children).toHaveLength(3);
  expect(content.querySelector(".qk-drawer__title")?.textContent).toBe("Public title");
  expect(content.textContent).not.toContain("Unsupported header");
  expect(content.querySelector(".qk-drawer__header-actions")?.textContent).toContain("Header action");
  expect(content.querySelector(".qk-drawer__footer")?.textContent).toBe("Finish");
  expect(content.querySelector(".qk-drawer__grabber")).toBeNull();
  const input = content.querySelector("input");
  content.querySelector<HTMLButtonElement>(".qk-drawer__close-trigger")!.click();
  expect(requested).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ reason: "close-trigger", defaultPrevented: true }));
  expect(content.dataset.state).toBe("open");
  expect(content.querySelector("input")).toBe(input);
});
