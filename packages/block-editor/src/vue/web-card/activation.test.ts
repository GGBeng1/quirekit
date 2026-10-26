// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { observeWebPreviewActivation } from "./activation";

it("shares one focus observer across 100 previews and resolves only the final active frame", () => {
  vi.useFakeTimers();
  const listen = vi.spyOn(window, "addEventListener"), unlisten = vi.spyOn(window, "removeEventListener");
  const active = vi.spyOn(document, "activeElement", "get").mockReturnValue(document.body);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  const previews = Array.from({ length: 100 }, () => {
    const frame = document.createElement("iframe"), activate = vi.fn(); document.body.append(frame);
    const release = observeWebPreviewActivation(frame, activate);
    return { frame, activate, release };
  });
  try {
    expect(listen.mock.calls.filter(([event]) => event === "blur")).toHaveLength(1);
    active.mockClear(); window.dispatchEvent(new FocusEvent("blur"));
    active.mockReturnValue(previews[99]!.frame); window.dispatchEvent(new FocusEvent("blur"));
    vi.runAllTimers();
    expect(active).toHaveBeenCalledTimes(1);
    expect(previews[99]!.activate).toHaveBeenCalledOnce();
    expect(previews.slice(0, 99).every(preview => !preview.activate.mock.calls.length)).toBe(true);

    active.mockReturnValue(previews[0]!.frame); document.dispatchEvent(new FocusEvent("focusin"));
    expect(previews[0]!.activate).toHaveBeenCalledOnce();
    active.mockReturnValue(document.body); window.dispatchEvent(new FocusEvent("blur")); vi.runAllTimers();
    expect(previews[0]!.activate).toHaveBeenCalledOnce();
    active.mockReturnValue(previews[99]!.frame); window.dispatchEvent(new FocusEvent("blur"));
    for (const preview of previews) preview.release();
    vi.runAllTimers();
    expect(previews[99]!.activate).toHaveBeenCalledOnce();
    expect(unlisten.mock.calls.filter(([event]) => event === "blur")).toHaveLength(1);
  } finally {
    for (const preview of previews) { preview.release(); preview.frame.remove(); }
    vi.restoreAllMocks(); vi.useRealTimers();
  }
});

it("ignores removed frames and only the current registration may release a frame", () => {
  vi.useFakeTimers();
  const frame = document.createElement("iframe"), old = vi.fn(), current = vi.fn(); document.body.append(frame);
  const active = vi.spyOn(document, "activeElement", "get").mockReturnValue(frame);
  const focused = vi.spyOn(document, "hasFocus").mockReturnValue(true);
  const releaseOld = observeWebPreviewActivation(frame, old), release = observeWebPreviewActivation(frame, current);
  try {
    releaseOld(); document.dispatchEvent(new FocusEvent("focusin"));
    expect(old).not.toHaveBeenCalled(); expect(current).toHaveBeenCalledOnce();
    frame.remove(); window.dispatchEvent(new FocusEvent("blur")); vi.runAllTimers();
    expect(current).toHaveBeenCalledOnce();
  } finally { release(); active.mockRestore(); focused.mockRestore(); frame.remove(); vi.useRealTimers(); }
});

it("tracks only the hovered cross-frame candidate until focus arrives or the pointer or page leaves", () => {
  vi.useFakeTimers();
  const first = document.createElement("iframe"), second = document.createElement("iframe");
  document.body.append(first, second);
  const active = vi.spyOn(document, "activeElement", "get").mockReturnValue(first);
  const focused = vi.spyOn(document, "hasFocus").mockReturnValue(true);
  const activateFirst = vi.fn(), activateSecond = vi.fn();
  const releaseFirst = observeWebPreviewActivation(first, activateFirst), releaseSecond = observeWebPreviewActivation(second, activateSecond);
  try {
    second.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })); active.mockClear();
    vi.advanceTimersToNextFrame();
    expect(active).toHaveBeenCalledTimes(1);
    expect(activateFirst).not.toHaveBeenCalled(); expect(activateSecond).not.toHaveBeenCalled();
    active.mockReturnValue(second); vi.advanceTimersToNextFrame();
    expect(activateSecond).toHaveBeenCalledOnce();
    active.mockClear(); vi.advanceTimersByTime(1000); expect(active).not.toHaveBeenCalled();

    first.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    first.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    active.mockClear(); vi.advanceTimersByTime(1000); expect(active).not.toHaveBeenCalled();
    first.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    focused.mockReturnValue(false); active.mockClear(); vi.advanceTimersByTime(1000);
    expect(active).not.toHaveBeenCalled(); expect(activateFirst).not.toHaveBeenCalled();

    focused.mockReturnValue(true); first.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    releaseFirst(); releaseSecond(); active.mockClear(); vi.advanceTimersByTime(1000);
    expect(active).not.toHaveBeenCalled();
  } finally {
    releaseFirst(); releaseSecond(); first.remove(); second.remove();
    vi.restoreAllMocks(); vi.useRealTimers();
  }
});
