import type { TextDiagramLanguage } from "../types";

/** Fixed bootstrap run in the sandbox: it loads the engine text the host posts, from a blob of the sandbox's own origin. */
export const diagramFrameBootstrap = "addEventListener(\"message\",function l(e){if(e.source!==parent||!e.data||e.data.type!==\"quirekit-diagram-engine\")return;removeEventListener(\"message\",l);var s=document.createElement(\"script\");s.src=URL.createObjectURL(new Blob([e.data.script],{type:\"text/javascript\"}));document.head.appendChild(s)});parent.postMessage({type:\"quirekit-diagram-boot\"},\"*\");";
/** CSP hash of `diagramFrameBootstrap`. */
export const diagramFrameBootstrapHash = "sha256-xZRnnxMi3giYGqaAZ1nAsMGdOjazx5NUMHrmtLCO3Rw=";

let engineText: Promise<string | null> | undefined;

/**
 * Loads the engine bundle text once per page.
 *
 * The text reaches the sandbox by message, so hosts that block network requests from opaque-origin
 * frames still render. A development server's inline source map is dropped.
 *
 * @param asset - Engine bundle URL.
 * @param view - Host window.
 * @returns Engine text, or null when the host cannot read it, such as a cross-origin asset without CORS.
 */
function loadEngineText(asset: URL, view: Window): Promise<string | null> {
  engineText ??= view.fetch(asset)
    .then(response => response.ok ? response.text() : null)
    .then(text => {
      if (text === null) return null;
      const map = text.lastIndexOf("\n//# sourceMappingURL=");
      return map < 0 ? text : text.slice(0, map);
    })
    .catch(() => null);
  return engineText;
}

/** @param language - DOM-measured grammar. @param source - Bounded exact source. @param owner - Host document. @param signal - This render's lifetime.
 * @returns SVG from an isolated engine; cancellation never releases a result into another request. */
export async function renderIsolated(language: TextDiagramLanguage, source: string, owner: Document, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  const view = owner.defaultView!;
  // The classic script is bundled with both engines. No module imports, CDN,
  // same-origin permission or user-controlled script URLs enter the sandbox.
  const asset = new URL("../../dist/diagram-frame.iife.js", import.meta.url);
  const engine = await loadEngineText(asset, view);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const frame = owner.createElement("iframe");
    frame.sandbox.add("allow-scripts"); frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;visibility:hidden;pointer-events:none";
    const scripts = engine === null ? `${asset.origin} 'wasm-unsafe-eval'` : `'${diagramFrameBootstrapHash}' blob: 'wasm-unsafe-eval'`;
    const policy = `default-src 'none'; script-src ${scripts}; style-src 'unsafe-inline'; img-src data:; connect-src 'none';`;
    const body = engine === null
      ? `<script src="${asset.href.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;")}"></script>`
      : `<script>${diagramFrameBootstrap}</script>`;
    frame.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}">${body}`;
    /** Releases the independent browsing context and every host callback. */
    function dispose(): void { clearTimeout(timer); signal.removeEventListener("abort", abort); view.removeEventListener("message", message); frame.remove(); }
    /** Rejects the retired source request without retaining engine work. */
    function abort(): void { dispose(); reject(signal.reason ?? new DOMException("Aborted", "AbortError")); }
    /** @param event - Only this opaque frame's protocol is accepted. */
    function message(event: MessageEvent): void {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type === "quirekit-diagram-boot" && engine !== null) frame.contentWindow?.postMessage({ type: "quirekit-diagram-engine", script: engine }, "*");
      if (event.data?.type === "quirekit-diagram-ready") frame.contentWindow?.postMessage({ type: "quirekit-diagram-render", language, source }, "*");
      if (event.data?.type !== "quirekit-diagram-result") return;
      dispose();
      if (typeof event.data.svg === "string") resolve(event.data.svg);
      else reject(new Error(String(event.data.error ?? "diagram-render-failed")));
    }
    const timer = setTimeout(() => { dispose(); reject(new Error("diagram-render-timeout")); }, 20_000);
    signal.addEventListener("abort", abort, { once: true }); view.addEventListener("message", message);
    owner.body.append(frame);
  });
}
