import type { App, Component } from "vue";
import type { MindMapDialogHandle, MindMapDialogOptions } from "./types";
import { v4 as uuidv4 } from "uuid";

/** @param options - One independently scoped authoring request. @returns Idempotent cancellation handle. */
export function openMindMapDialog(options: MindMapDialogOptions): MindMapDialogHandle {
  const host = options.ownerDocument.createElement("div");
  options.ownerDocument.body.append(host);
  let closed = false, mounted = false, frame: number | undefined;
  let app: App | undefined;
  /** Releases the component before returning focus and mapped targets to the host. */
  function close(): void {
    if (closed) return; closed = true;
    if (frame !== undefined) options.ownerDocument.defaultView!.cancelAnimationFrame(frame);
    if (mounted) app?.unmount();
    host.remove(); options.signal?.removeEventListener("abort", close); options.request.release();
  }
  options.signal?.addEventListener("abort", close, { once: true });
  if (options.signal?.aborted) close();
  else void Promise.all([import("vue"), import("../../vue/dialog.vue"), import("@quirekit/ui/vue")]).then(([{ createApp, h }, { default: MindMapDialog }, { QuireLocaleProvider }]) => {
    if (closed) return;
    app = createApp({
      /** @returns A task-local provider, including teleported feedback and menus. */
      render: () => h(QuireLocaleProvider as Component, { locale: options.locale ?? "zh-CN" },
        { default: () => h(MindMapDialog as Component, { request: options.request, recovery: options.recovery, uploadPreview: options.uploadPreview, theme: options.theme, ownerDocument: options.ownerDocument, onClose: close }) }),
    });
    app.config.idPrefix = `mindMap-${uuidv4()}`;
    // Menu selection fires during pointerup. Mount after that gesture so its
    // subsequent click cannot activate the new dialog's close button.
    frame = options.ownerDocument.defaultView!.requestAnimationFrame(() => {
      frame = undefined;
      if (!closed) { mounted = true; app!.mount(host); }
    });
  }).catch(error => { close(); options.ownerDocument.defaultView?.reportError(error); });
  return { close };
}
