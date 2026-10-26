import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireInlineSourceAnchor, QuireInlineTextRun } from "@quirekit/layout/inline";
import type { QuireDocumentFontSet, QuireDocumentFontTable, QuireFontSelectionResolver, QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { QuireInlineSourceCapabilityRegistry, QuireInlineSourceCapabilitySidecar } from "../../../layout/engine/inline/source-capability";
import type { QuireHiddenTextViewMode } from "../../types";

/** Options for extracting inline sources from one ProseMirror textblock. */
export interface QuireProseMirrorInlineSourceOptions {
  /** Container character allocation, independent of paragraph line-grid participation. */
  readonly characterGrid?: QuireCharacterGrid | null | undefined;
  /** Document-owned font selection compiled from inherited and direct style deltas. */
  readonly resolveFontSelection?: QuireFontSelectionResolver | undefined;
  /** Textblock node whose inline children should be inspected. */
  readonly node: ProseMirrorNode;
  /** Absolute document position at the start of textblock content. */
  readonly contentStart: number;
  /** Absolute document position at the end of textblock content. */
  readonly contentEnd: number;
  /** Stable id of the textblock that owns the inline sources. */
  readonly sourceId: string;
  /** Base CSS font shorthand inherited by unmarked text. */
  readonly font: string;
  /** Resolved paragraph line height available to text-like inline sources. */
  readonly lineHeight?: number | undefined;
  /** Resolved paragraph baseline offset available to text-like inline sources. */
  readonly textBaselineOffset?: number | undefined;
  /** Optional resolver for per-mark canvas style deltas. */
  readonly resolveMarkStyle?: QuireMarkCanvasStyleResolver;
  /** Optional base text style for the owning block node. */
  readonly nodeStyle?: QuireNodeCanvasTextStyle | null;
  /** Optional document role used to itemize unformatted text by font slot. */
  readonly documentFontSet?: QuireDocumentFontSet | undefined;
  /** Optional document-provided alternate names used during slot itemization. */
  readonly documentFontTable?: QuireDocumentFontTable | undefined;
  /** Hidden-text presentation policy selected by the owning layout pass. */
  readonly hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
  /** Internal exact-node-type registry that compiles clone-safe source capabilities. */
  readonly sourceCapabilityRegistry?: QuireInlineSourceCapabilityRegistry | undefined;
}

/** Renderer-neutral inline sources collected from one ProseMirror textblock. */
export interface QuireProseMirrorInlineSources {
  /** Mark-preserving text runs in document order. */
  readonly textRuns: readonly QuireInlineTextRun[];
  /** Non-text inline nodes retained as unresolved logical source anchors. */
  readonly sourceAnchors: readonly QuireInlineSourceAnchor[];
  /** Claimed View capability products keyed by logical source anchor id. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
}

/** Canonical source anchors plus View-owned capability products. */
export interface QuireProseMirrorInlineSourceProducts {
  /** Non-text inline nodes retained as logical source anchors. */
  readonly sourceAnchors: readonly QuireInlineSourceAnchor[];
  /** Claimed View capability products keyed by logical source anchor id. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
}

/** Options for collecting non-text inline source identity without shaping text. */
export interface QuireProseMirrorInlineSourceAnchorOptions {
  /** Textblock node whose inline children should be inspected. */
  readonly node: ProseMirrorNode;
  /** Absolute document position at the start of textblock content. */
  readonly contentStart: number;
  /** Absolute document position at the end of textblock content. */
  readonly contentEnd: number;
  /** Stable id of the textblock that owns the inline sources. */
  readonly sourceId: string;
  /** Internal exact-node-type registry that compiles clone-safe source capabilities. */
  readonly sourceCapabilityRegistry?: QuireInlineSourceCapabilityRegistry | undefined;
}

/** One collected logical source and its optional claimed View sidecar. */
export interface CollectedInlineSourceProduct {
  /** Canonical logical source anchor. */
  readonly anchor: QuireInlineSourceAnchor;
  /** View capability sidecar when an exact-node resolver claimed the source. */
  readonly capability?: QuireInlineSourceCapabilitySidecar | undefined;
}
import type { QuireCharacterGrid } from "@quirekit/renderer";
