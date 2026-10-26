import { createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it } from "vitest";
import type { QuireKitTaskPresentation } from "../../../../components/task/types";
import { useAdaptivePresentation } from "./use-adaptive-presentation";

for (const requested of ["auto", "desktop", "bottom"] satisfies QuireKitTaskPresentation[]) {
  it(`renders ${requested} without a window and only permits resolved sessions`, async () => {
    const Probe = defineComponent({ setup() {
      const api = useAdaptivePresentation(shallowRef<HTMLElement>(), () => requested);
      expect(typeof window).toBe("undefined");
      expect(api.ready.value).toBe(requested !== "auto");
      expect(api.open()).toBe(requested === "auto" ? undefined : requested);
      return () => h("button", { "data-phase": api.phase.value }, api.resolved.value ?? "pending");
    } });
    const html = await renderToString(createSSRApp(Probe));
    expect(html).toBe(requested === "auto"
      ? '<button data-phase="closed">pending</button>'
      : `<button data-phase="open">${requested}</button>`);
  });
}
