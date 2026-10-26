// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowReactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorShellModel } from "../types";
import Switches from "./classic-editor-product-switches.vue";
import { createTheme } from "@quirekit/ui";

const seen = vi.hoisted(() => new Map<string, Record<string, unknown>[]>());
vi.mock("@quirekit/ui/vue", async () => {
  const { defineComponent, h } = await import("vue");
  const passthrough = defineComponent({ setup: (_props, { slots }) => () => h("span", slots.default?.()) });
  return {
    QuireMenu: defineComponent({ inheritAttrs: false, props: ["items", "open"],
      setup: (props, { attrs, slots }) => () => {
        const key = String(attrs["data-classic-switch"]);
        const records = seen.get(key) ?? [];
        records.push({ ...props, ...attrs });
        seen.set(key, records);
        return h("div", slots.trigger?.());
      }
    }),
    QuireIcon: passthrough,
    QuireIconButton: defineComponent({ props: ["label"], setup: (props, { slots }) => () => h("button", { "aria-label": props.label }, slots.default?.()) }),
    QuireTooltipRoot: passthrough,
    QuireTooltipTrigger: passthrough,
    QuireTooltipContent: passthrough
  };
});

const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); seen.clear(); });

/**
 * Reads the checked value of the single radio group a switch menu renders.
 * @param record - Recorded Menu props.
 * @returns Selected value.
 */
function selected(record: Record<string, unknown> | undefined): unknown {
  return (record?.items as readonly { readonly selectedValue?: string }[] | undefined)?.[0]?.selectedValue;
}

it("does not update stable switches on context refresh and keeps language/backend actions live", async () => {
  const update = vi.fn();
  const model = shallowReactive({ locale: "en", backend: "canvas", theme: createTheme(),
    context: { locale: "en", backend: "canvas", instance: { update } }
  } as unknown as ClassicEditorShellModel);
  const host = document.createElement("div");
  const app = createApp(defineComponent({ setup: () => () => h(Switches, { model, locale: model.locale }) }));
  app.mount(host);
  cleanup.push(() => app.unmount());
  const backend = seen.get("backend")!;
  const locale = seen.get("locale")!;
  for (let index = 0; index < 20; index += 1) {
    model.context = { ...model.context! };
    await nextTick();
  }
  expect(backend).toHaveLength(1);
  expect(locale).toHaveLength(1);
  model.context = { ...model.context!, backend: "svg" };
  await nextTick();
  expect(selected(backend.at(-1))).toBe("svg");
  model.locale = "zh-CN";
  model.context = { ...model.context!, locale: "zh-CN" };
  await nextTick();
  expect(selected(locale.at(-1))).toBe("zh-CN");
  expect(locale.at(-1)?.lang).toBe("zh-CN");
  const latestUpdate = vi.fn();
  model.context = { ...model.context!, instance: Object.assign({}, model.context!.instance, { update: latestUpdate }) };
  await nextTick();
  (backend[0]?.onSelect as (value: string) => void)("canvas");
  expect(latestUpdate).toHaveBeenCalledWith({ view: { backend: "canvas" } });
  expect(update).not.toHaveBeenCalled();
  expect(host.querySelector('button[aria-label="Rendering backend: Canvas"], button[aria-label^="渲染"]')).not.toBeNull();
});
