// @vitest-environment happy-dom
import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorRibbonItemContribution, ClassicEditorToolbarContributionFactory } from "../../../types";
import { mountClassicToolbar } from "./fixture";

const snapshots = vi.hoisted(() => new Map<string, readonly QuireKitToolbarEntry[]>());
vi.mock("@quirekit/ui/vue", async importOriginal => {
  const actual = await importOriginal<typeof import("@quirekit/ui/vue")>();
  const { defineComponent, h } = await import("vue");
  return { ...actual, QuireToolbar: defineComponent({
    inheritAttrs: false, props: ["items", "label"],
    setup: (props, { attrs }) => () => {
      snapshots.set(props.label, props.items);
      return h(actual.QuireToolbar, { ...attrs, items: props.items, label: props.label });
    }
  }) };
});

const cleanups: Array<() => void> = [];
afterEach(async () => {
  cleanups.splice(0).reverse().forEach(dispose => dispose());
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  snapshots.clear();
});

/** @param id - Stable action identity. @returns A conservative legacy callback contribution. */
function control(id: string): Extract<ClassicEditorRibbonItemContribution, { kind: "ribbon-control" }> {
  return { kind: "ribbon-control", id, groupId: "format", label: id, behavior: { execute: () => true } };
}

/** Flushes parent and retained factory projection updates. */
async function flush(): Promise<void> { await nextTick(); await nextTick(); }

it("does not query hidden tabs and rechecks their latest capabilities when activated", async () => {
  const home = control("home-action");
  const hidden = control("hidden-action");
  const fixture = await mountClassicToolbar([home]);
  cleanups.push(fixture.dispose);
  fixture.groups.value = [...fixture.groups.value, { id: "hidden", tabId: "insert", label: "Insert", presentation: "inline", items: [hidden] }];
  fixture.canExecuteContribution.mockClear();
  await flush();
  expect(fixture.canExecuteContribution.mock.calls.every(([behavior]) => behavior === home.behavior)).toBe(true);
  expect(fixture.host.querySelector('[data-action="hidden-action"]')).toBeNull();
  fixture.canExecuteContribution.mockReturnValue(false);
  fixture.model.context = { ...fixture.model.context! };
  fixture.activeTab.value = "insert";
  await flush();
  const button = fixture.host.querySelector('[data-action="hidden-action"]')!;
  expect(button.getAttribute("aria-disabled")).toBe("true");
  fixture.activeTab.value = "home";
  await flush();
  fixture.canExecuteContribution.mockClear();
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(fixture.canExecuteContribution.mock.calls.every(([behavior]) => behavior === home.behavior)).toBe(true);
  expect(fixture.host.querySelector('[data-action="hidden-action"]')).toBe(button);
});

it("queries menu actions only while open and refreshes an open owner on a hidden tab", async () => {
  const action = control("menu-action");
  const fixture = await mountClassicToolbar([action], "menu");
  cleanups.push(fixture.dispose);
  expect(fixture.canExecuteContribution).not.toHaveBeenCalled();
  const trigger = fixture.host.querySelector<HTMLButtonElement>('[data-ribbon-menu="format"]')!;
  const owner = trigger.getAttribute("data-qk-classic-overlay");
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(fixture.canExecuteContribution).not.toHaveBeenCalled();
  trigger.click();
  await flush();
  expect(fixture.canExecuteContribution).toHaveBeenCalled();
  fixture.groups.value = [...fixture.groups.value, { id: "other", tabId: "insert", label: "Insert", presentation: "inline", items: [] }];
  fixture.activeTab.value = "insert";
  fixture.canExecuteContribution.mockReturnValue(false);
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(snapshots.get("home")?.[0]?.items?.[0]?.disabled).toBe(true);
  expect(trigger.getAttribute("data-qk-classic-overlay")).toBe(owner);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
});

it("retains equal visible entries while rechecking unknown callbacks each refresh", async () => {
  const fixture = await mountClassicToolbar([control("apply")]);
  cleanups.push(fixture.dispose);
  const previous = snapshots.get("home")!;
  fixture.canExecuteContribution.mockClear();
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(fixture.canExecuteContribution).toHaveBeenCalled();
  expect(snapshots.get("home")).toBe(previous);
  fixture.canExecuteContribution.mockReturnValue(false);
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(snapshots.get("home")).not.toBe(previous);
  expect(snapshots.get("home")?.[0]?.children?.[0]?.disabled).toBe(true);
});

