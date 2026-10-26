// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowRef, type ComputedRef } from "vue";
import { expect, it } from "vitest";
import { provideMenuPortal } from "./portal";

it("inherits one reactive host throughout the menu tree and isolates other roots", async () => {
  const first = document.createElement("div"), second = document.createElement("div");
  const target = shallowRef<HTMLElement | undefined>(first);
  const values: ComputedRef<string | HTMLElement>[] = [];
  const Child = defineComponent({ setup() { values.push(provideMenuPortal(() => undefined)); return () => null; } });
  const Root = defineComponent({ setup() { provideMenuPortal(() => target.value); return () => h(Child); } });
  const app = createApp({ render: () => [h(Root), h(Child)] }), host = document.createElement("div");
  app.mount(host);
  expect(values.map(value => value.value)).toEqual([first, "body"]);
  target.value = second; await nextTick();
  expect(values.map(value => value.value)).toEqual([second, "body"]);
  app.unmount();
});
