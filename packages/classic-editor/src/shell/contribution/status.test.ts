// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext, ClassicEditorStatusItemContribution } from "../../types";
import { destroyRenderedStatus, renderStatus } from "./status";

/** Minimal context; status rendering only reads the owner document. */
const context = { ownerDocument: document } as unknown as ClassicEditorRenderContext;

describe("renderStatus", () => {
  it("rebuilds plain items and keeps mounted items, updating them on later refreshes", () => {
    const host = document.createElement("div");
    const update = vi.fn();
    const destroy = vi.fn();
    const mount = vi.fn(() => ({ element: document.createElement("button"), update, destroy }));
    let words = 1;
    const items: ClassicEditorStatusItemContribution[] = [
      { kind: "status-item", id: "words", render: () => `${words} words` },
      { kind: "status-item", id: "mounted", render: mount }
    ];
    renderStatus(host, items, context);
    const mounted = host.querySelector("[data-status-id=mounted]");
    words = 2;
    renderStatus(host, items, context);

    expect(host.textContent).toBe("2 words");
    expect(mount).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(host.querySelector("[data-status-id=mounted]")).toBe(mounted);
  });

  it("destroys a mounted item when it disappears or the shell is torn down", () => {
    const host = document.createElement("div");
    const destroy = vi.fn();
    const item: ClassicEditorStatusItemContribution = {
      kind: "status-item", id: "mounted", render: () => ({ element: "x", destroy })
    };
    renderStatus(host, [item], context);
    renderStatus(host, [], context);
    expect(destroy).toHaveBeenCalledTimes(1);

    renderStatus(host, [item], context);
    destroyRenderedStatus(host);
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(host.childNodes).toHaveLength(0);
  });
});
