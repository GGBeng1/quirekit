// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import TooltipRoot from "./root.vue";
import TooltipTrigger from "./trigger.vue";
import TooltipContent from "./content.vue";
import { forwardTooltipFocus } from "./focus-reveal";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

/**
 * Mounts the real adapter inside a measured scrollport with a controlled host.
 * @param closeOnScroll - Public scroll-dismissal setting.
 * @returns The host state, native trigger, scrollport and emitted visibility requests.
 */
async function mountTooltip(closeOnScroll = true) {
  const host = document.createElement("main");
  host.style.cssText = "overflow-y:auto;width:600px;height:100px";
  document.body.append(host);
  Object.defineProperties(host, { clientHeight: { value: 100 }, clientWidth: { value: 600 } });
  vi.spyOn(host, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, 0, 600, 100));
  const props = reactive({ open: false, disabled: false, closeOnScroll });
  const changes: boolean[] = [];
  const app = createApp({ render: () => h(TooltipRoot, {
    ...props,
    openDelay: 80,
    "onUpdate:open": (open: boolean) => { changes.push(open); props.open = open; }
  }, { default: () => [
    h(TooltipTrigger, { asChild: true }, () => h("span", { tabindex: 0, role: "button", "aria-disabled": "true" }, "Unavailable")),
    h(TooltipContent, { content: "Reason" })
  ] }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLElement>('[data-part="trigger"]')!;
  vi.spyOn(trigger, "getBoundingClientRect").mockImplementation(() => new DOMRect(20, 150 - host.scrollTop, 100, 28));
  const matches = trigger.matches.bind(trigger);
  vi.spyOn(trigger, "matches").mockImplementation(selector => selector === ":focus-visible" || matches(selector));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  return { host, trigger, props, changes };
}

/** @returns Completion of four paint opportunities, including the reveal's stability window. */
async function settleFrames(): Promise<void> {
  for (let index = 0; index < 4; index++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  await nextTick();
}

it("waits for focus scrolling then emits one controlled open request without moving focus", async () => {
  const { host, trigger, props, changes } = await mountTooltip();
  trigger.focus();
  expect(changes).toEqual([]);
  host.scrollTop = 120;
  host.dispatchEvent(new Event("scroll"));
  await vi.waitFor(() => expect(props.open).toBe(true));
  expect(changes).toEqual([true]);
  expect(document.activeElement).toBe(trigger);
  host.dispatchEvent(new Event("scroll"));
  await vi.waitFor(() => expect(props.open).toBe(false));
  expect(changes.filter(Boolean)).toEqual([true]);
  expect(changes.at(-1)).toBe(false);
});

it("waits for queued scroll events when native focus has already revealed the trigger", async () => {
  const { host, trigger, props, changes } = await mountTooltip();
  // Firefox can update layout before focusin but dispatch scroll only afterwards.
  host.scrollTop = 120;
  trigger.focus();
  await nextTick();
  host.dispatchEvent(new Event("scroll"));
  await settleFrames();
  expect(props.open).toBe(true);
  expect(changes).toEqual([true]);
  expect(document.activeElement).toBe(trigger);
  // After delivery, the same event belongs to Ark's normal dismissal policy.
  host.dispatchEvent(new Event("scroll"));
  await vi.waitFor(() => expect(props.open).toBe(false));
});

it("hands an ordinary visible keyboard target's original FocusEvent to Ark once", async () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  cleanups.push(() => trigger.remove());
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 100, 28));
  const matches = trigger.matches.bind(trigger);
  vi.spyOn(trigger, "matches").mockImplementation(selector => selector === ":focus-visible" || matches(selector));
  const forward = vi.fn();
  let originalEvent: FocusEvent | undefined;
  trigger.addEventListener("focusin", event => {
    originalEvent = event;
    cleanups.push(forwardTooltipFocus(event, forward));
  }, { once: true });
  trigger.focus();
  expect(forward).not.toHaveBeenCalled();
  await settleFrames();
  expect(originalEvent).toBeInstanceOf(FocusEvent);
  expect(forward).toHaveBeenCalledExactlyOnceWith(originalEvent);
  expect(document.activeElement).toBe(trigger);
});

