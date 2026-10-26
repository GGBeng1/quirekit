import { v4 as uuidv4 } from "uuid";
import type { App } from "vue";
import type { DataViewDialogHandle, DataViewDialogOptions } from "../types";

/** Lazily mounts a task and owns every resource it allocates.
 * @param options - Conditional edit request and host lifetime.
 * @returns Idempotent cancellation handle.
 */
export function openDataViewDialog(options: DataViewDialogOptions): DataViewDialogHandle {
  const document = options.ownerDocument, mount = document.createElement("div"), focus = document.activeElement;
  document.body.append(mount);
  let app: App | undefined, closed = false, frame: number | undefined;
  /** Releases Vue, request anchors, cancellation and focus ownership. */
  function close(): void {
    if (closed) return; closed = true;
    if (frame !== undefined) document.defaultView?.cancelAnimationFrame(frame);
    app?.unmount(); mount.remove(); options.signal?.removeEventListener("abort", close); options.request.release();
    if (focus instanceof HTMLElement && focus.isConnected) focus.focus();
  }
  options.signal?.addEventListener("abort", close, {once: true});
  if (options.signal?.aborted) close();
  else void Promise.all([import("vue"), import("../vue/dialog.vue")]).then(([vue, component]) => {
    if (closed) return;
    // Let the insertion menu finish its pointer gesture before mounting a modal.
    frame = document.defaultView!.requestAnimationFrame(() => {
      if (closed) return;
      frame = undefined; app = vue.createApp(component.default, {...options, onClose: close});
      app.config.idPrefix = `data-view-${uuidv4()}`; app.mount(mount);
    });
  }).catch(failure => { close(); document.defaultView?.reportError(failure); });
  return {close};
}
