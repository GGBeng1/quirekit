import { describe, expect, it } from "vitest";
import { createAncestorScrollSource } from "./ancestor-scroll-source";

/** Mutable client rectangle used by the fakes. */
interface MutableRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Fake window with listener tracking. */
class FakeWindow {
  innerWidth = 300;
  innerHeight = 400;
  readonly ResizeObserver = undefined;
  private readonly listeners = new Map<string, Array<() => void>>();

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

/** Fake element with a configurable client rect. */
class FakeElement {
  offsetWidth = 0;
  offsetHeight = 0;
  clientWidth = 0;
  clientHeight = 0;
  readonly ownerDocument: { defaultView: FakeWindow };
  private readonly rect: MutableRect;
  private readonly listeners = new Map<string, Array<() => void>>();

  constructor(rect: MutableRect, win: FakeWindow) {
    this.rect = rect;
    this.ownerDocument = { defaultView: win };
  }

  getBoundingClientRect(): MutableRect {
    return this.rect;
  }

  setTop(top: number): void {
    this.rect.top = top;
  }

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

describe("createAncestorScrollSource", () => {
  it("maps a centered and zoomed subtree back into canonical document units", () => {
    const win = new FakeWindow();
    const scroller = new FakeElement({ left: 100, top: 200, width: 600, height: 500 }, win);
    scroller.clientWidth = 600;
    scroller.clientHeight = 500;
    const content = new FakeElement({ left: 200, top: -100, width: 400, height: 1500 }, win);
    content.offsetWidth = 800;
    content.offsetHeight = 3000;
    const source = createAncestorScrollSource({ scroller: scroller as unknown as HTMLElement, content: content as unknown as HTMLElement });
    expect(source.getVisibleRegion()).toEqual({ x: -200, y: 600, width: 1200, height: 1000 });
  });
  it("derives the document slice from an element scroller and content offset", () => {
    const win = new FakeWindow();
    const scroller = new FakeElement({ left: 0, top: 0, width: 300, height: 400 }, win);
    scroller.clientWidth = 300;
    scroller.clientHeight = 400;
    // Content scrolled 250px above the scroller viewport top.
    const content = new FakeElement({ left: 0, top: -250, width: 300, height: 2000 }, win);

    const source = createAncestorScrollSource({
      scroller: scroller as unknown as HTMLElement,
      content: content as unknown as HTMLElement
    });

    expect(source.getVisibleRegion()).toEqual({
      x: 0,
      y: 250,
      width: 300,
      height: 400
    });
  });

  it("tracks scroll changes as the content moves under the scroller", () => {
    const win = new FakeWindow();
    const scroller = new FakeElement({ left: 0, top: 0, width: 300, height: 400 }, win);
    scroller.clientWidth = 300;
    scroller.clientHeight = 400;
    const content = new FakeElement({ left: 0, top: 0, width: 300, height: 2000 }, win);

    const source = createAncestorScrollSource({
      scroller: scroller as unknown as HTMLElement,
      content: content as unknown as HTMLElement
    });

    expect(source.getVisibleRegion().y).toBe(0);
    content.setTop(-600);
    expect(source.getVisibleRegion().y).toBe(600);
  });

  it("notifies on scroller scroll and removes listeners on destroy", () => {
    const win = new FakeWindow();
    const scroller = new FakeElement({ left: 0, top: 0, width: 300, height: 400 }, win);
    const content = new FakeElement({ left: 0, top: 0, width: 300, height: 2000 }, win);

    const source = createAncestorScrollSource({
      scroller: scroller as unknown as HTMLElement,
      content: content as unknown as HTMLElement
    });

    let calls = 0;
    source.subscribe(() => {
      calls += 1;
    });

    scroller.dispatch("scroll");
    expect(calls).toBe(1);
    win.dispatch("resize");
    expect(calls).toBe(2);

    source.destroy();
    scroller.dispatch("scroll");
    win.dispatch("resize");
    expect(calls).toBe(2);
    expect(scroller.listenerCount("scroll")).toBe(0);
    expect(win.listenerCount("resize")).toBe(0);
  });

  it("uses the window viewport when the scroller is the window", () => {
    const win = new FakeWindow();
    const content = new FakeElement({ left: 0, top: -100, width: 300, height: 2000 }, win);

    const source = createAncestorScrollSource({
      scroller: win as unknown as Window,
      content: content as unknown as HTMLElement
    });

    expect(source.getVisibleRegion()).toEqual({
      x: 0,
      y: 100,
      width: 300,
      height: 400
    });
  });
});
