import type { QuireEditor } from "@quirekit/core";
import {
  DOMParser as ProseMirrorDOMParser,
  DOMSerializer,
  Slice
} from "@quirekit/pm";
import { parseSimpleSemanticHtmlSlice } from "./fallback-parse";
import { serializeFragmentToHtmlString } from "./fallback-serialize";
import { sanitizeQuireClipboardHtml } from "./sanitize";
import { readQuireClipboardHtmlFragment } from "./fragment";
import type { QuireClipboardSliceSerializeOptions } from "../types";

/**
 * Serializes a slice as HTML using PM DOMSerializer when possible.
 *
 * @param options - Editor schema, slice, and optional DOM document.
 * @returns HTML fallback string for external editors.
 */
export function serializeQuireClipboardHtml(
  options: QuireClipboardSliceSerializeOptions
): string {
  const ownerDocument = options.ownerDocument ?? getGlobalDocument();

  if (ownerDocument) {
    try {
      const container = ownerDocument.createElement("div");

      DOMSerializer.fromSchema(options.editor.state.schema).serializeFragment(
        options.slice.content,
        { document: ownerDocument },
        container
      );

      return container.innerHTML;
    } catch {
      return serializeFragmentToHtmlString(options.slice.content);
    }
  }

  return serializeFragmentToHtmlString(options.slice.content);
}

/**
 * Parses sanitized semantic HTML into a slice owned by the editor schema.
 *
 * @param html - Clipboard HTML payload.
 * @param editor - Editor whose schema should parse the payload.
 * @returns Parsed slice, or null when no text content could be recovered.
 */
export function parseQuireClipboardHtml(html: string, editor: QuireEditor): Slice | null {
  const sanitizedHtml = sanitizeQuireClipboardHtml(
    readQuireClipboardHtmlFragment(transformQuireClipboardHtml(html, editor))
  );

  if (sanitizedHtml.trim().length === 0) {
    return null;
  }

  const domSlice = parseQuireClipboardHtmlWithDom(sanitizedHtml, editor);

  if (domSlice && domSlice.size > 0) {
    return domSlice;
  }

  return parseSimpleSemanticHtmlSlice(sanitizedHtml, editor.state.schema);
}

/**
 * Runs extension-owned pasted HTML transforms before sanitizer and parser work.
 *
 * @param html - Raw clipboard HTML.
 * @param editor - Editor whose extension chain should transform the HTML.
 * @returns Transformed HTML.
 */
function transformQuireClipboardHtml(html: string, editor: QuireEditor): string {
  let transformedHtml = html;

  editor.someProp("transformPastedHTML", (transform) => {
    const transformHTML = transform as (html: string, view?: unknown) => string;
    transformedHtml = transformHTML(transformedHtml, editor.view);

    return true;
  });

  return transformedHtml;
}

/**
 * Parses HTML with browser DOMParser and PM DOMParser when available.
 *
 * @param html - Sanitized clipboard HTML.
 * @param editor - Editor whose schema should parse the payload.
 * @returns Parsed slice, or null when DOM parsing is unavailable or incompatible.
 */
function parseQuireClipboardHtmlWithDom(
  html: string,
  editor: QuireEditor
): Slice | null {
  const BrowserDOMParser = getGlobalDomParser();

  if (!BrowserDOMParser) {
    return null;
  }

  try {
    const dom = new BrowserDOMParser().parseFromString(html, "text/html");

    return ProseMirrorDOMParser.fromSchema(editor.state.schema).parseSlice(dom.body, {
      preserveWhitespace: true
    });
  } catch {
    return null;
  }
}

/**
 * Reads the ambient DOM document when running in a browser.
 *
 * @returns Browser document, or null in non-DOM runtimes.
 */
function getGlobalDocument(): Document | null {
  return typeof document === "undefined" ? null : document;
}

/**
 * Reads the ambient DOMParser constructor when running in a browser.
 *
 * @returns Browser DOMParser constructor, or null in non-DOM runtimes.
 */
function getGlobalDomParser(): typeof DOMParser | null {
  return typeof DOMParser === "undefined" ? null : DOMParser;
}
