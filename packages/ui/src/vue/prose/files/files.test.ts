// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { expect, it, vi } from "vitest";
import { QuireProseFiles } from "../index";

it("mounts only the selected source and replaces it when the reader chooses another file", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const state = reactive({ files: ["editor.vue", "create.ts"] });
  const rendered: string[] = [];
  const app = createApp({ render: () => h(QuireProseFiles, { files: state.files }, {
    default: ({ file }: { file: string }) => { rendered.push(file); return h("code", file); },
  }) });
  app.mount(host);
  try {
    await nextTick();
    expect(host.querySelectorAll("code")).toHaveLength(1);
    expect(host.querySelector("code")?.textContent).toBe("editor.vue");
    expect(rendered).not.toContain("create.ts");
    host.querySelector<HTMLButtonElement>("[role=combobox]")!.click();
    await vi.waitFor(() => expect(document.querySelector('[role=option][data-value="create.ts"]')).not.toBeNull());
    (document.querySelector('[role=option][data-value="create.ts"]') as HTMLElement).click();
    await vi.waitFor(() => expect(host.querySelector("code")?.textContent).toBe("create.ts"));
    expect(host.querySelectorAll("code")).toHaveLength(1);
    state.files = ["replacement.ts"];
    await nextTick();
    expect(host.querySelector("code")?.textContent).toBe("replacement.ts");
    expect(host.querySelector("[role=combobox]")).toBeNull();
    state.files = [];
    await nextTick();
    expect(host.querySelector("code")).toBeNull();
  } finally { app.unmount(); host.remove(); }
});
