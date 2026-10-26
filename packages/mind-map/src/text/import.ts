import { readMindMapDocument } from "../model/document";
import { parseTextTopics } from "./parse";
import type { MindMapTextDiagnostic, MindMapTextFormat, MindMapTextImport } from "./types";
/** @param text - Untrusted literal topic outline. @param format - Explicit grammar. @returns Fresh validated map with an explicit conversion ledger. */
export function importMindMapText(text: string, format: MindMapTextFormat): MindMapTextImport {
  if (typeof text !== "string" || !["markdown", "outline"].includes(format)) throw new TypeError("outline: expected text and a supported format");
  const diagnostics: MindMapTextDiagnostic[] = [], roots = parseTextTopics(text, format, diagnostics);
  if (roots.length > 1) diagnostics.push({ code: "fallback", path: "floatingTopics.position", message: "Additional top-level topics become floating trees with newly assigned positions." });
  const document = readMindMapDocument({ version: 2, revision: 0, layout: "mind-map", root: roots[0],
    floatingTopics: roots.slice(1).map((root, index) => ({ root, position: { x: 320, y: 180 + index * 140 }, side: "right" })) });
  return Object.freeze({ document, diagnostics: Object.freeze(diagnostics) });
}
