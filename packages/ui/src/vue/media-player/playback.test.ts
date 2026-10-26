// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { expect, it, vi } from "vitest";
import { useMediaPlayback } from "./playback";

/** @returns Mounted playback owner with controllable native media events. */
function fixture() {
  const element = shallowRef<HTMLMediaElement | null>(document.createElement("audio"));
  let owner!: ReturnType<typeof useMediaPlayback>;
  const host = document.createElement("div");
  const app = createApp({ setup() { owner = useMediaPlayback(element); return () => h("div"); } });
  const pause = vi.spyOn(element.value!, "pause").mockImplementation(() => {});
  const load = vi.spyOn(element.value!, "load").mockImplementation(() => {});
  app.mount(host);
  return { element, owner, app, pause, load };
}

it("does not pretend a rejected play request succeeded and allows retry", async () => {
  const f = fixture();
  vi.spyOn(f.element.value!, "play").mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
  await f.owner.toggle();
  expect(f.owner.state.playing).toBe(false);
  expect(f.owner.state.pending).toBe(false);
  expect(f.owner.state.error).toBe("blocked");
  f.owner.retry(); expect(f.owner.state.error).toBe(null); expect(f.load).toHaveBeenCalledOnce();
  f.app.unmount();
});

it("ignores a late rejection and events from a replaced source and releases media", async () => {
  const f = fixture(), old = f.element.value!;
  let reject!: (error: Error) => void;
  vi.spyOn(old, "play").mockImplementation(() => new Promise<void>((_, fail) => { reject = fail; }));
  const pending = f.owner.toggle();
  const current = document.createElement("video");
  const pause = vi.spyOn(current, "pause").mockImplementation(() => {});
  vi.spyOn(current, "load").mockImplementation(() => {});
  f.element.value = current; await nextTick();
  reject(new Error("Old request")); await pending;
  old.dispatchEvent(new Event("error"));
  expect(f.owner.state.error).toBe(null); expect(f.pause).toHaveBeenCalled();
  f.app.unmount(); expect(pause).toHaveBeenCalled();
});

it("uses native events for time, duration, end and failure, and clamps user changes", async () => {
  const f = fixture(), element = f.element.value!;
  Object.defineProperties(element, { duration: { value: 120, configurable: true }, paused: { value: false, configurable: true } });
  element.currentTime = 32; element.dispatchEvent(new Event("playing"));
  expect(f.owner.state.playing).toBe(true); expect(f.owner.state.time).toBe(32);
  f.owner.seek(200); expect(element.currentTime).toBe(120);
  f.owner.setVolume(-1); expect(element.volume).toBe(0);
  f.owner.toggleMute(); f.owner.setVolume(0.5); expect(element.volume).toBe(0.5); expect(element.muted).toBe(false);
  f.owner.setRate(1.5); expect(element.playbackRate).toBe(1.5);
  element.dispatchEvent(new Event("waiting")); expect(f.owner.state.waiting).toBe(true);
  Object.defineProperty(element, "ended", { value: true }); element.dispatchEvent(new Event("ended"));
  expect(f.owner.state.ended).toBe(true); expect(f.owner.state.waiting).toBe(false);
  element.dispatchEvent(new Event("error")); expect(f.owner.state.error).toBe("load");
  f.app.unmount();
});
