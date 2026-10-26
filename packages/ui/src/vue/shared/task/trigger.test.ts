// @vitest-environment happy-dom
import { Menu, useMenu } from "@ark-ui/vue/menu";
import { Drawer } from "@ark-ui/vue/drawer";
import { Comment, computed, createApp, defineComponent, Fragment, h, nextTick, reactive, ref, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { AdaptivePresentation } from "./presentation/types";
import type { TaskLifecycle } from "./session/types";
import { useDrawerRuntime } from "../../drawer/use-runtime";
import { useActionMenuKeyboard } from "../../action-menu/keyboard";
import { useAdaptivePresentation } from "./presentation/use-adaptive-presentation";
import { createTaskRequests } from "./session/requests";
import { useTaskLifecycle } from "./session/lifecycle";
import TaskTrigger from "./trigger.vue";

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).reverse().forEach(dispose => dispose());
  vi.restoreAllMocks();
});

/**
 * Mounts the actual trigger around one host button and replaceable machine bindings.
 * @returns Host controls and handler observations.
 */
function mountTrigger() {
  const state = reactive({ disabled: false, refuse: false, childDisabled: false });
  const prepare = vi.fn(() => true);
  const handler = vi.fn();
  const bindings = shallowRef<Record<string, unknown>>({ "aria-controls": "task-content", onClick: handler, onKeydown: handler });
  const element = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(TaskTrigger, {
    id: "shared-trigger", disabled: state.disabled, getBindings: () => bindings.value, prepare, onElement: element
  }, { default: () => h(Fragment, [h(Comment), h("button", {
    id: "consumer-id", type: "submit", "aria-controls": "wrong-content", disabled: state.childDisabled,
    onClick: (event: Event) => { if (state.refuse) event.preventDefault(); }
  }, "Actions")]) }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  return { state, prepare, handler, bindings, element, button: host.querySelector("button")! };
}

it("preserves child cancellation and suppresses disabled and IME machine dispatch", async () => {
  const fixture = mountTrigger();
  expect(fixture.button.id).toBe("shared-trigger");
  expect(fixture.button.type).toBe("button");
  expect(fixture.button.getAttribute("aria-controls")).toBe("task-content");
  fixture.state.refuse = true;
  const cancelled = new MouseEvent("click", { bubbles: true, cancelable: true });
  fixture.button.dispatchEvent(cancelled);
  expect(cancelled.defaultPrevented).toBe(true);
  expect(fixture.prepare).not.toHaveBeenCalled();
  expect(fixture.handler).not.toHaveBeenCalled();
  fixture.state.refuse = false;
  fixture.state.disabled = true;
  await nextTick();
  expect(fixture.button.disabled).toBe(true);
  fixture.button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  expect(fixture.handler).not.toHaveBeenCalled();
  fixture.state.disabled = false;
  fixture.state.childDisabled = true;
  await nextTick();
  fixture.button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  expect(fixture.handler).not.toHaveBeenCalled();
  fixture.state.childDisabled = false;
  await nextTick();
  fixture.button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
  fixture.button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, bubbles: true }));
  expect(fixture.handler).not.toHaveBeenCalled();
  expect(fixture.prepare).not.toHaveBeenCalled();
});

it("uses fresh handlers for the unchanged event before the next render", () => {
  const fixture = mountTrigger();
  const latest = vi.fn();
  fixture.bindings.value = { onClick: latest, onKeydown: latest };
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  fixture.button.dispatchEvent(event);
  expect(fixture.handler).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledExactlyOnceWith(event);
  expect(fixture.prepare).toHaveBeenCalledExactlyOnceWith(event);
  expect(fixture.element).toHaveBeenCalledExactlyOnceWith(fixture.button);
});

it("prepares keyboard opening when the previous surface had no keyboard handler", async () => {
  const fixture = mountTrigger();
  fixture.bindings.value = { onClick: fixture.handler };
  await nextTick();
  const desktop = vi.fn();
  fixture.prepare.mockImplementation(() => {
    fixture.bindings.value = { onClick: desktop, onKeydown: desktop };
    return true;
  });
  const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  fixture.button.dispatchEvent(event);
  expect(fixture.prepare).toHaveBeenCalledExactlyOnceWith(event);
  expect(desktop).toHaveBeenCalledExactlyOnceWith(event);
});

/**
 * Creates two real resident machines with sibling providers and one task-owned trigger.
 * @param mode - Public request model exercised by this fixture.
 * @param initialWidth - Layout viewport used by auto presentation.
 * @returns Physical trigger, lifecycle and original-event delivery observations.
 */
