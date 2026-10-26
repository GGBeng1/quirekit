import * as Viz from "@viz-js/viz";
import { renderToString } from "@plantuml/core";

// This entry is a self-contained classic script in an opaque sandbox. The
// engine gets a real DOM for font measurement, but no host DOM or network API.
Object.assign(globalThis, { Viz,
  /** @param _url - Requested optional bundle. @param _ok - Unused success callback. @param fail - Explicit local-only refusal. @returns Ownership of every load request. */
  PLANTUML_STDLIB_LOADER(_url: string, _ok: () => void, fail: (message: string) => void): boolean {
    fail("External PlantUML libraries are not enabled"); return true;
  },
});
let used = false;
globalThis.addEventListener("message", async (event: MessageEvent) => {
  if (event.source !== parent || used || event.data?.type !== "quirekit-diagram-render") return;
  used = true;
  const { source, language } = event.data;
  try {
    if (typeof source !== "string" || source.length > 30_000) throw new Error("diagram-source-invalid");
    const svg = language === "dot" ? (await Viz.instance()).renderString(source, { format: "svg", engine: "dot" })
      : await new Promise<string>((resolve, reject) => renderToString(source.split(/\r\n|\r|\n/u), resolve, message => reject(new Error(message))));
    // The pinned TeaVM API sometimes calls success with an SVG diagnostic page.
    // Recognize its diagnostic header/line banner before accepting a source-bound
    // picture; arbitrary user labels elsewhere are not error signatures.
    if (language === "plantuml") {
      const root = new DOMParser().parseFromString(svg, "image/svg+xml");
      const labels = Array.from(root.querySelectorAll("text"), node => node.textContent?.trim() ?? "");
      const diagnostic = labels[0] === "Diagram not supported by this release of PlantUML"
        || labels[0]?.startsWith("PlantUML version ") && labels.some(label => /^\[From .+\(line \d+\)\s*\]$/u.test(label));
      if (diagnostic || /data-diagram-type=["']ERROR["']/iu.test(svg)) throw new Error(labels.filter(Boolean).join("\n").slice(0, 1000));
    }
    parent.postMessage({ type: "quirekit-diagram-result", svg }, "*");
  } catch (reason) { parent.postMessage({ type: "quirekit-diagram-result", error: reason instanceof Error ? reason.message : String(reason) }, "*"); }
});
parent.postMessage({ type: "quirekit-diagram-ready" }, "*");
