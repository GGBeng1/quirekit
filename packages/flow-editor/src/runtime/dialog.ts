import type { App } from "vue";
import type { FlowchartDialogHandle, FlowchartDialogOptions } from "../types";
import { v4 as uuidv4 } from "uuid";

/** @param options - One independently scoped authoring request. @returns Idempotent cancellation handle. */
export function openFlowchartDialog(options: FlowchartDialogOptions): FlowchartDialogHandle {
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
  else void Promise.all([import("vue"), import("../vue/dialog.vue")]).then(([{ createApp }, { default: FlowchartDialog }]) => {
    if (closed) return;
    app = createApp(FlowchartDialog, { request: options.request, locale: options.locale, theme: options.theme, libraryStore: options.libraryStore, uploadPreview: options.uploadPreview, ownerDocument: options.ownerDocument, onClose: close });
    app.config.idPrefix = `flowchart-${uuidv4()}`;
    // Menu selection fires during pointerup. Mount after that gesture so its
    // subsequent click cannot activate the new dialog's close button.
    frame = options.ownerDocument.defaultView!.requestAnimationFrame(() => {
      frame = undefined;
      if (!closed) { mounted = true; app!.mount(host); }
    });
  }).catch(error => { close(); options.ownerDocument.defaultView?.reportError(error); });
  return { close };
}
