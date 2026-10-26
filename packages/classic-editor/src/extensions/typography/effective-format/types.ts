import type { QuireEditor } from "@quirekit/core";

/** Script mode controlled by the compact Classic font-family picker. */
export type ClassicEffectiveFontTarget = "all" | ClassicEffectiveScriptSlot;

/** ProseMirror node type retained by the mounted Core editor. */
export type ClassicPmNode = QuireEditor["state"]["doc"];

/** ProseMirror mark type retained by one mounted document node. */
export type ClassicPmMark = ClassicPmNode["marks"][number];

/** Script slot currently understood by the shared document font model. */
export type ClassicEffectiveScriptSlot = "eastAsia" | "latin" | "complexScript";

/** One selected text segment with enough context to resolve inherited styles. */
export interface ClassicSelectedTextSegment {
  /** Selected source text, or a nearby caret hint for a collapsed selection. */
  readonly text: string;
  /** Inline marks active on this segment or caret. */
  readonly marks: readonly ClassicPmMark[];
  /** Owning text block used for role and node-style inheritance. */
  readonly textblock: ClassicPmNode;
  /** Absolute start of the owning textblock content, for public mark-style context. */
  readonly contentStart: number;
}

/** One comparable value resolved from a selected segment. */
export interface ClassicEffectiveFormatSample<Value> {
  /** Effective value after direct and inherited formatting are applied. */
  readonly value: Value;
  /** Whether a direct mark supplied this sample's value. */
  readonly hasDirect: boolean;
}

/** One resolved character-format value shared by the complete selection. */
export interface ClassicEffectiveFormatSingle<Value> {
  /** Discriminant for a selection with one effective value. */
  readonly kind: "single";
  /** Effective value after direct and inherited formatting are resolved. */
  readonly value: Value;
  /** Whether at least one covered run contributes a direct mark value. */
  readonly hasDirect: boolean;
}

/** Character-format state for a selection whose effective values differ. */
export interface ClassicEffectiveFormatMixed {
  /** Discriminant for a selection with differing effective values. */
  readonly kind: "mixed";
  /** Whether at least one covered run contributes a direct mark value. */
  readonly hasDirect: boolean;
}

/** Effective selection state rendered by one Classic formatting control. */
export type ClassicEffectiveFormatState<Value> =
  | ClassicEffectiveFormatSingle<Value>
  | ClassicEffectiveFormatMixed;
