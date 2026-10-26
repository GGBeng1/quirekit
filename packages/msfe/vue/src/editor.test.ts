import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import { createMsfeEditor } from "@quirekit/msfe-core";
import { useMsfeEditor } from "./editor";

const lifecycle = vi.hoisted(() => ({ mounted: [] as (() => void)[], unmounted: [] as (() => void)[] }));
vi.mock("vue", async original => ({
  ...await original<typeof import("vue")>(),
  onMounted: (callback: () => void) => lifecycle.mounted.push(callback),
  onUnmounted: (callback: () => void) => lifecycle.unmounted.push(callback),
}));
vi.mock("@quirekit/msfe-core", async original => ({
  ...await original<typeof import("@quirekit/msfe-core")>(), createMsfeEditor: vi.fn(),
}));

beforeEach(() => { lifecycle.mounted.length = 0; lifecycle.unmounted.length = 0; vi.resetAllMocks(); });

describe("Vue editor mount failure", () => {
  it("reports failed creation once to the supplied error handler and releases the component host", () => {
    const failure = new Error("editor-not-created"), onError = vi.fn();
    vi.mocked(createMsfeEditor).mockImplementation(() => { throw failure; });
    const session = useMsfeEditor(shallowRef({} as HTMLElement), () => ({ markdown: "Preserve **this**.", onError }));
    const destroy = vi.spyOn(session.host, "destroy");
    expect(() => lifecycle.mounted[0]!()).not.toThrow();
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(session.editor.value).toBeUndefined();
    expect(destroy).toHaveBeenCalledOnce();
    expect(() => lifecycle.unmounted[0]!()).not.toThrow();
  });

  it("keeps failures observable to Vue when a host has not supplied an error handler", () => {
    const failure = new Error("invalid-extension");
    vi.mocked(createMsfeEditor).mockImplementation(() => { throw failure; });
    useMsfeEditor(shallowRef({} as HTMLElement), () => ({ markdown: "Original" }));
    expect(() => lifecycle.mounted[0]!()).toThrow(failure);
  });
});