it("ignores boxless toolbar ancestors while preserving the real scrollport", async () => {
  const { host, trigger, props, changes } = await mountTooltip();
  const boxless = document.createElement("div");
  boxless.style.cssText = "display:contents;overflow-x:hidden;overflow-y:hidden";
  host.before(boxless);
  boxless.append(host);
  cleanups.push(() => boxless.remove());
  host.scrollTop = 120;
  trigger.focus();
  await vi.waitFor(() => expect(props.open).toBe(true));
  expect(changes).toEqual([true]);
  expect(document.activeElement).toBe(trigger);
});

for (const revealedBeforeFocus of [false, true]) {
  for (const type of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
    it(`cancels pending focus on ${type}, already revealed=${revealedBeforeFocus}`, async () => {
      const { host, trigger, changes } = await mountTooltip();
      if (revealedBeforeFocus) host.scrollTop = 120;
      trigger.focus();
      document.dispatchEvent(type === "keydown" ? new KeyboardEvent(type, { key: "Escape", bubbles: true }) : new Event(type, { bubbles: true }));
      await settleFrames();
      expect(changes).toEqual([]);
    });
  }
}

it("cancels pending focus on blur and on dynamic disabled changes", async () => {
  const { trigger, props, changes } = await mountTooltip();
  trigger.focus();
  trigger.blur();
  await settleFrames();
  expect(changes).toEqual([]);
  trigger.focus();
  props.disabled = true;
  await settleFrames();
  expect(changes).toEqual([]);
});

it("preserves host control when an explicit open is withdrawn during the reveal", async () => {
  const { trigger, props, changes } = await mountTooltip();
  props.open = true;
  await nextTick();
  trigger.focus();
  props.open = false;
  await settleFrames();
  expect(props.open).toBe(false);
  expect(changes).toEqual([]);
});

it("keeps closeOnScroll=false immediate and ignores later ancestor scrolling", async () => {
  const { host, trigger, props, changes } = await mountTooltip(false);
  trigger.focus();
  await vi.waitFor(() => expect(props.open).toBe(true));
  host.dispatchEvent(new Event("scroll"));
  await settleFrames();
  expect(props.open).toBe(true);
  expect(changes).toEqual([true]);
});

it("explains a focused trigger larger than its scrollport when part remains visible", async () => {
  const { trigger, props, changes } = await mountTooltip();
  vi.mocked(trigger.getBoundingClientRect).mockImplementation(() => new DOMRect(20, 20, 100, 140));
  trigger.focus();
  await vi.waitFor(() => expect(props.open).toBe(true));
  expect(changes).toEqual([true]);
  expect(document.activeElement).toBe(trigger);
});

it("does not treat a display-contents wrapper as a clipping scrollport", async () => {
  const { host, trigger, props, changes } = await mountTooltip();
  host.scrollTop = 120;
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:contents;overflow-x:hidden;overflow-y:hidden";
  trigger.before(wrapper);
  wrapper.append(trigger);
  trigger.focus();
  await vi.waitFor(() => expect(props.open).toBe(true));
  expect(changes).toEqual([true]);
  expect(document.activeElement).toBe(trigger);
});

it("does not show a focus explanation when the trigger remains completely clipped", async () => {
  const { trigger, changes } = await mountTooltip();
  trigger.focus();
  await settleFrames();
  expect(changes).toEqual([]);
});

it("preserves Ark cancellation when scrolling during the hover opening delay", async () => {
  const { host, trigger, changes } = await mountTooltip();
  trigger.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
  await nextTick();
  host.dispatchEvent(new Event("scroll"));
  await new Promise(resolve => setTimeout(resolve, 120));
  expect(changes).toContain(false);
  expect(changes).not.toContain(true);
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
});

it("disposes a pending focus callback when its trigger unmounts", async () => {
  const { trigger, changes } = await mountTooltip();
  trigger.focus();
  cleanups.pop()!();
  await settleFrames();
  expect(changes).toEqual([]);
});
