import { Slice } from "@quirekit/pm";
import {
  collectQuireClipboardResources,
  resolveQuireClipboardView,
  serializeQuireClipboardText,
  transformQuireCopiedSlice,
  transformQuirePastedSlice
} from "./hooks";
import {
  canvasInternalClipboardMime,
  normalizeQuireClipboardResources,
  parseQuireInternalClipboardSlice,
  serializeQuireInternalClipboardSlice
} from "./internal";
import { parseQuireClipboardHtml, serializeQuireClipboardHtml } from "./html";
import {
  embedQuireClipboardPayload,
  readQuireClipboardInternalData,
  stripQuireEmbeddedClipboardPayload
} from "./embedded";
import type {
  QuireClipboardSelectionWriteOptions,
  QuireClipboardSerializableSelection,
  QuireClipboardSelectionSerializedData,
  QuireClipboardSerializedData,
  QuireClipboardSliceReadOptions,
  QuireClipboardSliceSerializeOptions
} from "./types";

/**
 * Writes the current non-empty editor selection to all supported clipboard formats.
 *
 * @param options - Editor selection and writable clipboard adapter.
 * @returns Whether clipboard data was written.
 */
export function writeQuireClipboardSelection(
  options: QuireClipboardSelectionWriteOptions
): boolean {
  const { selection } = options.editor.state.pm;

  if (selection.empty) {
    return false;
  }

  const structuralData = serializeQuireClipboardSelection(selection);
  const serialized = structuralData
    ? serializeQuireStructuralClipboardData({
        ...options,
        data: structuralData
      })
    : serializeQuireClipboardSlice({
    editor: options.editor,
    ...(options.view === undefined ? {} : { view: options.view }),
    slice: selection.content(),
    ...(options.ownerDocument === undefined
      ? {}
      : { ownerDocument: options.ownerDocument })
  });

  // A non-empty selection always carries internal and HTML payloads, even when
  // it has no text (a lone image or horizontal rule produces empty plain text).
  // Writing only the non-empty plain text earlier dropped those atoms entirely.
  options.clipboardData.setData(canvasInternalClipboardMime, serialized.internal);
  options.clipboardData.setData("text/html", serialized.html);
  options.clipboardData.setData("text/plain", serialized.plainText);

  return true;
}

/**
 * Serializes a ProseMirror slice into QuireKit internal, HTML, and plain text formats.
 *
 * @param options - Editor schema, slice, and optional DOM document.
 * @returns Clipboard payloads for all supported formats.
 */
export function serializeQuireClipboardSlice(
  options: QuireClipboardSliceSerializeOptions
): QuireClipboardSerializedData {
  const view = resolveQuireClipboardView(options.editor, options.view);
  const slice = transformQuireCopiedSlice(options.slice, view);
  const resources = normalizeQuireClipboardResources(
    collectQuireClipboardResources(slice, view)
  );
  const plainText =
    serializeQuireClipboardText(slice, view) ??
    slice.content.textBetween(0, slice.content.size, "\n");
  const internal = serializeQuireInternalClipboardSlice(slice, resources);

  return {
    slice,
    plainText,
    html: embedQuireClipboardPayload(serializeQuireClipboardHtml({
      ...options,
      slice
    }), internal),
    internal,
    resources
  };
}

/**
 * Serializes selection-owned structural clipboard data.
 *
 * @param options - Editor schema, structural data, and optional DOM document.
 * @returns Clipboard payloads for all supported formats.
 */
function serializeQuireStructuralClipboardData(
  options: QuireClipboardSelectionWriteOptions & {
    readonly data: QuireClipboardSelectionSerializedData;
  }
): QuireClipboardSerializedData {
  const view = resolveQuireClipboardView(options.editor, options.view);
  const slice = transformQuireCopiedSlice(options.data.slice, view);
  const resources = normalizeQuireClipboardResources(
    collectQuireClipboardResources(slice, view)
  );
  const htmlSlice = options.data.htmlSlice === undefined
    ? slice
    : transformQuireCopiedSlice(options.data.htmlSlice, view);
  const plainText = options.data.plainText ??
    serializeQuireClipboardText(slice, view) ??
    slice.content.textBetween(0, slice.content.size, "\n");
  const html = options.data.html ?? serializeQuireClipboardHtml({
    ...options,
    slice: htmlSlice
  });

  const internal = serializeQuireInternalClipboardSlice(slice, resources);

  return {
    slice,
    plainText,
    html: embedQuireClipboardPayload(html, internal),
    internal,
    resources
  };
}

/**
 * Reads structural clipboard data from selections that provide it.
 *
 * @param selection - Current ProseMirror selection.
 * @returns Structural clipboard data, or null.
 */
function serializeQuireClipboardSelection(
  selection: unknown
): ReturnType<QuireClipboardSerializableSelection["serializeClipboard"]> | null {
  if (
    typeof selection === "object" &&
    selection !== null &&
    "serializeClipboard" in selection &&
    typeof selection.serializeClipboard === "function"
  ) {
    return (selection as QuireClipboardSerializableSelection).serializeClipboard();
  }

  return null;
}

/**
 * Reads the richest compatible slice from clipboard data.
 *
 * @param options - Editor schema and readable clipboard adapter.
 * @returns Parsed rich slice, or null when rich formats are absent or incompatible.
 */
export function readQuireClipboardSlice(
  options: QuireClipboardSliceReadOptions
): Slice | null {
  const view = resolveQuireClipboardView(options.editor, options.view);
  const internalSlice = parseQuireInternalClipboardSlice(
    readQuireClipboardInternalData(options.clipboardData),
    options.editor
  );

  if (internalSlice && internalSlice.size > 0) {
    return transformQuirePastedSlice(internalSlice, view, false);
  }

  const html = stripQuireEmbeddedClipboardPayload(options.clipboardData.getData("text/html"));

  if (html.trim().length === 0) {
    return null;
  }

  const htmlSlice = parseQuireClipboardHtml(html, options.editor);

  return htmlSlice && htmlSlice.size > 0
    ? transformQuirePastedSlice(htmlSlice, view, false)
    : null;
}
