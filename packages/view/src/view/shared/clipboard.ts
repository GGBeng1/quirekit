import type { Slice } from "@quirekit/pm";
import { serializeQuireClipboardSlice } from "@quirekit/clipboard";

/** Clipboard serializer inputs shared with the mounted view. */
type SerializeOptions = Parameters<typeof serializeQuireClipboardSlice>[0];

/** Clipboard payload produced for one mounted view. */
export interface MountedViewClipboardPayload {
  /** Detached DOM holding the serialized HTML. */
  readonly dom: HTMLElement;
  /** Plain-text serialization. */
  readonly text: string;
  /** Slice after clipboard transforms. */
  readonly slice: Slice;
}

/**
 * Serializes a slice through the clipboard pipeline into a detached DOM owned by the view's document.
 *
 * @param editor - Editor whose schema and serializers apply.
 * @param view - Mounted view requesting serialization.
 * @param slice - Slice to serialize.
 * @param fallbackDocument - Document used when the view root is a detached shadow root.
 * @returns DOM, text, and transformed slice payloads.
 */
export function serializeMountedViewClipboard(
  editor: SerializeOptions["editor"],
  view: SerializeOptions["view"] & { readonly root: Document | ShadowRoot },
  slice: Slice,
  fallbackDocument: Document
): MountedViewClipboardPayload {
  const ownerDocument = view.root.nodeType === 9
    ? view.root as Document
    : view.root.ownerDocument ?? fallbackDocument;
  const serialized = serializeQuireClipboardSlice({ editor, view, slice, ownerDocument });
  const wrapper = ownerDocument.createElement("div");
  wrapper.innerHTML = serialized.html;
  return { dom: wrapper, text: serialized.plainText, slice: serialized.slice };
}
