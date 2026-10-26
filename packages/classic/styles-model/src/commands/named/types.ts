import type { WordParagraphFormattingPatch } from "@quirekit/classic-paragraph-model";
import type { WordStyleTextProperties } from "../../model/text/types";
import type { WordNamedCharacterStyle } from "../../model/types";

/** Product-level creation of a paragraph, character, or linked style. */
export interface CreateWordNamedStyleOptions {
  /** Stable id; omitted to allocate a collision-free document id. */
  readonly id?: string;
  /** Visible style name. */
  readonly name: string;
  /** A linked style atomically creates a paragraph/character pair. */
  readonly kind: "paragraph" | "character" | "linked";
  /** Same-kind base style, or null for an independent root. */
  readonly basedOn?: string | null;
  /** Character property delta shared by a newly linked pair. */
  readonly text?: WordStyleTextProperties;
  /** Paragraph delta; rejected for a character-only definition. */
  readonly paragraph?: WordParagraphFormattingPatch;
}

/** Options for applying or removing a character style. */
export interface ApplyWordCharacterStyleOptions {
  /** Existing character id, or null to restore paragraph typography. */
  readonly styleId: string | null;
}

/** Complete character definition replacement. */
export interface UpdateWordCharacterStyleOptions {
  /** Definition preserving the existing stable id. */
  readonly style: WordNamedCharacterStyle;
}

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Named character and linked style lifecycle. */
    readonly wordNamedStyles: {
      /** Creates a new named definition or linked pair. */
      createWordNamedStyle: (options: CreateWordNamedStyleOptions) => ReturnType;
      /** Updates one existing character definition. */
      updateWordCharacterStyle: (options: UpdateWordCharacterStyleOptions) => ReturnType;
      /** Applies a character identity to selected text or subsequent typing. */
      applyWordCharacterStyle: (options: ApplyWordCharacterStyleOptions) => ReturnType;
      /** Uses the linked character style for a partial single-paragraph selection. */
      applyWordLinkedStyle: (options: { readonly styleId: string }) => ReturnType;
    };
  }
}
