import { wordParagraphBorderPresets, wordParagraphBorderSides } from "./model";
import type { WordParagraphDecorationOperation } from "./types";

/** @param value - Untrusted JSON. @returns Whether a plain record can be inspected. */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** @param value - Candidate color. @returns Whether it is opaque RGB or auto. */
function color(value: unknown): boolean {
  return value === "auto" || (typeof value === "string" && /^#[\da-f]{6}$/iu.test(value));
}
/** @param value - Pen or partial pen. @param complete - Whether all fields are required. @returns Validated fields only. */
function pen(value: unknown, complete: boolean): boolean {
  if (!record(value)) return false;
  const fields = ["style", "color", "sizeEighthPoints", "spacePoints"];
  if (Object.keys(value).some(key => !fields.includes(key))) return false;
  if (!complete && !fields.some(key => value[key] !== undefined)) return false;
  if (complete && fields.some(key => value[key] === undefined)) return false;
  return (value.style === undefined || (typeof value.style === "string" && ["single", "dotted", "dashed", "double"].includes(value.style)))
    && (value.color === undefined || color(value.color))
    && (value.sizeEighthPoints === undefined || (Number.isInteger(value.sizeEighthPoints) && Number(value.sizeEighthPoints) >= 2 && Number(value.sizeEighthPoints) <= 96))
    && (value.spacePoints === undefined || (Number.isInteger(value.spacePoints) && Number(value.spacePoints) >= 0 && Number(value.spacePoints) <= 31));
}
/** @param value - Untrusted public command input. @returns Whether the entire intent is supported and finite. */
export function isWordParagraphDecorationOperation(value: unknown): value is WordParagraphDecorationOperation {
  if (!record(value)) return false;
  if (value.kind === "restore") return true;
  if (value.kind === "fill") return value.color === null || color(value.color);
  if (value.kind === "border") return pen(value.patch, false);
  if (value.kind === "preset") return wordParagraphBorderPresets.some(preset => preset === value.preset) && pen(value.pen, true);
  return value.kind === "side" && wordParagraphBorderSides.some(side => side === value.side)
    && typeof value.enabled === "boolean" && pen(value.pen, true);
}
