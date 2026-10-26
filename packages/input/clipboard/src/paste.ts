import type { QuireEditor, QuireMountedEditorView } from "@quirekit/core";
import { Fragment, Slice } from "@quirekit/pm";
import { commitQuireClipboardPaste } from "./paste/transaction";
import {
  parseQuireClipboardTextWithProps,
  prepareQuireClipboardResourcePaste,
  transformQuireClipboardText,
  transformQuirePastedSlice
} from "./hooks";
import { parseQuireClipboardHtml } from "./html";
import { readQuireClipboardInternalData } from "./embedded";
import { parseQuireInternalClipboardPayload } from "./internal";

/**
 * Parses plain text into a pasteable ProseMirror slice.
 *
 * @param text - Plain text clipboard payload.
 * @param editor - Editor whose schema should parse the payload.
 * @param plainText - Whether the caller explicitly requested plain text paste.
 * @param view - Mounted view that initiated the paste.
 * @returns Parsed and transformed slice, or null when no content exists.
 */
export function parseQuireClipboardText(
  text: string,
  editor: QuireEditor,
  plainText = true,
  view: QuireMountedEditorView = editor.view
): Slice | null {
  const transformedText = transformQuireClipboardText(text, editor, view, plainText);

  if (transformedText.length === 0) {
    return null;
  }

  const parsed = parseQuireClipboardTextWithProps(
    transformedText,
    view,
    editor.state.pm.selection.$from,
    plainText
  );

  if (parsed) {
    return transformQuirePastedSlice(parsed, view, true);
  }

  return transformQuirePastedSlice(
    new Slice(Fragment.from(editor.state.schema.text(transformedText)), 0, 0),
    view,
    true
  );
}

/**
 * Pastes a parsed slice through PM-compatible paste handlers and fallback replace.
 *
 * @param editor - Editor receiving the paste.
 * @param slice - Parsed slice to paste.
 * @param event - Clipboard event associated with the paste.
 * @param view - Mounted view that initiated the paste.
 * @returns Whether a handler or the fallback paste consumed the slice.
 */
export function pasteQuireClipboardSlice(
  editor: QuireEditor,
  slice: Slice,
  event: ClipboardEvent,
  view: QuireMountedEditorView = editor.view
): boolean {
  if (!editor.isEditable) return false;
  const transfer = parseQuireInternalClipboardPayload(
    readQuireClipboardInternalData(event.clipboardData),
    editor
  );
  const resourcePaste = transfer === null
    ? null
    : prepareQuireClipboardResourcePaste(
      editor,
      slice,
      transfer.resources,
      view
    );
  if (resourcePaste !== null) {
    commitQuireClipboardPaste(editor, view, slice, resourcePaste);
    return true;
  }

  if (runQuireClipboardPasteHandlers(editor, slice, event, view)) {
    return true;
  }

  commitQuireClipboardPaste(editor, view, slice, null);

  return true;
}

/**
 * Runs PM-compatible paste handlers without applying a fallback transaction.
 *
 * File-only clipboard events use this with `Slice.empty`, matching the
 * ProseMirror view contract while leaving asynchronous file policy to an
 * owning extension or product.
 *
 * @param editor - Editor receiving the paste.
 * @param slice - Parsed slice or `Slice.empty` when no textual payload exists.
 * @param event - Clipboard event associated with the paste.
 * @param view - Mounted view that initiated the paste.
 * @returns Whether one paste handler consumed the event.
 */
export function runQuireClipboardPasteHandlers(
  editor: QuireEditor,
  slice: Slice,
  event: ClipboardEvent,
  view: QuireMountedEditorView = editor.view
): boolean {
  return view.someProp("handlePaste", (handler) => {
    const handlePaste = handler as (
      view: QuireMountedEditorView,
      event: ClipboardEvent,
      slice: Slice
    ) => boolean | void;

    return handlePaste(view, event, slice);
  }) === true;
}

/**
 * Pastes an HTML clipboard payload through the mounted view paste pipeline.
 *
 * @param editor - Editor receiving the paste.
 * @param html - HTML clipboard payload.
 * @param event - Optional clipboard event associated with the paste.
 * @param view - Mounted view that initiated the paste.
 * @returns Whether the paste was handled.
 */
export function pasteQuireClipboardHtml(
  editor: QuireEditor,
  html: string,
  event?: ClipboardEvent,
  view: QuireMountedEditorView = editor.view
): boolean {
  const parsedSlice = parseQuireClipboardHtml(html, editor);
  const slice = parsedSlice
    ? transformQuirePastedSlice(parsedSlice, view, false)
    : null;

  return slice
    ? pasteQuireClipboardSlice(editor, slice, createQuireClipboardEvent(event), view)
    : false;
}

/**
 * Pastes a plain text clipboard payload through the mounted view paste pipeline.
 *
 * @param editor - Editor receiving the paste.
 * @param text - Plain text clipboard payload.
 * @param event - Optional clipboard event associated with the paste.
 * @param view - Mounted view that initiated the paste.
 * @returns Whether the paste was handled.
 */
export function pasteQuireClipboardText(
  editor: QuireEditor,
  text: string,
  event?: ClipboardEvent,
  view: QuireMountedEditorView = editor.view
): boolean {
  const slice = parseQuireClipboardText(text, editor, true, view);

  return slice
    ? pasteQuireClipboardSlice(editor, slice, createQuireClipboardEvent(event), view)
    : false;
}

/**
 * Creates the clipboard event object passed to PM-compatible paste handlers.
 *
 * @param event - Optional native clipboard event.
 * @returns Clipboard event with at least a stable `type` value.
 */
function createQuireClipboardEvent(event?: ClipboardEvent): ClipboardEvent {
  if (event) {
    return event;
  }

  return {
    type: "paste",
    preventDefault: () => {}
  } as ClipboardEvent;
}
