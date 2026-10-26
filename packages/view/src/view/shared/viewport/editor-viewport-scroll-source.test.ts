import { describe, expect, it } from "vitest";
import { createEditorViewportScrollSource } from "./editor-viewport-scroll-source";

/** Minimal fake scrollable element for scroll-source tests. */
class FakeViewport {
  scrollLeft = 0;
  scrollTop = 0;
  clientWidth = 300;
  clientHeight = 400;
  private readonly listeners = new Map<string, Array<() => void>>();
  readonly ownerDocument = { defaultView: undefined };

  addEventListener(type: string, listener: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((entry) => entry !== listener)
    );
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }
}

describe("createEditorViewportScrollSource", () => {
  it("reports the visible region from scroll offset and client size", () => {
    const viewport = new FakeViewport();
    viewport.scrollLeft = 12;
    viewport.scrollTop = 250;

    const source = createEditorViewportScrollSource({
      viewport: viewport as unknown as HTMLElement
    });

    expect(source.getVisibleRegion()).toEqual({
      x: 12,
      y: 250,
      width: 300,
      height: 400
    });
  });

  it("tracks scroll changes through the visible region", () => {
    const viewport = new FakeViewport();
    const source = createEditorViewportScrollSource({
      viewport: viewport as unknown as HTMLElement
    });

    viewport.scrollTop = 500;
    expect(source.getVisibleRegion().y).toBe(500);
  });

  it("notifies subscribers on scroll and stops after unsubscribe and destroy", () => {
    const viewport = new FakeViewport();
    const source = createEditorViewportScrollSource({
      viewport: viewport as unknown as HTMLElement
    });

    let calls = 0;
    const unsubscribe = source.subscribe(() => {
      calls += 1;
    });

    viewport.dispatch("scroll");
    expect(calls).toBe(1);

    unsubscribe();
    viewport.dispatch("scroll");
    expect(calls).toBe(1);

    source.subscribe(() => {
      calls += 1;
    });
    source.destroy();
    viewport.dispatch("scroll");
    expect(calls).toBe(1);
    expect(viewport.listenerCount("scroll")).toBe(0);
  });
});
