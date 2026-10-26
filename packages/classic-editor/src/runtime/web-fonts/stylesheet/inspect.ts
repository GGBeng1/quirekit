import type { QuireWebFontFetch } from "@quirekit/web-fonts";
import type { ClassicEditorStylesheetFontSourceRecord } from "../../../types";
import { createClassicStylesheetFontSource, MAX_STYLESHEET_BYTES, stylesheetUrl } from "./source";

/**
 * Reads one explicitly chosen static source; does not fetch any font binaries.
 * @param value - Direct stylesheet URL.
 * @param name - Optional display label.
 * @param fetcher - Host-controlled network boundary.
 * @returns Validated metadata snapshot for explicit enabling.
 */
export async function inspectClassicStylesheetFontSource(
  value: string,
  name = "",
  fetcher: QuireWebFontFetch = globalThis.fetch.bind(globalThis)
): Promise<ClassicEditorStylesheetFontSourceRecord> {
  const url = stylesheetUrl(value);
  const response = await fetcher(url, {
    mode: "cors",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Font stylesheet returned HTTP ${response.status}.`);
  if (response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("This is a web page, not a font stylesheet.");
  }
  if (Number(response.headers.get("content-length")) > MAX_STYLESHEET_BYTES) {
    await response.body?.cancel();
    throw new Error("Font stylesheet exceeds 1 MiB.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Font stylesheet is empty.");
  const decoder = new TextDecoder();
  let css = "";
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_STYLESHEET_BYTES) throw new Error("Font stylesheet exceeds 1 MiB.");
      css += decoder.decode(chunk.value, { stream: true });
    }
    css += decoder.decode();
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const record = { url: url.href, name: name.trim() || url.host, css, enabledAt: Date.now() };
  createClassicStylesheetFontSource(record);
  return record;
}
