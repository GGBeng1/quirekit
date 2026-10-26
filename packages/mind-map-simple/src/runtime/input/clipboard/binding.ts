import { copyMindMapTopics, mindMapClipboardMime, parseMindMapClipboard, plainMindMapClipboard,
  serializeMindMapClipboard, textMindMapClipboard } from "@quirekit/mind-map";
import type { SimpleInstance } from "../../../vendor/types";
import type { MindMapClipboardActions } from "./types";
import type { MindMapPoint } from "@quirekit/mind-map";
import { pasteMindMapText } from "./text";

/**
 * Owns native clipboard events without reading the system clipboard outside user gestures.
 * @param mount - Instance-local boundary.
 * @param instance - Current selection and geometry.
 * @param actions - Guarded canonical operations and permissions.
 * @returns Listener cleanup.
 */
export function bindMindMapClipboard(mount: HTMLElement, instance: SimpleInstance, actions: MindMapClipboardActions): () => void {
  let pending = 0, pasteTarget: string | MindMapPoint | undefined;
  /** @param event - Clipboard intent originating inside this instance. */
  function clipboard(event: ClipboardEvent): void {
    event.stopPropagation();
    if ((event.target as Element).closest("[contenteditable],input,textarea")) {
      if (event.type === "paste" && !actions.readOnly() && !actions.composing()) pasteMindMapText(mount, event);
      return;
    }
    event.preventDefault();
    const data = event.clipboardData;
    if (!data || actions.composing()) return;
    const selected = instance.renderer.activeNodeList;
    try {
      if (event.type === "paste") {
        if (actions.readOnly()) return;
        if (actions.busy() && !pending) return;
        if (!pending && selected.length > 1) throw new Error("粘贴主题前，请选中一个父主题或点击空白画布。");
        const encoded = data.getData(mindMapClipboardMime), text = data.getData("text/plain");
        if (!encoded && !text.trim()) return;
        const fragment = encoded ? parseMindMapClipboard(encoded) : plainMindMapClipboard(text);
        const root = instance.renderer.root, { x, y, scale } = instance.view;
        const target = pasteTarget ?? (selected[0] ? String(selected[0].getData("uid"))
          : { x: (instance.width / 2 - x) / scale - root.left, y: (instance.height / 2 - y) / scale - root.top });
        pasteTarget = target; pending++;
        void actions.paste(fragment, target).catch(actions.report).finally(() => { if (!--pending) pasteTarget = undefined; });
      } else {
        if (actions.busy() || !selected.length) return;
        const cut = event.type === "cut";
        if (cut && (actions.readOnly() || selected.some(node => node.isRoot))) return;
        const ids = selected.map(node => String(node.getData("uid")));
        const fragment = copyMindMapTopics(actions.read(), ids);
        const encoded = serializeMindMapClipboard(fragment), plain = textMindMapClipboard(fragment);
        data.setData(mindMapClipboardMime, encoded); data.setData("text/plain", plain);
        // A refused/partial clipboard write cannot delete the source. Native event
        // writes are synchronous; queued deletion rechecks lifetime and permission.
        if (cut && data.getData(mindMapClipboardMime) === encoded) void actions.remove(ids).catch(actions.report);
      }
    } catch (error) { actions.report(error); }
  }
  const events = ["copy", "cut", "paste"] as const;
  events.forEach(event => mount.addEventListener(event, clipboard, true));
  return () => events.forEach(event => mount.removeEventListener(event, clipboard, true));
}
