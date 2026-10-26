// @vitest-environment happy-dom
import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicEditorRibbonWidgetContribution, ClassicEditorToolbarContributionFactory } from "../../../types";
import { mountClassicToolbar } from "./fixture";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

it("retains a factory across context refreshes, renders individual controls and releases removed lifecycle", async () => {
  const destroyed = vi.fn();
  const events: QuireKitToolbarExecuteEvent[] = [];
  const locales: string[] = [];
  const factory = vi.fn<ClassicEditorToolbarContributionFactory>(state => {
    const open = ref(false);
    const context = { label: "Feature context" };
    const Body = defineComponent({ props: ["scope"], setup: props => () => h("button", {
      "data-feature-apply": "", onClick: () => {
        const scope = props.scope as QuireKitToolbarRendererScope;
        scope.execute({ size: 24 });
        scope.setExpanded(false);
      }
    }, props.scope.context.label) });
    const Surface = defineComponent({ props: ["context"], render() { return h("output", { "data-feature-surface": "" }, this.context.label); } });
    onBeforeUnmount(destroyed);
    return {
      context, surface: Surface, renderers: { body: Body },
      items: computed(() => [
        { value: "apply", label: `Apply ${state.context.locale}`, attributes: { "data-feature-apply-trigger": "" } },
        { value: "choices", label: "Choices", kind: "group", children: [
          { value: "size", label: "Choose size", kind: "selector", text: "16", contentRenderer: "body", expanded: open.value, meta: { command: "size" } }
        ] }
      ]),
      execute: event => { locales.push(state.context.locale); events.push(event); },
      openChange: event => { open.value = event.expanded; }
    };
  });
  const legacy = vi.fn(() => ({ element: null, update: vi.fn(), destroy: vi.fn() }));
  const contribution: ClassicEditorRibbonWidgetContribution = { kind: "ribbon-widget", id: "font", groupId: "format", toolbar: factory, mount: legacy };
  const fixture = await mountClassicToolbar([contribution]);
  cleanup.push(fixture.dispose);
  expect(factory).toHaveBeenCalledTimes(1);
  expect(legacy).not.toHaveBeenCalled();
  expect(fixture.host.querySelectorAll("[data-qk-toolbar-item]")).toHaveLength(2);
  expect(fixture.host.querySelector("[data-ribbon-widget]")).toBeNull();
  expect(fixture.host.querySelector("[data-feature-surface]")?.closest('[role="toolbar"]')).toBeNull();
  const action = fixture.host.querySelector<HTMLButtonElement>("[data-feature-apply-trigger]")!;
  fixture.model.context = { ...fixture.model.context!, locale: "zh-CN" };
  await nextTick();
  await nextTick();
  expect(factory).toHaveBeenCalledTimes(1);
  expect(fixture.host.querySelector("[data-feature-apply-trigger]")).toBe(action);
  expect(action.getAttribute("aria-label")).toBe("Apply zh-CN");
  action.click();
  expect(locales).toEqual(["zh-CN"]);
  fixture.host.querySelector<HTMLButtonElement>('[aria-label="Choose size"]')!.click();
  await vi.waitFor(() => expect(document.querySelector("[data-feature-apply]")).not.toBeNull());
  const apply = document.querySelector<HTMLButtonElement>("[data-feature-apply]")!;
  expect(apply.textContent).toBe("Feature context");
  apply.click();
  await nextTick();
  expect(events[1]).toMatchObject({ value: "size", item: { value: "size", meta: { command: "size" } }, path: ["choices", "size"], payload: { size: 24 }, source: "popup" });
  await vi.waitFor(() => expect(document.querySelector("[data-feature-apply]")).toBeNull());
  fixture.groups.value = [];
  await nextTick();
  expect(destroyed).toHaveBeenCalledTimes(1);
  expect(fixture.host.querySelector("[data-feature-surface]")).toBeNull();
});
