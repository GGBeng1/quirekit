import type {
  MarkType,
  NodeType
} from "@quirekit/pm";

/** Mark type identifier accepted by mark command helpers. */
export type QuireMarkTypeInput = string | MarkType;

/** Node or mark type identifier accepted by attribute command helpers. */
export type QuireAttributeTypeInput = string | NodeType | MarkType;

/** Options used when removing a mark. */
export interface QuireUnsetMarkOptions {
  /** Whether an empty selection should expand to the active mark range first. */
  readonly extendEmptyMarkRange?: boolean | undefined;
}

/** Options used when toggling a mark. */
export interface QuireToggleMarkOptions extends QuireUnsetMarkOptions {}
