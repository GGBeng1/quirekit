// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { expect, it, vi } from "vitest";
import Toolbar from "../toolbar.vue";
import Action from "../toolbar-action.vue";
import type { QuireKitToolbarExecuteEvent } from "../../../components/toolbar/types";
import type { QuireKitToolbarRendererScope } from "./types";

it("routes renderer parameters and fresh context, then rejects disabled or removed callbacks", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const context = ref({ revision: 1 });
  const disabled = ref(false);
  const hidden = ref(false);
  const events: QuireKitToolbarExecuteEvent[] = [];
  let captured: QuireKitToolbarRendererScope | undefined;
  const custom = defineComponent({
    props: ["scope"],
    setup: props => () => {
      captured = props.scope;
      return h(Action, {
        label: `Revision ${(props.scope.context as { revision: number }).revision}`,
        disabled: props.scope.disabled,
        onActivate: () => props.scope.execute({ amount: 12 })
      });
    }
  });
  const app = createApp({ render: () => h(Toolbar, {
    label: "Configured", context: context.value, renderers: { custom },
    items: [{ value: "format", label: "Format", kind: "group", disabled: disabled.value, children: [
      { value: "custom", label: "Custom", kind: "custom", renderer: "custom", hidden: hidden.value, meta: { command: "spacing" } }
    ] }], onExecute: (event: QuireKitToolbarExecuteEvent) => events.push(event)
  }) });
  try {
    app.mount(host);
    await nextTick();
    host.querySelector("button")!.click();
    expect(events[0]).toMatchObject({ value: "custom", path: ["format", "custom"], source: "custom", payload: { amount: 12 }, item: { meta: { command: "spacing" } } });
    context.value = { revision: 2 };
    await nextTick();
    expect(host.querySelector("button")!.getAttribute("aria-label")).toBe("Revision 2");
    disabled.value = true;
    await nextTick();
    captured!.execute("late");
    expect(events).toHaveLength(1);
    disabled.value = false;
    await nextTick();
    const oldScope = captured!;
    hidden.value = true;
    await nextTick();
    oldScope.execute("removed");
    expect(events).toHaveLength(1);
    expect(host.querySelector("button")).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it("keeps split primary and popup payloads distinct and supports controlled popup state", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const open = ref(false);
  const transitions: boolean[] = [];
  const events: QuireKitToolbarExecuteEvent[] = [];
  const Body = defineComponent({ props: ["scope"], setup: props => () => h("button", {
    "data-test-apply": "", onClick: () => { props.scope.execute(24); props.scope.setExpanded(false); }
  }, "Apply size") });
  const app = createApp({ render: () => h(Toolbar, {
    label: "Split", renderers: { body: Body }, items: [{ value: "size", label: "Size", kind: "split", text: "Size",
      actionLabel: "Current size", disclosureLabel: "Choose size", payload: 16, contentRenderer: "body", expanded: open.value }],
    onExecute: (event: QuireKitToolbarExecuteEvent) => events.push(event),
    onOpenChange: (event: { expanded: boolean }) => { transitions.push(event.expanded); open.value = event.expanded; }
  }) });
  try {
    app.mount(host);
    await nextTick();
    host.querySelector<HTMLButtonElement>('[aria-label="Current size"]')!.click();
    expect(events[0]).toMatchObject({ value: "size", source: "action", payload: 16 });
    host.querySelector<HTMLButtonElement>('[aria-label="Choose size"]')!.click();
    await vi.waitFor(() => expect(document.querySelector("[data-test-apply]")).not.toBeNull());
    expect(open.value).toBe(true);
    document.querySelector<HTMLButtonElement>("[data-test-apply]")!.click();
    await nextTick();
    expect(events[1]).toMatchObject({ value: "size", source: "popup", payload: 24 });
    expect(open.value).toBe(false);
    expect(transitions).toEqual([true, false]);
    await vi.waitFor(() => expect(document.querySelector("[data-test-apply]")).toBeNull());
  } finally { app.unmount(); host.remove(); }
});

it("preserves only primary mouse button focus and leaves inputs and touch alone", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(Toolbar, { label: "Focus", preserveFocus: true }, {
    default: () => [h(Action, { label: "Save" }), h("input")]
  }) });
  try {
    app.mount(host);
    await nextTick();
    for (const [selector, pointerType, button, prevented] of [
      ["button", "mouse", 0, true], ["button", "touch", 0, false], ["button", "mouse", 2, false], ["input", "mouse", 0, false]
    ] as const) {
      const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType, button });
      host.querySelector(selector)!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(prevented);
    }
  } finally { app.unmount(); host.remove(); }
});

it("renders split menus with distinct leaf intent and independent primary availability", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const events: QuireKitToolbarExecuteEvent[] = [];
  const disabled = ref(true);
  const app = createApp({ render: () => h(Toolbar, {
    label: "Review", items: [{ value: "accept", label: "Accept", kind: "split", text: "Accept",
      actionLabel: "Current change", disclosureLabel: "Accept options", actionDisabled: disabled.value,
      payload: { document: "source" }, overlayProps: { contentAttributes: { "data-owner": "review" } },
      items: [{ value: "accept-all", label: "Accept all changes" }] }],
    onExecute: (event: QuireKitToolbarExecuteEvent) => events.push(event)
  }) });
  try {
    app.mount(host); await nextTick();
    host.querySelector<HTMLButtonElement>('[aria-label="Current change"]')!.click();
    expect(events).toHaveLength(0);
    host.querySelector<HTMLButtonElement>('[aria-label="Accept options"]')!.click();
    await vi.waitFor(() => expect(document.querySelector('[role="menuitem"]')).not.toBeNull());
    expect(document.querySelector('[role="menu"]')?.getAttribute("data-owner")).toBe("review");
    document.querySelector<HTMLElement>('[role="menuitem"]')!.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({ value: "accept-all", source: "menu", path: ["accept", "accept-all"], payload: { document: "source" }, item: { value: "accept" } });
    disabled.value = false; await nextTick();
    host.querySelector<HTMLButtonElement>('[aria-label="Current change"]')!.click();
    expect(events[1]).toMatchObject({ value: "accept", source: "action" });
  } finally { app.unmount(); host.remove(); }
});
