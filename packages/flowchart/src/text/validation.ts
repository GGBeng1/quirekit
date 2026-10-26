import type { FlowchartNode } from "../model/types";
import { array, number, record, text } from "../model/validation";
import type { FlowchartTextFormat, FlowchartTextSpan } from "./types";

/** @param node - Caption owner. @returns Whether it has one ordinary visible text authority. */
export function canFormatFlowchartText(node: Pick<FlowchartNode, "shape" | "entity" | "uml">): boolean {
  return node.shape !== "group" && node.shape !== "image" && !node.entity && !node.uml;
}
/** @param text - Canonical Unicode. @param offset - Candidate UTF-16 boundary. @returns Whether a range boundary is safe. */
export function isFlowchartTextBoundary(text: string, offset: number): boolean {
  return Number.isSafeInteger(offset) && offset >= 0 && offset <= text.length
    && !(offset > 0 && offset < text.length && /[\uD800-\uDBFF]/u.test(text[offset - 1]!) && /[\uDC00-\uDFFF]/u.test(text[offset]!));
}
/** @param input - Untrusted link. @returns Literal safe destination without normalization losses. */
export function readFlowchartTextLink(input: unknown): string {
  text(input);
  if (typeof input !== "string" || !input || input.length > 2048 || input.trim() !== input || /[\u0000-\u0020\u007f]/u.test(input)) throw new TypeError("textSpans.link: invalid URL");
  // This headless contract admits common absolute links without requiring DOM
  // URL types. Credentials and unusual authority syntax are explicitly excluded.
  const host = "(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\\[[0-9a-f:]+\\])";
  const http = new RegExp(`^https?://${host}(?::([0-9]{1,5}))?(?:[/?#].*)?$`, "iu").exec(input);
  const mail = new RegExp(`^mailto:[a-z0-9.!#$%&'*+/=?^_\\x60{|}~-]+@${host}(?:\\?.*)?$`, "iu").test(input);
  if ((!http && !mail) || http?.[1] && (Number(http[1]) < 1 || Number(http[1]) > 65535)) throw new TypeError("textSpans.link: unsupported URL");
  return input;
}
/** @param input - Strict format-only object. @returns Checked deeply immutable overrides. */
export function readFlowchartTextFormat(input: unknown): FlowchartTextFormat {
  const value = record(input, ["bold", "italic", "underline", "strike", "fontSize", "color", "link"], "textSpans");
  const format: { -readonly [K in keyof FlowchartTextFormat]: FlowchartTextFormat[K] } = {};
  for (const key of ["bold", "italic", "underline", "strike"] as const) if (Object.hasOwn(value, key)) {
    if (typeof value[key] !== "boolean") throw new TypeError(`textSpans.${key}: invalid boolean`); format[key] = value[key];
  }
  if (Object.hasOwn(value, "fontSize")) format.fontSize = number(value.fontSize, 10, 72, "textSpans.fontSize");
  if (Object.hasOwn(value, "color")) { if (typeof value.color !== "string" || !/^#[\da-f]{6}$/iu.test(value.color)) throw new TypeError("textSpans.color: invalid color"); format.color = value.color; }
  if (Object.hasOwn(value, "link")) format.link = readFlowchartTextLink(value.link);
  return Object.freeze(format);
}
/** @param input - Candidate ordered ranges. @param text - Canonical caption. @returns Bounded immutable spans. */
export function readFlowchartTextSpans(input: unknown, text: string): readonly FlowchartTextSpan[] {
  let end = 0;
  return Object.freeze(array(input, 256).map(candidate => {
    const value = record(candidate, ["from", "to", "bold", "italic", "underline", "strike", "fontSize", "color", "link"], "textSpans");
    const { from, to, ...rest } = value;
    if (!isFlowchartTextBoundary(text, from as number) || !isFlowchartTextBoundary(text, to as number) || (from as number) < end || (to as number) <= (from as number)) throw new TypeError("textSpans: invalid or overlapping range");
    const format = readFlowchartTextFormat(rest); if (!Object.keys(format).length) throw new TypeError("textSpans: empty format");
    end = to as number; return Object.freeze({ from: from as number, to: to as number, ...format });
  }));
}
