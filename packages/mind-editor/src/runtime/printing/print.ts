import type { MindMapSnapshot } from "@quirekit/mind-map";
import { rasterizeMindMap } from "../raster";
/** @param snapshot - Same-version source and SVG. @param owner - Host document. @param signal - Optional consumer lifetime.
 * @returns Opening of an isolated content-only print dialog; it does not submit a print job. */
export async function printMindMap(snapshot: MindMapSnapshot, owner: Document, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const raster = await rasterizeMindMap(snapshot, owner, "#ffffff"); signal?.throwIfAborted();
  const frame = owner.createElement("iframe"), host = owner.defaultView!;
  frame.setAttribute("data-quirekit-mind-print", ""); frame.setAttribute("aria-hidden", "true"); frame.title = "Quire Mind print";
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;";
  owner.body.append(frame);
  const page = frame.contentDocument!, view = frame.contentWindow!, image = page.createElement("img"), style = page.createElement("style");
  const landscape = snapshot.width >= snapshot.height;
  style.textContent = `@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 10mm; } html,body { margin:0; padding:0; background:white; } img { display:block; width:${landscape ? 277 : 190}mm; height:${landscape ? 190 : 277}mm; object-fit:contain; }`;
  image.alt = ""; image.src = raster.dataUrl; page.head.append(style); page.body.append(image);
  let timer: number | undefined;
  /** Releases only this owned frame and its lifetime hooks. */
  function cleanup(): void { if (timer !== undefined) host.clearTimeout(timer); view.removeEventListener("afterprint", cleanup); host.removeEventListener("pagehide", cleanup); signal?.removeEventListener("abort", cleanup); frame.remove(); }
  view.addEventListener("afterprint", cleanup, { once: true }); host.addEventListener("pagehide", cleanup, { once: true }); signal?.addEventListener("abort", cleanup, { once: true });
  try {
    // Decode before opening the system dialog. The frame contains a fixed image,
    // never executable SVG markup or a live editor that might change mid-print.
    await image.decode(); signal?.throwIfAborted();
    if (!frame.isConnected) throw new Error("Print view closed");
    timer = host.setTimeout(cleanup, 120000); view.focus(); view.print();
  } catch (reason) { cleanup(); throw reason; }
}
