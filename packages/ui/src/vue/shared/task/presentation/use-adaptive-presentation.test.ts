// @vitest-environment happy-dom
import { createApp, createSSRApp, defineComponent, h, nextTick, ref, shallowRef, watch } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitTaskPresentation } from "../../../../components/task/types";
import type { AdaptivePresentation } from "./types";
import { useAdaptivePresentation } from "./use-adaptive-presentation";

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).reverse().forEach(dispose => dispose());
  vi.restoreAllMocks();
});

/**
 * Controls layout media independently from delivery of its change notification.
 * @param view - Document window whose media query is observed.
 * @param initialWidth - Initial layout viewport width in CSS pixels.
 * @returns Width control and subscription counters.
 */
function installMedia(view: Window = window, initialWidth = 1024) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  const query = {
    get matches() { return width >= 768; },
    media: "(min-width: 768px)",
    addEventListener: vi.fn((_event: string, listener: () => void) => { listeners.add(listener); }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => { listeners.delete(listener); })
  };
  const matchMedia = vi.spyOn(view, "matchMedia").mockReturnValue(query as unknown as MediaQueryList);
  return {
    query,
    matchMedia,
    /**
     * Changes the layout viewport, optionally deferring the browser notification.
     * @param nextWidth - Next CSS width.
     * @param notify - Whether to deliver change immediately.
     */
    resize(nextWidth: number, notify = true) {
      width = nextWidth;
      if (notify) listeners.forEach(listener => listener());
    }
  };
}

/**
 * Mounts the presentation composable around one persistent real trigger.
 * @param requested - Reactive host presentation strategy.
 * @param owner - Trigger document, including independent iframe documents.
 * @returns Presentation state and explicit fixture teardown.
 */
function mountPresentation(requested = ref<QuireKitTaskPresentation | undefined>("auto"), owner = document) {
  const trigger = shallowRef<HTMLElement>();
  const host = owner.createElement("div");
  owner.body.append(host);
  let api!: AdaptivePresentation;
  const app = createApp(defineComponent({ setup() {
    api = useAdaptivePresentation(trigger, () => requested.value);
    return () => h("button", { ref: trigger }, "Actions");
  } }));
  app.mount(host);
  let mounted = true;
  /** Releases the real component and its document subscription once. */
  function unmount() {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    host.remove();
  }
  cleanup.push(unmount);
  return { api, trigger, requested, unmount };
}

it("shares one document listener until its final consumer unmounts", () => {
  const media = installMedia();
  const first = mountPresentation();
  const second = mountPresentation();
  expect(media.matchMedia).toHaveBeenCalledExactlyOnceWith("(min-width: 768px)");
  expect(media.query.addEventListener).toHaveBeenCalledTimes(1);
  expect(first.api.resolved.value).toBe("desktop");
  media.resize(767.9);
  expect(first.api.candidate.value).toBe("bottom");
  expect(second.api.candidate.value).toBe("bottom");
  first.unmount();
  expect(media.query.removeEventListener).not.toHaveBeenCalled();
  media.resize(768);
  expect(second.api.candidate.value).toBe("desktop");
  second.unmount();
  expect(media.query.removeEventListener).toHaveBeenCalledTimes(1);
  mountPresentation();
  expect(media.matchMedia).toHaveBeenCalledTimes(2);
});

it("keeps the current shell through resize, forced changes and a closing reopen", () => {
  const media = installMedia();
  const { api, requested, trigger } = mountPresentation();
  const stableTrigger = trigger.value;
  expect(api.open()).toBe("desktop");
  const firstEpoch = api.epoch.value;
  expect(api.open()).toBe("desktop");
  expect(api.epoch.value).toBe(firstEpoch);
  media.resize(390);
  expect(api.candidate.value).toBe("bottom");
  expect(api.resolved.value).toBe("desktop");
  api.close();
  expect(api.phase.value).toBe("closing");
  requested.value = "bottom";
  expect(api.resolved.value).toBe("desktop");
  expect(api.completeExit("bottom", firstEpoch)).toBe(false);
  expect(api.open()).toBe("desktop");
  expect(api.epoch.value).toBeGreaterThan(firstEpoch);
  expect(api.completeExit("desktop", firstEpoch)).toBe(false);
  api.close();
  expect(api.completeExit("desktop", firstEpoch)).toBe(false);
  expect(api.completeExit("desktop", api.epoch.value)).toBe(true);
  expect(api.phase.value).toBe("closed");
  expect(api.resolved.value).toBe("bottom");
  expect(api.completeExit("desktop", api.epoch.value)).toBe(false);
  expect(api.open()).toBe("bottom");
  expect(trigger.value).toBe(stableTrigger);
});

