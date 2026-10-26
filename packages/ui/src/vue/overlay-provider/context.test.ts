// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it } from "vitest";
import { provideQuireOverlayHost, useQuireOverlayHost } from "./context";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

it("inherits a late-mounted document host, isolates nested owners, and honors explicit overrides", async () => {
  const outer = document.createElement("div"), inner = document.createElement("div"), explicit = document.createElement("div");
  const root = document.createElement("div"); document.body.append(root);
  const target = shallowRef<HTMLElement>();
  const values: ReturnType<typeof useQuireOverlayHost>[] = [];
  const Consumer = defineComponent({
    setup() { values.push(useQuireOverlayHost()); values.push(useQuireOverlayHost(() => explicit)); return () => null; }
  });
  const Inner = defineComponent({
    setup() { provideQuireOverlayHost({ target: () => inner, strategy: "absolute" }); return () => h(Consumer); }
  });
  const app = createApp({ setup() {
    provideQuireOverlayHost({ target: () => target.value, strategy: "absolute" });
    return () => [h(Consumer), h(Inner)];
  } });
  cleanup.push(() => { app.unmount(); root.remove(); }); app.mount(root);
  expect(values.map(value => value.target.value)).toEqual(["body", explicit, inner, explicit]);
  target.value = outer; await nextTick();
  expect(values.map(value => value.target.value)).toEqual([outer, explicit, inner, explicit]);
  expect(values.every(value => value.strategy.value === "absolute")).toBe(true);
});
