import type { normalizeQuireDocumentFontTable } from "@quirekit/core";
import type {
  ClassicEditorDocumentFontStatus,
  ClassicEditorFontLibrary,
  ClassicEditorWebFontOptions
} from "../../types";

/** Attribute-only document input shared by canonical PM nodes and JSON imports. */
export interface ClassicEditorDocumentFontSource {
  /** Document attributes containing its font theme and alternate-name table. */
  readonly attrs?: unknown;
}

/** Body-font request extracted from canonical, host-independent document state. */
export interface ClassicDocumentFontRequest {
  /** Logical Latin body family, when declared. */
  readonly requestedFamily: string | null;
  /** Canonical document alternate-name table. */
  readonly fontTable: ReturnType<typeof normalizeQuireDocumentFontTable>;
}

/** Lifecycle handle for one Classic instance's document-font resolution request. */
export interface ClassicEditorDocumentFontReadiness {
  /** Current logical-to-rendered body-font resolution. */
  readonly status: ClassicEditorDocumentFontStatus;
  /** Explicit external font acquisition authority for this Classic instance. */
  readonly fontLibrary: ClassicEditorFontLibrary;
  /**
   * Re-resolves document-owned font facts after import or canonical updates.
   *
   * @param document - Latest document-owned font attributes.
   */
  update(document: ClassicEditorDocumentFontSource): void;
  /** Prevents deferred callbacks from touching a released editor. */
  destroy(): void;
}

/** Options used to resolve and wait for document fonts. */
export interface CreateClassicEditorDocumentFontReadinessOptions {
  /** Document that owns the mounted Classic editor and its FontFaceSet. */
  readonly ownerDocument: Document;
  /** Initial canonical document whose body font should be resolved. */
  readonly document?: ClassicEditorDocumentFontSource | undefined;
  /** Host external-font policy, or `false` when acquisition is disabled. */
  readonly webFonts?: ClassicEditorWebFontOptions | false | undefined;
  /** Callback that invalidates layout once font metrics are authoritative. */
  readonly onReady: () => void;
  /** Optional callback that refreshes product chrome after loader phase changes. */
  readonly onStatusChange?: (() => void) | undefined;
}

/** Inputs of the first-paint font gate. */
export interface GateClassicEditorFirstPaintOptions {
  /** Mounted View root hidden while the gate is pending. */
  readonly element: HTMLElement;
  /** Font set whose faces the first frame starts loading; absent outside browsers. */
  readonly fonts: FontFaceSet | undefined;
  /** Subscribes to committed View frames, returning its release function. */
  readonly onGeometryUpdate: ((listener: () => void) => () => void) | undefined;
  /** Maximum hidden time in milliseconds. */
  readonly timeoutMs?: number | undefined;
}
