import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuirePageModelProfile, QuirePageSection } from "../../../document-profile/types";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import type { QuireStorySourceLayout } from "../page-bands/source";

/** Measured body of one page-bottom footnote and its body reference. */
export interface QuirePageFootnoteSourceLayout extends QuirePageNoteSourceLayout {
  /** Absolute position of the body reference. */
  readonly referencePosition: number;
}

/** Measured auxiliary-story body shared by page-bottom notes and endnotes. */
export interface QuirePageNoteSourceLayout extends QuireStorySourceLayout {
  /** Stable note identity. */
  readonly noteId: string;
  /** Story holding the note body. */
  readonly storyId: string;
}

/** Measured body of one endnote placed after the body flow. */
export type QuirePageEndnoteSourceLayout = QuirePageNoteSourceLayout;

/** Common services for placing either kind of measured note into accepted areas. */
export interface AttachQuirePageNoteInstancesOptions<Source extends QuirePageNoteSourceLayout = QuirePageNoteSourceLayout> {
  /** Projected document whose pages carry accepted note placement facts. */
  readonly layoutDocument: QuireLayoutDocument;
  /** Document root used to resolve the governing section. */
  readonly documentNode: ProseMirrorNode;
  /** Measured note bodies in source order. */
  readonly sources: readonly Source[];
  /** Band height above an area's first note. */
  readonly separatorHeight: number;
  /** Band height above an area continuing notes from an earlier fragment. */
  readonly continuationSeparatorHeight: number;
  /** Section owning these pages, when laid out per section. */
  readonly section?: QuirePageSection | undefined;
  /** Final physical page count. */
  readonly pageCount: number;
  /** Canonical text measurer shared by story occurrences. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Page semantics supplying the separator rule and numbering. */
  readonly pageModel: QuirePageModelProfile;
}

/** Inputs for placing footnote bodies at the bottom of their pages or columns. */
export type AttachQuirePageFootnoteInstancesOptions = AttachQuirePageNoteInstancesOptions<QuirePageFootnoteSourceLayout>;
/** Inputs for placing endnote bodies in areas reserved after the flow. */
export type AttachQuirePageEndnoteInstancesOptions = AttachQuirePageNoteInstancesOptions<QuirePageEndnoteSourceLayout>;
