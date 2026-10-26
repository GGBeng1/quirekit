import type { QuireJSONContent } from "@quirekit/core";
import { docx } from "@quirekit/lit-docx-contract";
import { readUnderlineAttributes } from "./validation";
type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];
/** Bidirectional native underline codec, including explicit none. */
export const underlineDocxCodec = docx.codec.mark<QuireMark>({
  id: "extension.underline", modelType: "underline",
  import: { from: "underline", convert: ({ mark }) => {
    const source = mark.attrs ?? {};
    const attrs = readUnderlineAttributes({ ...source, ...(source.color === "auto" ? { color: null } : {}) });
    return [{ type: "underline", attrs: { underlineType: attrs.underlineType,
      ...(source.color === undefined ? {} : { color: attrs.color }) } }];
  } },
  export: { convert: ({ mark }) => {
    const attrs = readUnderlineAttributes(mark.attrs ?? {});
    // Missing color preserves imported authority; explicit null writes automatic
    // color and invalidates an older preserved theme reference on this property.
    return [{ type: "underline", attrs: { underlineType: attrs.underlineType,
      ...(mark.attrs?.color === null ? { color: "auto" } : attrs.color === null ? {} : { color: attrs.color }) } }];
  } },
  capabilities: { fields: ["underlineType", "color", {
    field: "litAstMarkAttrs",
    import: { disposition: "preserved", preservation: { authority: "Legacy underline attributes remain readable until native fields replace them.", invalidation: "Explicit native underline fields take precedence." } },
    export: { disposition: "preserved", preservation: { authority: "Legacy underline attributes remain readable until native fields replace them.", invalidation: "Explicit native underline fields take precedence." } }
  }] }
});
