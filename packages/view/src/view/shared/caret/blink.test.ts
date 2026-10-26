import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MountedCaretBlink } from "./blink";

describe("MountedCaretBlink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to blink mode and blinks while focused and editable", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      }
    });

    expect(blink.caretMode).toBe("blink");

    blink.syncAfterRender(true, true);

    // The full render already painted the visible caret, so no extra repaint.
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(0);

    vi.advanceTimersByTime(530);
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);

    vi.advanceTimersByTime(530);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(2);

    blink.destroy();
  });

  it("stays visible without blinking while editable but unfocused", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      }
    });

    blink.syncAfterRender(false, true);

    expect(blink.visible).toBe(true);
    expect(repaints).toBe(0);

    vi.advanceTimersByTime(2000);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(0);
  });

  it("hides the caret in read-only/preview views even when focused", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      }
    });

    blink.syncAfterRender(true, false);

    // The render painted a caret, so a repaint is needed to clear it.
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);

    vi.advanceTimersByTime(2000);
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);
  });

  it("keeps a steady caret without blinking regardless of focus", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      },
      mode: "steady"
    });

    expect(blink.caretMode).toBe("steady");

    blink.syncAfterRender(false, true);
    expect(blink.visible).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(0);
  });

  it("never paints the caret in hidden mode", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      },
      mode: "hidden"
    });

    blink.syncAfterRender(true, true);

    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);

    vi.advanceTimersByTime(2000);
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);
  });

  it("applies a runtime mode change and repaints once", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      }
    });

    blink.syncAfterRender(true, true);
    repaints = 0;

    blink.setMode("hidden");
    expect(blink.caretMode).toBe("hidden");
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);

    // Blink timer must have stopped once the caret is hidden.
    vi.advanceTimersByTime(2000);
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(1);

    blink.setMode("steady");
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(2);

    // Re-applying the same mode does not repaint.
    blink.setMode("steady");
    expect(repaints).toBe(2);

    blink.destroy();
  });

  it("repaints and toggles blinking on focus changes", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      }
    });

    blink.syncAfterRender(false, true);
    repaints = 0;

    blink.setFocused(true, true);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(1);

    vi.advanceTimersByTime(530);
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(2);

    blink.setFocused(false, true);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(3);

    vi.advanceTimersByTime(2000);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(3);

    blink.destroy();
  });

  it("repaints visible when the render pass painted a hidden blinking caret", () => {
    let repaints = 0;
    const blink = new MountedCaretBlink({
      repaintOverlay: () => {
        repaints += 1;
      }
    });

    blink.syncAfterRender(true, true);
    vi.advanceTimersByTime(530);
    expect(blink.visible).toBe(false);

    repaints = 0;
    blink.syncAfterRender(true, true, { paintedCaretVisible: false });

    expect(blink.visible).toBe(true);
    expect(repaints).toBe(1);

    vi.advanceTimersByTime(529);
    expect(blink.visible).toBe(true);
    expect(repaints).toBe(1);

    vi.advanceTimersByTime(1);
    expect(blink.visible).toBe(false);
    expect(repaints).toBe(2);

    blink.destroy();
  });
});
