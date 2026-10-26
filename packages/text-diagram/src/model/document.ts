import type { TextDiagramEmbed, TextDiagramLanguage, TextDiagramPreview, TextDiagramRaster } from "../types";
import { textDiagramTemplates } from "./templates";

/** @param input - Code fence language. @returns Supported grammar or null; no prefix guessing. */
export function textDiagramLanguage(input: string): TextDiagramLanguage | null {
  const value = input.trim().toLowerCase();
  return value === "mermaid" ? "mermaid" : ["plantuml", "puml"].includes(value) ? "plantuml" : ["dot", "graphviz"].includes(value) ? "dot" : null;
}
/** @param input - Untrusted object. @param keys - Complete accepted field set. @returns A plain object with data properties only. */
function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new TypeError("diagram-object-invalid");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== keys.length || keys.some(key => !descriptors[key] || !("value" in descriptors[key]!))) throw new TypeError("diagram-fields-invalid");
  return input as Record<string, unknown>;
}
/** @param input - Untrusted text. @param maximum - UTF-16 length budget. @returns Valid plain Unicode text. */
function text(input: unknown, maximum: number): string {
  if (typeof input !== "string" || input.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(input)) throw new TypeError("diagram-text-invalid");
  return input;
}
/** @param input - Untrusted raster. @returns An immutable bounded PNG projection. */
function preview(input: unknown): TextDiagramPreview | null {
  if (input === null) return null;
  const value = record(input, ["dataUrl", "width", "height"]);
  if (typeof value.width !== "number" || typeof value.height !== "number") throw new TypeError("diagram-preview-invalid");
  const width = value.width, height = value.height;
  if (!Number.isInteger(width) || !Number.isInteger(height)
    || width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > 8e6
    || typeof value.dataUrl !== "string" || value.dataUrl.length > 12 * 1024 * 1024
    || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/u.test(value.dataUrl)) throw new TypeError("diagram-preview-invalid");
  return Object.freeze({ dataUrl: value.dataUrl, width, height });
}
/** @param input - Untrusted persisted value. @returns Detached immutable canonical source. */
export function readTextDiagram(input: unknown): TextDiagramEmbed {
  const value = record(input, ["type", "version", "id", "title", "document", "preview"]);
  if (value.type !== "quirekit-text-diagram" || value.version !== 1) throw new TypeError("diagram-version-unsupported");
  const id = text(value.id, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(id)) throw new TypeError("diagram-id-invalid");
  const document = record(value.document, ["language", "source", "revision"]);
  if (typeof document.language !== "string" || !["mermaid", "plantuml", "dot"].includes(document.language) || !Number.isSafeInteger(document.revision) || Number(document.revision) < 0) throw new TypeError("diagram-source-invalid");
  return Object.freeze({ type: "quirekit-text-diagram", version: 1, id, title: text(value.title, 200),
    document: Object.freeze({ language: document.language as TextDiagramLanguage, source: text(document.source, 30_000), revision: Number(document.revision) }), preview: preview(value.preview) });
}
/** @param id - Host identity. @param language - Initial grammar. @param source - Initial exact source. @returns An unsaved source-backed object. */
export function createTextDiagram(id: string, language: TextDiagramLanguage = "mermaid", source?: string): TextDiagramEmbed {
  const initialSource = source ?? textDiagramTemplates("en").find(template => template.language === language)?.source;
  return readTextDiagram({ type: "quirekit-text-diagram", version: 1, id, title: language === "dot" ? "Graphviz" : language === "plantuml" ? "PlantUML" : "Mermaid", document: { language, source: initialSource, revision: 0 }, preview: null });
}
/** @param value - Portable object. @returns Stable source identity for atomic comparisons. */
export function serializeTextDiagram(value: TextDiagramEmbed): string { return JSON.stringify(readTextDiagram(value)); }
/** @param original - Captured host baseline. @param snapshot - Exact source-bound PNG. @param title - Plain accessible name. @returns One proposed revision. */
export function prepareTextDiagramSave(original: TextDiagramEmbed, snapshot: TextDiagramRaster, title = original.title): TextDiagramEmbed {
  return readTextDiagram({ ...original, title, document: { language: snapshot.language, source: snapshot.source, revision: original.document.revision + 1 },
    preview: { dataUrl: snapshot.dataUrl, width: snapshot.width, height: snapshot.height } });
}
/** @param language - Canonical grammar. @param source - Exact source. @returns A standard code fence that cannot be closed by its body. */
export function textDiagramMarkdown(language: TextDiagramLanguage, source: string): string {
  text(source, 30_000);
  if (textDiagramLanguage(language) !== language) throw new TypeError("diagram-language-invalid");
  const length = Math.max(3, ...Array.from(source.matchAll(/`+/gu), match => match[0].length + 1));
  const fence = "`".repeat(length);
  return `${fence}${language}\n${source}${source.endsWith("\n") ? "" : "\n"}${fence}`;
}
