import { serializeMindMap } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import { createMindEditor } from "../../runtime/create";
import { mindEditorAppearance } from "../../theme/appearance";
import type { MindEditorPreviewRenderer } from "./types";
import { createMindEditorPreviewQueue } from "./queue";

/** @returns One panel's lazy, serial snapshot renderer; no live editor survives a job. */
export function createMindEditorPreviewRenderer(): MindEditorPreviewRenderer {
  let closed = false, cachedSize = 0;
  const queue = createMindEditorPreviewQueue();
  const cache = new Map<string, string>(), pending = new Set<AbortController>();
  return {
    /** @param source - Canonical candidate. @param theme - Host theme. @param signal - Card or detail lifetime.
     * @param priority - Selected detail precedes pending cards. @returns A complete, centered-by-bounds image. */
    render(source, theme, signal, priority) {
      const lifetime = new AbortController(); pending.add(lifetime);
      /** Cancels either a queued request or its active temporary runtime. */
      const abort = (): void => lifetime.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted || closed) abort();
      const job = queue.enqueue(async () => {
        lifetime.signal.throwIfAborted();
        const key = JSON.stringify(mindEditorAppearance(theme)) + serializeMindMap(source);
        const cached = cache.get(key); if (cached) return cached;
        // One connected, inert measurement surface isolates temporary SVG nodes
        // from the real canvas. Geometry is exported in natural world coordinates.
        const host = document.createElement("div");
        host.dataset.mindMapPreviewRenderer = ""; host.inert = true; host.setAttribute("aria-hidden", "true");
        host.style.cssText = "position:fixed;left:-12000px;top:0;width:1000px;height:800px;opacity:0;pointer-events:none;";
        const container = document.createElement("div"); container.style.cssText = "width:100%;height:100%;";
        host.attachShadow({ mode: "open" }).append(container); document.body.append(host);
        let editor: MindMapEditor | undefined;
        try {
          editor = await createMindEditor({ container, document: source, theme, readOnly: true, signal: lifetime.signal });
          const snapshot = await editor.exportSvg(); lifetime.signal.throwIfAborted();
          const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(snapshot.svg)}`;
          // Cache at most 32 sources and roughly 4 MiB of UTF-16 payload. A large
          // imported sheet remains previewable without occupying the entire cache.
          const size = key.length + url.length;
          if (size <= 2_000_000) {
            while (cache.size && (cache.size >= 32 || cachedSize + size > 2_000_000)) {
              const oldest = cache.keys().next().value!;
              cachedSize -= oldest.length + cache.get(oldest)!.length; cache.delete(oldest);
            }
            cache.set(key, url); cachedSize += size;
          }
          return url;
        } finally { try { await editor?.destroy(); } finally { host.remove(); } }
      }, lifetime.signal, priority === "selection").finally(() => { signal.removeEventListener("abort", abort); pending.delete(lifetime); });
      return job;
    },
    /** Invalidates jobs before releasing the panel's source/image cache. */
    dispose() { closed = true; pending.forEach(controller => controller.abort()); queue.dispose(); cache.clear(); cachedSize = 0; },
  };
}
