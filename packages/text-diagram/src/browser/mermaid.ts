import type { TextDiagramTypography } from "./types";
import { v4 as uuidv4 } from "uuid";

// Mermaid owns global configuration internally. Serialize renders so simultaneous editor
// instances cannot change one another's security configuration or temporary DOM identifiers.
let queue = Promise.resolve();

/** @param text - Confirmed fenced body. @param signal - Preview lifetime. @param typography - Effective host text role.
 * @returns Engine SVG for the shared sanitizer, without document event bindings. */
async function renderDiagram(text: string, signal: AbortSignal, typography: TextDiagramTypography): Promise<string> {
  signal.throwIfAborted();
  if (text.length > 30_000 || /%%\s*\{/u.test(text)) throw new RangeError("diagram-preview-unsupported");
  const { default: mermaid } = await import("mermaid");
  signal.throwIfAborted();
  // Keep Mermaid's standard palette across editing, reading and export. The
  // neutral theme is a monochrome print preset, not a host-neutral appearance.
  // Mermaid 12 defaults to ELK/neo. Pin the existing layout and appearance,
  // while mindmaps keep their radial layout instead of inheriting dagre.
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true, maxTextSize: 30_000,
    maxEdges: 500, htmlLabels: false, theme: "default", look: "classic", layout: "dagre",
    mindmap: { layout: "cose-bilkent" }, flowchart: { htmlLabels: false },
    ...typography, themeVariables: { fontFamily: typography.fontFamily, fontSize: `${typography.fontSize}px` },
    secure: ["securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "suppressErrorRendering", "htmlLabels"] });
  const { svg } = await mermaid.render(`qk-diagram-${uuidv4()}`, text);
  return svg;
}

/** @param text - Confirmed Mermaid source. @param signal - Explicit rendering lifetime.
 * @param typography - Source-neutral font options. @returns Engine SVG, serialized with all editor preview renders. */
export function renderMermaid(text: string, signal: AbortSignal, typography: TextDiagramTypography): Promise<string> {
  const result = queue.then(() => renderDiagram(text, signal, typography));
  queue = result.then(() => {}, () => {});
  return result;
}
