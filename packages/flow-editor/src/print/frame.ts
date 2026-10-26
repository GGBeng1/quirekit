/** @param owner - Originating dialog document. @param html - Completed static printable document. @param signal - Dialog lifetime. @returns Completion of explicit native printing preparation and invocation. */
export async function printFlowDocument(owner: Document, html: string, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const frame = owner.createElement("iframe"); frame.setAttribute("sandbox", "allow-same-origin allow-modals"); frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1;
  Object.assign(frame.style, { position: "fixed", left: "-20000px", top: "0", width: "1200px", height: "900px", border: "0" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Releases only this print frame; aborted preparation cannot print later. */
  function cleanup(): void { if (timer) clearTimeout(timer); frame.remove(); signal.removeEventListener("abort", cleanup); }
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      /** Skips the initial empty document and completes preparation after static print HTML is parsed. */
      function loaded(): void { if (!frame.contentDocument?.querySelector(".qk-print-page")) return; done(); resolve(); }
      /** Rejects pending work when its dialog closes. */
      function canceled(): void { done(); reject(signal.reason ?? new DOMException("Aborted", "AbortError")); }
      /** Removes one preparation phase's listeners and watchdog. */
      function done(): void { frame.removeEventListener("load", loaded); signal.removeEventListener("abort", canceled); if (timer) clearTimeout(timer); }
      frame.addEventListener("load", loaded); signal.addEventListener("abort", canceled, { once: true });
      timer = setTimeout(() => { done(); reject(new Error("打印预览加载超时，请下载打印文件")); }, 15000);
      frame.srcdoc = html; owner.body.append(frame);
    });
    const view = frame.contentWindow, source = frame.contentDocument;
    if (!view || !source) throw new Error("无法打开打印预览，请下载打印文件");
    await source.fonts.ready;
    // SVG image resources are absent from document.images. Decode each unique
    // embedded source once before native print captures the page tree.
    await Promise.all([...new Set([...source.querySelectorAll("image")].map(node => node.getAttribute("href") ?? node.getAttribute("xlink:href") ?? "").filter(Boolean))].map(async data => {
      const image = owner.createElement("img"); image.src = data; await image.decode();
    }));
    signal.throwIfAborted(); if (!frame.isConnected) throw new DOMException("Aborted", "AbortError");
    view.addEventListener("afterprint", cleanup, { once: true }); timer = setTimeout(cleanup, 60000); view.print();
  } catch (reason) { cleanup(); throw reason; }
}
