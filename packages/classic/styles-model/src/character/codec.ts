import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";

type CharacterMark = NonNullable<QuireJSONContent["marks"]>[number];

/** Identity-only character-style codec; the styles package owns definitions. */
export const wordCharacterStyleDocxCodec = docx.codec.mark<CharacterMark>({
  id: "word.character-style", modelType: "wordCharacterStyle",
  import: { from: "characterStyle",
    /** @param context - Parsed run style. @returns Canonical identity mark without direct format expansion. */
    convert({ mark }) {
    return [{ type: "wordCharacterStyle", attrs: { styleId: mark.attrs?.styleId } }];
  } },
  export: {
    /** @param context - Canonical style occurrence. @returns LitAST run style reference. */
    convert({ mark }) {
    return [{ type: "characterStyle", attrs: { styleId: mark.attrs?.styleId } }];
  } },
  capabilities: { fields: ["styleId"] }
});
