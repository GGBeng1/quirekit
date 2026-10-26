import type {
  DocxLinkMarkOptions,
  DocxMarksApi,
  DocxRunProperties
} from "./types.js";
import { createDocxStylesApi, normalizeColor } from "./styles.js";

/**
 * Creates the semantic mark operation family.
 *
 * @returns Immutable mark builders.
 */
export function createDocxMarksApi(): DocxMarksApi {
  const styles = createDocxStylesApi();
  const api: DocxMarksApi = {
    bold: () => Object.freeze({ type: "bold" }),
    highlight: (color = "yellow") => Object.freeze({
      type: "highlight",
      attrs: Object.freeze({ color: normalizeColor(color) })
    }),
    link: (options: DocxLinkMarkOptions) => {
      if (options.href.trim().length === 0) {
        throw new TypeError("DOCX links require a non-empty href.");
      }
      return Object.freeze({
        type: "link",
        attrs: Object.freeze({
          href: options.href,
          ...(options.title == null ? {} : { title: options.title }),
          ...(options.target == null ? {} : { target: options.target })
        })
      });
    },
    textStyle: (properties: DocxRunProperties) => Object.freeze({
      type: "textStyle",
      attrs: styles.runProperties(properties)
    })
  };
  return Object.freeze(api);
}