function mountResidentSurfaces(mode: "uncontrolled" | "default-open" | "controlled", initialWidth = 1024) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockReturnValue({
    get matches() { return width >= 768; },
    addEventListener: (_name: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_name: string, callback: () => void) => listeners.delete(callback)
  } as unknown as MediaQueryList);
  const host = document.createElement("div");
  document.body.append(host);
  const props = reactive({ open: mode === "controlled" ? false : undefined, defaultOpen: mode === "default-open" });
  const acknowledge = ref(true);
  const deliveries: Array<{ family: string; event: Event }> = [];
  const machineChanges: unknown[] = [];
  const changes = vi.fn();
  let presentation!: AdaptivePresentation;
  let lifecycle!: TaskLifecycle;
  let surfaceOpen!: () => [boolean, boolean];
  const app = createApp(defineComponent({ setup() {
    const trigger = shallowRef<HTMLElement>();
    presentation = useAdaptivePresentation(trigger, () => "auto");
    lifecycle = useTaskLifecycle({ props, ownerReady: ref(true), presentation,
      requests: createTaskRequests("trigger-fixture"), events: {
        updateOpen: value => { if (mode === "controlled" && acknowledge.value) props.open = value; },
        openChange: changes, begin: vi.fn(), end: vi.fn(), cancel: vi.fn()
      }
    });
    const desktop = useMenu(computed(() => ({
      id: "desktop-task", ids: { trigger: "task-trigger", content: "task-content" },
      open: lifecycle.open.value && presentation.resolved.value === "desktop",
      onOpenChange: (details: { open: boolean }) => {
        machineChanges.push(["menu", details.open, presentation.resolved.value]);
        if (presentation.resolved.value !== "desktop") return;
        if (details.open) lifecycle.requestOpen();
        else lifecycle.requestClose("trigger");
      }
    })));
    const bottom = useDrawerRuntime(reactive({
      get open() { return lifecycle.open.value && presentation.resolved.value === "bottom"; },
      side: "bottom" as const, modal: false, trapFocus: false, preventScroll: false, restoreFocus: false
    }), {
      updateOpen: value => {
        machineChanges.push(["drawer", value, presentation.resolved.value]);
        if (presentation.resolved.value !== "bottom") return;
        if (value) lifecycle.requestOpen(); else lifecycle.acceptClose("trigger");
      },
      openChange: vi.fn(), closeRequest: request => {
        machineChanges.push(["drawer-close", request.reason]);
        lifecycle.guardClose(request);
      }, snapPointChange: vi.fn(), triggerValueChange: vi.fn()
    }, { id: "bottom-task", ids: { trigger: "task-trigger", content: "task-content" } });
    const desktopKeydown = useActionMenuKeyboard(desktop,
      computed(() => lifecycle.open.value && presentation.resolved.value === "desktop"), trigger);
    surfaceOpen = () => [desktop.api.value.open, bottom.api.value.open];
    /** @returns Fresh selected API bindings with transparent event observations. */
    function getBindings() {
      const family = presentation.resolved.value === "bottom" ? "bottom" : "desktop";
      const selected = family === "bottom" ? bottom.api.value : desktop.api.value;
      const bindings = family === "desktop" ? { ...selected.getTriggerProps(), onKeydown: desktopKeydown } : selected.getTriggerProps();
      return Object.fromEntries(Object.entries(bindings).map(([name, value]) => [name,
        typeof value === "function" ? (event: Event) => { deliveries.push({ family, event }); value(event); } : value
      ]));
    }
    return () => [
      h(TaskTrigger, { id: "task-trigger", getBindings,
        prepare: event => presentation.resolveForEvent(event) !== undefined,
        onElement: element => { trigger.value = element; }
      }, { default: () => h("button", "Task actions") }),
      h(Menu.RootProvider, { value: desktop, lazyMount: true, unmountOnExit: true }, { default: () => presentation.resolved.value === "desktop" && presentation.phase.value !== "closed"
        ? h(Menu.Positioner, {}, { default: () => h(Menu.Content, { "aria-label": "Task menu" }, {
          default: () => [
            h(Menu.Item, { value: "disabled-first", disabled: true }, { default: () => "Unavailable first" }),
            h(Menu.Item, { value: "rename" }, { default: () => "Rename" }),
            h(Menu.Item, { value: "export" }, { default: () => "Export" }),
            h(Menu.Item, { value: "disabled-last", disabled: true }, { default: () => "Unavailable last" })
          ]
        }) }) : null }),
      h(Drawer.RootProvider, { value: bottom.api.value, lazyMount: true, unmountOnExit: true }, { default: () => presentation.resolved.value === "bottom" && presentation.phase.value !== "closed"
        ? h(Drawer.Positioner, {}, { default: () => h(Drawer.Content, {}, {
          default: () => [h(Drawer.Title, {}, { default: () => "Task actions" }), h("button", "Rename")]
        }) }) : null })
    ];
  } }));
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  return { host, presentation, lifecycle, deliveries, changes, machineChanges, surfaceOpen, acknowledge, props,
    /**
     * Changes layout media before or together with its browser notification.
     * @param value - Next layout width.
     * @param notify - Whether the normal media listener has run.
     */
    resize(value: number, notify = true) {
      width = value;
      if (notify) listeners.forEach(listener => listener());
    }
  };
}

