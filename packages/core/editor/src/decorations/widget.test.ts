import { describe, expect, it, vi } from "vitest";
import { createEditor, createWidgetDecoration } from "../index";

describe("createWidgetDecoration", () => {
  it("reuses renderer identity, defers prop updates, and destroys with editor", async () => {
    const editor = createEditor();
    const updateProps = vi.fn();
    const destroy = vi.fn();
    const renderer = { updateProps, destroy };
    const create = vi.fn(() => renderer);
    const element = {} as HTMLElement;
    const options = {
      editor,
      pos: 1,
      key: "comment-1",
      props: { label: "first" },
      cacheKey: Symbol("widget-test"),
      context: (getPos: () => number | undefined) => ({ getPos }),
      create,
      materialize: () => element
    };
    const first = createWidgetDecoration(options);

    expect(first.render({} as never, () => 1)).toBe(element);
    expect(create).toHaveBeenCalledTimes(1);

    const second = createWidgetDecoration({
      ...options,
      props: { label: "second" }
    });
    await Promise.resolve();

    expect(updateProps).toHaveBeenLastCalledWith({ label: "second" });
    expect(second.render({} as never, () => 2)).toBe(element);
    expect(create).toHaveBeenCalledTimes(1);
    expect(updateProps).toHaveBeenLastCalledWith(expect.objectContaining({
      label: "second",
      getPos: expect.any(Function)
    }));

    editor.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
