import type { DecorationSet } from "@quirekit/pm";

/** Retained marker projection with an explicit transient permission dependency. */
export interface ListPresentation {
  /** Permission used when creating task widgets. */
  readonly editable: boolean;
  /** Derived marker nodes and widgets; never serialized in the document. */
  readonly decorations: DecorationSet;
}
