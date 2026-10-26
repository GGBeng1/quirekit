import type {
  QuireClipboardResource,
  QuireEditor,
  QuireMountedEditorView
} from "@quirekit/core";
import type { Selection, Slice } from "@quirekit/pm";

/** Minimal plain-text clipboard data adapter used by editor input handling. */
export interface QuireClipboardData {
  /** MIME types currently available on the clipboard adapter. */
  readonly types?: readonly string[];
  /**
   * Reads clipboard data for a MIME type.
   *
   * @param type - MIME type to read.
   * @returns Clipboard value for the requested type.
   */
  readonly getData: (type: string) => string;
  /**
   * Writes clipboard data for a MIME type.
   *
   * @param type - MIME type to write.
   * @param value - Clipboard value to store.
   */
  readonly setData: (type: string, value: string) => void;
}

/** Serialized QuireKit slice payload stored on the private clipboard MIME. */
export interface QuireInternalClipboardPayload {
  /** Payload discriminator used to reject unrelated custom clipboard data. */
  readonly type: "quirekit/slice";
  /** Payload version used for future migration gates. */
  readonly version: 1;
  /** Schema family marker used to reject incompatible editor protocols. */
  readonly schema: "quirekit";
  /** ProseMirror slice JSON produced by Slice.toJSON(). */
  readonly slice: unknown;
  /** Optional ordered extension-owned resources referenced by the slice. */
  readonly resources?: readonly QuireClipboardResource[] | undefined;
}

/** Parsed private clipboard transfer with canonical slice and resources. */
export interface QuireInternalClipboardTransfer {
  /** Parsed ProseMirror slice owned by the receiving editor schema. */
  readonly slice: Slice;
  /** Validated extension-owned resources in deterministic payload order. */
  readonly resources: readonly QuireClipboardResource[];
}

/** Rich clipboard payload derived from the current editor selection. */
export interface QuireClipboardSerializedData {
  /** Slice after copy transforms have been applied. */
  readonly slice: Slice;
  /** Plain text fallback written to text/plain. */
  readonly plainText: string;
  /** Sanitized HTML fallback written to text/html. */
  readonly html: string;
  /** Private JSON slice payload written to the QuireKit MIME. */
  readonly internal: string;
  /** Validated extension-owned resources written to the private payload. */
  readonly resources: readonly QuireClipboardResource[];
}

/** Clipboard formats supplied by a structural ProseMirror selection. */
export interface QuireClipboardSelectionSerializedData {
  /** Slice after structural selection extraction. */
  readonly slice: Slice;
  /** Optional static-display slice used only for semantic external HTML. */
  readonly htmlSlice?: Slice;
  /** Optional plain text override for text/plain. */
  readonly plainText?: string;
  /** Optional HTML override for text/html. */
  readonly html?: string;
}

/** Selection that can provide structural clipboard serialization. */
export interface QuireClipboardSerializableSelection extends Selection {
  /**
   * Serializes the selection into clipboard-ready structural formats.
   *
   * @returns Structural clipboard data for this selection.
   */
  readonly serializeClipboard: () => QuireClipboardSelectionSerializedData;
}

/** Options used to serialize an editor selection to clipboard formats. */
export interface QuireClipboardSelectionWriteOptions {
  /** Editor whose current selection should be serialized. */
  readonly editor: QuireEditor;
  /** Mounted view that initiated clipboard serialization. */
  readonly view?: QuireMountedEditorView | undefined;
  /** Clipboard adapter receiving MIME payloads. */
  readonly clipboardData: QuireClipboardData;
  /** DOM document used by PM DOMSerializer when one is available. */
  readonly ownerDocument?: Document | null;
}

/** Options used to serialize a slice to clipboard formats. */
export interface QuireClipboardSliceSerializeOptions {
  /** Editor whose schema owns the slice. */
  readonly editor: QuireEditor;
  /** Mounted view that initiated clipboard serialization. */
  readonly view?: QuireMountedEditorView | undefined;
  /** Slice that should be serialized for clipboard transfer. */
  readonly slice: Slice;
  /** DOM document used by PM DOMSerializer when one is available. */
  readonly ownerDocument?: Document | null;
}

/** Options used to read rich clipboard data into an editor slice. */
export interface QuireClipboardSliceReadOptions {
  /** Editor whose schema should parse incoming clipboard data. */
  readonly editor: QuireEditor;
  /** Mounted view that initiated clipboard parsing. */
  readonly view?: QuireMountedEditorView | undefined;
  /** Clipboard adapter containing MIME payloads. */
  readonly clipboardData: QuireClipboardData;
}
