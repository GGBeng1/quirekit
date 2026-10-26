// @vitest-environment happy-dom
import { Drawer } from "@ark-ui/vue/drawer";
import { createApp, defineComponent, h, inject, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuireKitDrawerCloseRequest } from "../../components/drawer";
import { drawerInteractionKey } from "./context";
import type { DrawerInteractionContext, DrawerRuntime } from "./types";
import { useDrawerRuntime } from "./use-runtime";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

/**
 * Mounts the real Ark machine without requiring a bundled Vue SFC or browser process.
 * @param controlled - Whether the host owns the open model.
 * @returns Reactive public inputs, the connected machine, and observable events.
 */
async function mountDrawer(controlled = false) {
  const props = reactive({
    open: controlled ? true : undefined as boolean | undefined,
    defaultOpen: true, side: "bottom" as const, dragEnabled: true,
    trapFocus: false, preventScroll: false, modal: false,
    onCloseRequest: undefined as ((request: QuireKitDrawerCloseRequest) => void) | undefined
  });
  const events = {
    updateOpen: vi.fn(), openChange: vi.fn(),
    closeRequest: vi.fn((request: QuireKitDrawerCloseRequest) => props.onCloseRequest?.(request)),
    snapPointChange: vi.fn(), triggerValueChange: vi.fn()
  };
  let runtime!: DrawerRuntime;
  let interaction!: DrawerInteractionContext;
  const content = defineComponent({
    setup() {
      interaction = inject(drawerInteractionKey)!;
      return () => h(Drawer.Content, { draggable: false }, () => [
        h(Drawer.Title, null, () => "Test drawer"), h("input", { "aria-label": "Draft", value: "Keep me" })
      ]);
    }
  });
  const app = createApp(defineComponent({
    setup() {
      runtime = useDrawerRuntime(props, events);
      return () => h(Drawer.RootProvider, { value: runtime.api.value }, () => [
        h(Drawer.Trigger, null, () => "Open"), h(content)
      ]);
    }
  }));
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  cleanups.push(() => { app.unmount(); container.remove(); });
  await nextTick();
  return { props, events, runtime, interaction, container };
}

describe("Drawer guarded Ark adapter", () => {
  it("maps bottom to down and reacts to callback-only drag policy changes", async () => {
    const fixture = await mountDrawer();
    expect(fixture.runtime.api.value.swipeDirection).toBe("down");
    expect(fixture.interaction.dragEnabled.value).toBe(true);
    fixture.props.onCloseRequest = request => request.preventDefault();
    await nextTick();
    expect(fixture.interaction.dragEnabled.value).toBe(false);
    fixture.props.onCloseRequest = undefined;
    await nextTick();
    expect(fixture.interaction.dragEnabled.value).toBe(true);
    fixture.props.dragEnabled = false;
    expect(fixture.interaction.dragEnabled.value).toBe(false);
  });

  it("routes visible close and trigger toggles through the same gate without replacing draft nodes", async () => {
    const fixture = await mountDrawer();
    const input = fixture.container.querySelector("input")!;
    input.value = "Unsaved draft";
    fixture.props.onCloseRequest = request => request.preventDefault();
    const click = () => new PointerEvent("click", { bubbles: true, cancelable: true });
    fixture.runtime.api.value.getCloseTriggerProps().onClick?.(click());
    fixture.runtime.api.value.getTriggerProps().onClick?.(click());
    fixture.runtime.requestClose("cancel");
    await nextTick();
    expect(fixture.events.closeRequest.mock.calls.map(([request]) => request.reason)).toEqual(["close-trigger", "trigger", "cancel"]);
    expect(fixture.events.updateOpen).not.toHaveBeenCalled();
    expect(fixture.runtime.api.value.open).toBe(true);
    expect(fixture.container.querySelector("input")).toBe(input);
    expect(input.value).toBe("Unsaved draft");
    fixture.props.onCloseRequest = undefined;
    expect(fixture.runtime.requestClose("action")).toBe(true);
    await nextTick();
    expect(fixture.runtime.api.value.open).toBe(false);
    expect(fixture.events.openChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("preserves host authority and never rolls back an explicit controlled close", async () => {
    const fixture = await mountDrawer(true);
    fixture.props.onCloseRequest = request => request.preventDefault();
    expect(fixture.runtime.requestClose("programmatic")).toBe(false);
    expect(fixture.runtime.api.value.open).toBe(true);
    fixture.props.open = false;
    await nextTick();
    expect(fixture.runtime.api.value.open).toBe(false);
    expect(fixture.events.closeRequest).toHaveBeenCalledTimes(1);
    expect(fixture.events.updateOpen).not.toHaveBeenCalled();
  });

  it("receives Escape through the real dismissable layer before changing open state", async () => {
    const fixture = await mountDrawer();
    fixture.props.onCloseRequest = request => request.preventDefault();
    await new Promise(resolve => setTimeout(resolve, 50));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await nextTick();
    expect(fixture.events.closeRequest).toHaveBeenCalledTimes(1);
    expect(fixture.events.closeRequest.mock.calls[0]?.[0].reason).toBe("escape");
    expect(fixture.runtime.api.value.open).toBe(true);
    expect(fixture.events.updateOpen).not.toHaveBeenCalled();
  });
});
