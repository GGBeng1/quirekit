// @vitest-environment happy-dom
import { Popover } from "@ark-ui/vue/popover";
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import PopoverContent from "./content.vue";
import PopoverTitle from "./title.vue";
import { usePopoverRuntime } from "./use-runtime";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts real parts with the opening button outside the no-DOM provider.
 * @param controlled - Whether the host starts with an explicit closed request.
 * @returns Observable model events and the same real trigger/content across updates.
 */
async function mountRuntime(controlled: boolean) {
  const state = reactive({ open: controlled ? false : undefined as boolean | undefined, refuseEscape: true });
  const events = {
    updateOpen: vi.fn(), openChange: vi.fn(), interactOutside: vi.fn(),
    escapeKeyDown: vi.fn((event: KeyboardEvent) => { if (state.refuseEscape) event.preventDefault(); })
  };
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup() {
      const props = reactive({ get open() { return state.open; }, defaultOpen: true, portalled: false, autoFocus: false, restoreFocus: false });
      const { api } = usePopoverRuntime(props, events, {
        id: "task-desktop", ids: { trigger: "task-trigger", content: "task-content" }
      });
      return () => [
        h("button", Object.fromEntries(Object.entries(api.value.getTriggerProps()).filter(([, value]) => value !== undefined)), "Options"),
        h(Popover.RootProvider, { value: api.value }, { default: () => h(PopoverContent, {}, { default: () => [
          h(PopoverTitle, {}, () => "Options"), h("input", { "aria-label": "Draft", defaultValue: "Original" })
        ] }) })
      ];
    }
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { state, events, host, trigger: host.querySelector<HTMLButtonElement>("#task-trigger")!, content: host.querySelector<HTMLElement>("#task-content")! };
}

it("keeps the external trigger identity and controlled request authoritative over default true", async () => {
  const { state, events, trigger, content, host } = await mountRuntime(true);
  expect(trigger).not.toBeNull();
  expect(trigger.getAttribute("aria-controls")).toBe(content.id);
  expect(content.dataset.state).toBe("closed");
  expect(events.updateOpen).not.toHaveBeenCalled();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    trigger.click();
    await vi.waitFor(() => expect(events.updateOpen).toHaveBeenLastCalledWith(true));
    expect(content.dataset.state).toBe("closed");
    state.open = true;
    await vi.waitFor(() => expect(content.dataset.state).toBe("open"));
    trigger.click();
    await vi.waitFor(() => expect(events.updateOpen).toHaveBeenLastCalledWith(false));
    expect(content.dataset.state).toBe("open");
    state.open = false;
    await vi.waitFor(() => expect(content.dataset.state).toBe("closed"));
    expect(host.querySelector("#task-trigger")).toBe(trigger);
    expect(host.querySelectorAll("#task-content")).toHaveLength(1);
  }
  expect(events.updateOpen.mock.calls.map(([open]) => open)).toEqual([true, false, true, false]);
  expect(events.openChange.mock.calls).toEqual(events.updateOpen.mock.calls);
});

it("initializes default true once and retains draft nodes through ordinary reopenings", async () => {
  const { events, trigger, content } = await mountRuntime(false);
  expect(content.dataset.state).toBe("open");
  const input = content.querySelector("input")!;
  input.value = "Unsaved";
  for (let cycle = 0; cycle < 2; cycle += 1) {
    trigger.click();
    await vi.waitFor(() => expect(content.dataset.state).toBe("closed"));
    trigger.click();
    await vi.waitFor(() => expect(content.dataset.state).toBe("open"));
    expect(content.querySelector("input")).toBe(input);
    expect(input.value).toBe("Unsaved");
  }
  expect(events.updateOpen.mock.calls.map(([open]) => open)).toEqual([false, true, false, true]);
});

it("forwards the original Escape event exactly once and respects synchronous prevention", async () => {
  const { state, events, content } = await mountRuntime(false);
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  content.dispatchEvent(event);
  expect(events.escapeKeyDown).toHaveBeenCalledExactlyOnceWith(event);
  expect(event.defaultPrevented).toBe(true);
  expect(events.updateOpen).not.toHaveBeenCalled();
  expect(content.dataset.state).toBe("open");
  state.refuseEscape = false;
  content.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(content.dataset.state).toBe("closed"));
  expect(events.updateOpen).toHaveBeenCalledExactlyOnceWith(false);
  expect(events.openChange).toHaveBeenCalledExactlyOnceWith(false);
});