for (const mode of ["uncontrolled", "default-open", "controlled"] as const) {
  it(`keeps one button and mutually exclusive real sibling APIs for ${mode}`, async () => {
    const fixture = mountResidentSurfaces(mode);
    await nextTick();
    const button = fixture.host.querySelector<HTMLButtonElement>("#task-trigger")!;
    if (mode === "default-open") {
      expect(fixture.surfaceOpen()).toEqual([true, false]);
      fixture.lifecycle.requestClose("cancel");
      fixture.presentation.completeExit("desktop", fixture.presentation.epoch.value);
      await nextTick();
    }
    fixture.resize(390, false);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(fixture.deliveries.filter(delivery => delivery.event === event)).toEqual([{ family: "bottom", event }]);
    expect(fixture.lifecycle.open.value).toBe(true);
    await vi.waitFor(() => expect(fixture.surfaceOpen(), JSON.stringify({
      effectiveOpen: fixture.lifecycle.open.value, resolved: fixture.presentation.resolved.value,
      phase: fixture.presentation.phase.value, changes: fixture.changes.mock.calls, machineChanges: fixture.machineChanges
    })).toEqual([false, true]));
    expect(fixture.host.querySelectorAll("#task-trigger")).toHaveLength(1);
    expect(fixture.host.querySelectorAll("#task-content")).toHaveLength(1);
    expect(button.getAttribute("aria-controls")).toBe("task-content");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    fixture.resize(1024);
    expect(fixture.presentation.resolved.value).toBe("bottom");
    fixture.lifecycle.requestClose("cancel");
    fixture.presentation.completeExit("bottom", fixture.presentation.epoch.value);
    await nextTick();
    expect(fixture.host.querySelector("#task-trigger")).toBe(button);
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    button.focus();
    const reopen = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    button.dispatchEvent(reopen);
    await vi.waitFor(() => expect(fixture.surfaceOpen()).toEqual([true, false]));
    expect(fixture.deliveries.filter(delivery => delivery.event === reopen)).toEqual([{ family: "desktop", event: reopen }]);
  });
}

for (const key of ["ArrowDown", "ArrowUp", "Enter", " "]) {
  it(`opens the real desktop Menu on ${JSON.stringify(key)} while retaining bottom-mode focus`, async () => {
  const fixture = mountResidentSurfaces("uncontrolled", 390);
  await nextTick();
  const button = fixture.host.querySelector<HTMLButtonElement>("#task-trigger")!;
  expect(button.getAttribute("aria-haspopup")).toBe("dialog");
  button.focus();
  expect(document.activeElement).toBe(button);
  fixture.resize(1024, false);
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  button.dispatchEvent(event);
  expect(fixture.deliveries.filter(delivery => delivery.event === event)).toEqual([{ family: "desktop", event }]);
  await vi.waitFor(() => expect(fixture.lifecycle.open.value, JSON.stringify(fixture.machineChanges)).toBe(true));
  await vi.waitFor(() => expect(fixture.surfaceOpen()).toEqual([true, false]));
  await vi.waitFor(() => expect(fixture.host.querySelector<HTMLElement>('[data-highlighted]')?.dataset.value)
    .toBe(key === "ArrowUp" ? "export" : "rename"));
  expect(fixture.host.querySelector("#task-trigger")).toBe(button);
  });
}

it("does not carry a refused keyboard edge into a later controlled opening", async () => {
  const fixture = mountResidentSurfaces("controlled", 390);
  await nextTick();
  fixture.acknowledge.value = false;
  const button = fixture.host.querySelector<HTMLButtonElement>("#task-trigger")!;
  button.focus();
  fixture.resize(1024, false);
  button.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
  await nextTick();
  expect(fixture.lifecycle.open.value).toBe(false);
  expect(fixture.changes).not.toHaveBeenCalled();
  fixture.props.open = true;
  await nextTick();
  await nextTick();
  expect(fixture.surfaceOpen()).toEqual([true, false]);
  expect(fixture.host.querySelector('[data-highlighted]')).toBeNull();
});

it("cancels queued keyboard highlighting when a session closes and reopens before rendering", async () => {
  const fixture = mountResidentSurfaces("uncontrolled", 390);
  await nextTick();
  const button = fixture.host.querySelector<HTMLButtonElement>("#task-trigger")!;
  button.focus();
  fixture.resize(1024, false);
  button.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
  expect(fixture.lifecycle.open.value).toBe(true);
  fixture.lifecycle.requestClose("cancel");
  fixture.lifecycle.requestOpen();
  await nextTick();
  await nextTick();
  expect(fixture.surfaceOpen()).toEqual([true, false]);
  expect(fixture.host.querySelector('[data-highlighted]')).toBeNull();
});
