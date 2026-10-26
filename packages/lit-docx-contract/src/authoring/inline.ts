import type { LitAstMark } from "../core/contracts.js";
import type {
  DocxInlineApi,
  DocxLinkOptions,
  DocxTextOptions
} from "./types.js";
import { createDocxMarksApi } from "./marks.js";

/**
 * Creates the semantic inline operation family.
 *
 * @returns Immutable inline builders.
 */
export function createDocxInlineApi(): DocxInlineApi {
  const marks = createDocxMarksApi();
  const api: DocxInlineApi = {
    /** @param options - Explicit native guide properties and two run sequences. @returns Immutable guide node. */
    ruby: ({ base, annotation, marks: outerMarks, ...properties }) => Object.freeze({
      type: "ruby",
      children: Object.freeze([...base]),
      attrs: Object.freeze({ ...properties, rubyText: Object.freeze([...annotation]) }),
      ...(outerMarks === undefined ? {} : { marks: freezeMarks(outerMarks) })
    }),
    text: (text: string, options: DocxTextOptions = {}) => Object.freeze({
      type: "text",
      text,
      ...(options.marks === undefined
        ? {}
        : { marks: freezeMarks(options.marks) })
    }),
    link: (text: string, options: DocxLinkOptions) => {
      const link: LitAstMark = marks.link({
        href: options.href,
        ...(options.title === undefined ? {} : { title: options.title }),
        ...(options.target === undefined ? {} : { target: options.target })
      });
      return Object.freeze({
        type: "text",
        text,
        marks: freezeMarks([...(options.marks ?? []), link])
      });
    }
  };
  return Object.freeze(api);
}

/**
 * Copies and freezes one mark sequence.
 *
 * @param marks - Source marks.
 * @returns Immutable mark sequence.
 */
function freezeMarks(marks: readonly LitAstMark[]): readonly LitAstMark[] {
  return Object.freeze(marks.map((mark) => Object.freeze({
    ...mark,
    ...(mark.attrs === undefined
      ? {}
      : { attrs: Object.freeze({ ...mark.attrs }) })
  })));
}
