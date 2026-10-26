import { Dialog } from "@ark-ui/vue/dialog";
import { Drawer } from "@ark-ui/vue/drawer";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { useModalSurfaceOwner } from "./use-modal-owner";

const Probe = defineComponent({
  setup() {
    const { present: owned } = useModalSurfaceOwner();
    return () => h("span", { "data-modal-owner": String(owned) });
  }
});

describe("Popup modal ownership", () => {
  it("supports a page popup without either optional Ark context", async () => {
    expect(await renderToString(createSSRApp(Probe))).toContain('data-modal-owner="false"');
  });

  it.each([Dialog.Root, Drawer.Root])("recognizes the existing Dialog and independent Drawer providers", async (Root) => {
    const app = createSSRApp({ render: () => h(Root, {}, () => h(Probe)) });
    expect(await renderToString(app)).toContain('data-modal-owner="true"');
  });
});
