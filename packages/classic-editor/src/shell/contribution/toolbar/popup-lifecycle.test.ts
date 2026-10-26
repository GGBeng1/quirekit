// @vitest-environment happy-dom
import { computed, defineComponent, h, nextTick, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicEditorToolbarContributionFactory } from "../../../types";
import { mountClassicToolbar } from "./fixture";

const cleanups: Array<() => void> = [];
afterEach(async () => {
  cleanups.splice(0).reverse().forEach(dispose => dispose());
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
});

/** Flushes retained factory and tab presentation in their normal Vue order. */
async function flush(): Promise<void> { await nextTick(); await nextTick(); }

it.each([true, false])("keeps an open feature live while hidden and pauses after closing (controlled=%s)", async controlled => {
  const reads = vi.fn();
  const factory: ClassicEditorToolbarContributionFactory = state => {
    const open = ref(false);
    const Body = defineComponent({ props: ["scope"], setup: props => {
      const draft = ref("draft");
      return () => h("div", { "data-feature-body": "" }, [
        h("input", { "data-popup-draft": "", value: draft.value, onInput: (event: Event) => { draft.value = (event.target as HTMLInputElement).value; } }),
        h("button", { "data-popup-close": "", onClick: () => (props.scope as QuireKitToolbarRendererScope).setExpanded(false) }, "Close")
      ]);
    } });
    return { renderers: { body: Body }, items: computed(() => {
      reads(state.context.locale);
      return [{ value: "choices", label: state.context.locale, kind: "selector", contentRenderer: "body",
        attributes: { "data-feature-popup": "" }, ...(controlled ? { expanded: open.value } : {}) }];
    }), openChange: event => { if (controlled) open.value = event.expanded; } };
  };
  const fixture = await mountClassicToolbar([{ kind: "ribbon-widget", id: "feature", groupId: "format", toolbar: factory }]);
  cleanups.push(fixture.dispose);
  fixture.groups.value = [...fixture.groups.value, { id: "other", tabId: "insert", label: "Insert", presentation: "inline", items: [] }];
  fixture.host.querySelector<HTMLButtonElement>("[data-feature-popup]")!.click();
  await vi.waitFor(() => expect(document.querySelector("[data-feature-body]")).not.toBeNull());
  const input = document.querySelector<HTMLInputElement>("[data-popup-draft]")!;
  input.value = "unsaved popup";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
  fixture.activeTab.value = "insert";
  await flush();
  reads.mockClear();
  fixture.model.context = { ...fixture.model.context!, locale: "zh-CN" };
  await flush();
  expect(reads).toHaveBeenLastCalledWith("zh-CN");
  expect(fixture.host.querySelector("[data-feature-popup]")?.getAttribute("aria-label")).toBe("zh-CN");
  expect(document.querySelector("[data-popup-draft]")).toBe(input);
  expect(input.value).toBe("unsaved popup");
  expect(document.activeElement).toBe(input);
  document.querySelector<HTMLButtonElement>("[data-popup-close]")!.click();
  await flush();
  reads.mockClear();
  fixture.model.context = { ...fixture.model.context!, locale: "en" };
  await flush();
  expect(reads).not.toHaveBeenCalled();
});
