import { onBeforeUnmount, reactive, watch, type ShallowRef } from "vue";
import type { QuireKitMediaPlaybackState } from "../../components/media-player";

/** @returns Initial observations before a resource has provided metadata. */
function initial(): QuireKitMediaPlaybackState {
  return { playing: false, pending: false, waiting: false, ended: false, time: 0, duration: 0, volume: 1, muted: false, rate: 1, error: null };
}

/**
 * Owns exactly one native resource and releases old requests before accepting a replacement.
 * @param element - Currently mounted media element, keyed by source and kind.
 * @returns Native-backed state and explicit playback actions.
 */
export function useMediaPlayback(element: ShallowRef<HTMLMediaElement | null>) {
  const state = reactive(initial());
  let generation = 0;
  let release: (() => void) | undefined;

  /** Reads native values rather than projecting a successful command optimistically. */
  function sync(): void {
    const media = element.value;
    if (!media) return;
    state.playing = !media.paused && !media.ended;
    state.ended = media.ended;
    state.time = Number.isFinite(media.currentTime) ? media.currentTime : 0;
    state.duration = Number.isFinite(media.duration) ? Math.max(0, media.duration) : 0;
    state.volume = media.volume; state.muted = media.muted; state.rate = media.playbackRate;
  }

  watch(element, media => {
    generation++; release?.(); release = undefined; Object.assign(state, initial());
    if (!media) return;
    // Events and pending promises are scoped to this exact resource, never its successor.
    const events = ["loadedmetadata", "durationchange", "timeupdate", "play", "playing", "pause", "ended", "waiting", "canplay", "volumechange", "ratechange", "error"];
    /** @param event - Notification from the current native resource. */
    function observe(event: Event): void {
      if (element.value !== media) return;
      sync();
      if (event.type === "waiting") state.waiting = true;
      if (["playing", "canplay", "pause", "ended", "error"].includes(event.type)) state.waiting = false;
      if (["playing", "pause", "ended", "error"].includes(event.type)) state.pending = false;
      if (event.type === "error") { state.error = "load"; state.playing = false; }
    }
    events.forEach(name => media.addEventListener(name, observe));
    release = () => {
      events.forEach(name => media.removeEventListener(name, observe));
      media.pause(); media.removeAttribute("src"); media.load();
    };
    sync();
  }, { immediate: true, flush: "post" });
  onBeforeUnmount(() => { generation++; release?.(); release = undefined; });

  /** Starts, pauses or cancels playback. @returns Completion of the guarded native request, including failure. */
  async function toggle(): Promise<void> {
    const media = element.value;
    if (!media) return;
    const request = ++generation;
    if (state.pending || !media.paused) { media.pause(); state.pending = false; state.waiting = false; sync(); return; }
    state.error = null; state.pending = true;
    if (media.ended) media.currentTime = 0;
    try { await media.play(); }
    catch (error) {
      if (request !== generation || element.value !== media) return;
      if (!(error instanceof Error) || error.name !== "AbortError") state.error = error instanceof Error && error.name === "NotAllowedError" ? "blocked" : "load";
    }
    if (request === generation && element.value === media) { state.pending = false; sync(); }
  }
  /** @param seconds - Requested position, clamped to finite media bounds. */
  function seek(seconds: number): void {
    if (!element.value || !state.duration || !Number.isFinite(seconds)) return;
    element.value.currentTime = Math.max(0, Math.min(state.duration, seconds)); sync();
  }
  /** @param volume - Requested level; adjusting it also restores audible playback. */
  function setVolume(volume: number): void {
    if (!element.value || !Number.isFinite(volume)) return;
    element.value.volume = Math.max(0, Math.min(1, volume)); element.value.muted = false; sync();
  }
  /** Preserves volume when muting; restores a usable volume after a zero-level mute. */
  function toggleMute(): void {
    const media = element.value; if (!media) return;
    if (media.muted || media.volume === 0) { media.muted = false; if (media.volume === 0) media.volume = 1; }
    else media.muted = true;
    sync();
  }
  /** @param rate - User-selected playback speed. */
  function setRate(rate: number): void {
    if (!element.value || !Number.isFinite(rate) || rate < 0.5 || rate > 2) return;
    element.value.playbackRate = rate; sync();
  }
  /** Reloads the current source without autoplay and invalidates its pending play request. */
  function retry(): void {
    generation++; state.error = null; state.pending = false; state.waiting = false;
    element.value?.pause(); element.value?.load(); sync();
  }
  return { state, toggle, seek, setVolume, toggleMute, setRate, retry };
}