it("pauses hidden feature item getters while retaining factories, drafts and live surfaces", async () => {
  const reads = vi.fn();
  const destroyed = vi.fn();
  const factory = vi.fn<ClassicEditorToolbarContributionFactory>(state => {
    onBeforeUnmount(destroyed);
    const Field = defineComponent({ setup() { const draft = ref("draft"); return () => h("input", {
      "data-draft": "", value: draft.value, onInput: (event: Event) => { draft.value = (event.target as HTMLInputElement).value; }
    }); } });
    const Surface = defineComponent({ setup: () => () => h("output", { "data-live-surface": "" }, state.context.locale) });
    return { surface: Surface, renderers: { field: Field }, items: computed(() => {
      reads(state.context.locale);
      return [{ value: "field", label: "Draft", kind: "custom", renderer: "field" }];
    }) };
  });
  const fixture = await mountClassicToolbar([control("home")]);
  cleanups.push(fixture.dispose);
  fixture.groups.value = [...fixture.groups.value, { id: "feature", tabId: "insert", label: "Insert", presentation: "inline", items: [
    { kind: "ribbon-widget", id: "feature", groupId: "feature", toolbar: factory }
  ] }];
  await flush();
  expect(factory).toHaveBeenCalledTimes(1);
  expect(reads).not.toHaveBeenCalled();
  expect(fixture.host.querySelector("[data-live-surface]")?.textContent).toBe("en");
  fixture.activeTab.value = "insert";
  await flush();
  const input = fixture.host.querySelector<HTMLInputElement>("[data-draft]")!;
  input.value = "unsaved";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  fixture.activeTab.value = "home";
  await flush();
  reads.mockClear();
  fixture.model.context = { ...fixture.model.context!, locale: "zh-CN" };
  await flush();
  expect(reads).not.toHaveBeenCalled();
  expect(fixture.host.querySelector("[data-live-surface]")?.textContent).toBe("zh-CN");
  fixture.activeTab.value = "insert";
  await flush();
  expect(reads).toHaveBeenLastCalledWith("zh-CN");
  expect(fixture.host.querySelector("[data-draft]")).toBe(input);
  expect(input.value).toBe("unsaved");
  expect(factory).toHaveBeenCalledTimes(1);
  expect(destroyed).not.toHaveBeenCalled();
});

it("retains equal feature presentation but replaces opaque payloads by identity", async () => {
  let payload: unknown = { target: "first" };
  const events: unknown[] = [];
  const factory: ClassicEditorToolbarContributionFactory = state => ({
    items: computed(() => [{
      value: "apply", label: state.context.locale, payload,
      attributes: { "data-feature-action": "" },
      overlayProps: { portalTarget: document.body, contentAttributes: { lang: state.context.locale } }
    }]),
    execute: event => { events.push(event.payload); }
  });
  const fixture = await mountClassicToolbar([{ kind: "ribbon-widget", id: "feature", groupId: "format", toolbar: factory }]);
  cleanups.push(fixture.dispose);
  const previous = snapshots.get("home");
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(snapshots.get("home")).toBe(previous);
  payload = { target: "first" };
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(snapshots.get("home")).not.toBe(previous);
  fixture.host.querySelector<HTMLButtonElement>("[data-feature-action]")!.click();
  expect(events).toEqual([payload]);
  expect(events[0]).toBe(payload);
});

it("refreshes an unknown plain getter on each active context epoch", async () => {
  let externalLabel = "First";
  const reads = vi.fn();
  const factory: ClassicEditorToolbarContributionFactory = () => ({ items: () => {
    reads();
    return [{ value: "external", label: externalLabel, attributes: { "data-external-state": "" } }];
  } });
  const fixture = await mountClassicToolbar([{ kind: "ribbon-widget", id: "external", groupId: "format", toolbar: factory }]);
  cleanups.push(fixture.dispose);
  reads.mockClear();
  externalLabel = "Updated";
  fixture.model.context = { ...fixture.model.context! };
  await flush();
  expect(reads).toHaveBeenCalledTimes(1);
  expect(fixture.host.querySelector("[data-external-state]")?.getAttribute("aria-label")).toBe("Updated");
});
