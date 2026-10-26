import { Facet } from "@quirekit/cm-state";
import type { TextLinkOptions } from "../types";

/** One installed rule as seen by whole-document consumers such as export. */
export interface TextLinkRule {
  /** Host options. */ readonly options: TextLinkOptions;
  /** Global matcher derived from the host pattern. */ readonly pattern: RegExp;
  /** Verification results shared with the presentation plugin. */ readonly known: Map<string, boolean>;
}

/** Rules installed by `textLinks()`, in installation order. */
export const textLinkRules = Facet.define<TextLinkRule>();
