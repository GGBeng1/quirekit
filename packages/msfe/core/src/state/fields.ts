import { Annotation, Facet, StateEffect, StateField } from "@quirekit/cm-state";
import type { MsfeMode } from "./types";

/** Identifies the mutation source without serializing the document. */
export const changeOrigin = Annotation.define<string>();
/** Presentation setting, independent of history configuration. */
export const modeFacet = Facet.define<MsfeMode, MsfeMode>({ combine: values => values[0] ?? "source" });
/** Records the lifetime of browser composition, including an uncommitted preedit. */
export const compositionEffect = StateEffect.define<boolean>();
/** Composition state is shared by projection and mode-switch ownership. */
export const compositionField = StateField.define<boolean>({
  create: () => false,
  update: (value, transaction) => {
    for (const effect of transaction.effects) if (effect.is(compositionEffect)) value = effect.value;
    return value;
  },
});
/** Source revision changes only when an accepted transaction changes text. */
export const revisionField = StateField.define<number>({
  create: () => 0,
  update: (revision, transaction) => revision + Number(transaction.docChanged),
});