it("reads same-frame media from the event document without locking a refused open", () => {
  const media = installMedia();
  const { api, trigger } = mountPresentation();
  media.resize(390, false);
  expect(api.candidate.value).toBe("desktop");
  trigger.value!.addEventListener("click", event => {
    expect(api.resolveForEvent(event)).toBe("bottom");
    expect(api.phase.value).toBe("closed");
  }, { once: true });
  trigger.value!.click();
  expect(api.epoch.value).toBe(0);
  // The host refused the first request; only the later effective session locks.
  media.resize(1024);
  expect(api.open()).toBe("desktop");
  media.resize(390, false);
  trigger.value!.addEventListener("click", event => {
    expect(api.resolveForEvent(event)).toBe("desktop");
    expect(api.candidate.value).toBe("bottom");
  }, { once: true });
  trigger.value!.click();
});

it("uses independent owner documents and rebinds an adopted trigger on its next event", () => {
  const mainMedia = installMedia();
  const frame = document.createElement("iframe");
  document.body.append(frame);
  cleanup.push(() => frame.remove());
  const child = frame.contentDocument!;
  const childMedia = installMedia(frame.contentWindow!, 390);
  const main = mountPresentation();
  const nested = mountPresentation(undefined, child);
  expect(main.api.candidate.value).toBe("desktop");
  expect(nested.api.candidate.value).toBe("bottom");
  mainMedia.resize(600);
  childMedia.resize(1024);
  expect(main.api.candidate.value).toBe("bottom");
  expect(nested.api.candidate.value).toBe("desktop");
  child.body.append(main.trigger.value!);
  main.trigger.value!.addEventListener("click", event => {
    expect(main.api.resolveForEvent(event)).toBe("desktop");
  }, { once: true });
  main.trigger.value!.click();
  expect(mainMedia.query.removeEventListener).toHaveBeenCalledTimes(1);
  expect(childMedia.query.addEventListener).toHaveBeenCalledTimes(1);
  nested.unmount();
  expect(childMedia.query.removeEventListener).not.toHaveBeenCalled();
  main.unmount();
  expect(childMedia.query.removeEventListener).toHaveBeenCalledTimes(1);
});

it("releases auto media while forced and resumes it when auto is requested again", () => {
  const media = installMedia();
  const { api, requested } = mountPresentation();
  requested.value = "bottom";
  expect(api.ready.value).toBe(true);
  expect(api.candidate.value).toBe("bottom");
  expect(media.query.removeEventListener).toHaveBeenCalledTimes(1);
  requested.value = undefined;
  expect(api.candidate.value).toBe("desktop");
  expect(media.query.addEventListener).toHaveBeenCalledTimes(2);
});

it("keeps a live session ready while its strategy or valid document changes", () => {
  installMedia();
  const { api, requested, trigger } = mountPresentation(ref("bottom"));
  api.open();
  const readiness: boolean[] = [];
  const stop = watch(api.ready, value => readiness.push(value), { flush: "sync" });
  cleanup.push(stop);
  requested.value = "auto";
  expect(readiness).toEqual([]);
  const frame = document.createElement("iframe");
  document.body.append(frame);
  cleanup.push(() => frame.remove());
  installMedia(frame.contentWindow!, 390);
  frame.contentDocument!.body.append(trigger.value!);
  trigger.value!.addEventListener("click", api.resolveForEvent, { once: true });
  trigger.value!.click();
  expect(readiness).toEqual([]);
  expect(api.phase.value).toBe("open");
  expect(api.resolved.value).toBe("bottom");
});

it("does not let unmounted work reopen or release a later epoch", () => {
  const media = installMedia();
  const { api, unmount } = mountPresentation();
  api.open();
  api.close();
  const exitingEpoch = api.epoch.value;
  unmount();
  api.dispose();
  media.resize(390);
  expect(api.ready.value).toBe(false);
  expect(api.phase.value).toBe("closed");
  expect(api.completeExit("desktop", exitingEpoch)).toBe(false);
  expect(api.open()).toBeUndefined();
  expect(media.query.removeEventListener).toHaveBeenCalledTimes(1);
});

it("hydrates auto with the same closed trigger before resolving the document", async () => {
  const media = installMedia(window, 390);
  const setupReadiness: boolean[] = [];
  let api!: AdaptivePresentation;
  const Probe = defineComponent({ setup() {
    const trigger = shallowRef<HTMLElement>();
    api = useAdaptivePresentation(trigger, () => "auto");
    setupReadiness.push(api.ready.value);
    return () => h("button", { ref: trigger, "data-ready": String(api.ready.value) }, "Actions");
  } });
  const html = await renderToString(createSSRApp(Probe));
  expect(media.matchMedia).not.toHaveBeenCalled();
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  const original = host.firstElementChild;
  const app = createSSRApp(Probe);
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  expect(setupReadiness).toEqual([false, false]);
  expect(api.phase.value).toBe("closed");
  expect(api.resolved.value).toBe("bottom");
  await nextTick();
  expect(host.firstElementChild).toBe(original);
  expect(host.firstElementChild?.getAttribute("data-ready")).toBe("true");
});
