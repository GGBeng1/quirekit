// @vitest-environment happy-dom
import { Drawer } from "@ark-ui/vue/drawer";
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitDrawerCloseRequest } from "../../components/drawer";
import DrawerContent from "./content.vue";
import { useDrawerRuntime } from "./use-runtime";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

it("shares a persistent external trigger through private identity without bypassing controlled closure", async () => {
  const state = reactive({ open: false, refuse: false });
  const requested = vi.fn();
  const closeRequest = vi.fn((request: QuireKitDrawerCloseRequest) => {
    if (state.refuse) request.preventDefault();
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup() {
      const props = reactive({
        get open() { return state.open; }, defaultOpen: true,
        side: "bottom" as const, trapFocus: false, modal: true,
        onCloseRequest: closeRequest
      });
      const { api } = useDrawerRuntime(props, {
        updateOpen: requested, openChange: vi.fn(), closeRequest,
        snapPointChange: vi.fn(), triggerValueChange: vi.fn()
      }, { id: "task-bottom", ids: { trigger: "task-trigger", content: "task-content" } });
      return () => [
        h("button", Object.fromEntries(Object.entries(api.value.getTriggerProps()).filter(([, value]) => value !== undefined)), "Open task"),
        h(Drawer.RootProvider, { value: api.value, lazyMount: false, unmountOnExit: false }, {
          default: () => h(DrawerContent, { title: "Task", portalled: false }, {
            default: () => h("input", { "aria-label": "Draft", defaultValue: "Original" })
          })
        })
      ];
    }
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>('button[data-part="trigger"]')!;
  expect(trigger.id).toBe("task-trigger");
  expect(trigger.getAttribute("aria-controls")).toBe("task-content");
  expect(host.querySelectorAll("#task-trigger")).toHaveLength(1);
  const content = host.querySelector<HTMLElement>("#task-content")!;
  expect(content.dataset.state).toBe("closed");
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(requested).not.toHaveBeenCalled();

  for (let cycle = 0; cycle < 2; cycle += 1) {
    trigger.click();
    await vi.waitFor(() => expect(requested).toHaveBeenLastCalledWith(true));
    expect(content.dataset.state).toBe("closed");
    state.open = true;
    await vi.waitFor(() => expect(content.dataset.state).toBe("open"));
    await vi.waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    const input = content.querySelector("input")!;
    input.value = "Keep draft";
    state.refuse = true;
    trigger.click();
    expect(closeRequest).toHaveBeenLastCalledWith(expect.objectContaining({ reason: "trigger", defaultPrevented: true }));
    expect(content.dataset.state).toBe("open");
    state.refuse = false;
    trigger.click();
    await vi.waitFor(() => expect(requested).toHaveBeenLastCalledWith(false));
    expect(content.dataset.state).toBe("open");
    expect(content.querySelector("input")).toBe(input);
    expect(input.value).toBe("Keep draft");
    state.open = false;
    await vi.waitFor(() => expect(content.dataset.state).toBe("closed"));
    await vi.waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
    expect(host.querySelector("#task-trigger")).toBe(trigger);
  }
  expect(requested.mock.calls.map(([value]) => value)).toEqual([true, false, true, false]);
});
