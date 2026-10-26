import type { LitAstMark } from "@quirekit/lit-docx-contract";
import type { WordParagraphMarkFormatting } from "../../types";
import { litAstParagraphMarkFormattingToWord } from "./read";
import { isMark } from "./values";

/**
 * Updates only modeled paragraph-mark properties that differ from their source.
 * @param value - Current canonical subset, or null to clear that subset.
 * @param preservedMarks - Imported marks carrying unowned semantics and raw snapshots.
 * @returns Current marks; an explicit empty list prevents stale raw fallback after clearing.
 */
export function wordParagraphMarkFormattingToLitAst(
  value: WordParagraphMarkFormatting | null,
  preservedMarks: unknown = null
): readonly LitAstMark[] | null {
  const hasSource = Array.isArray(preservedMarks);
  if (value === null && !hasSource) return null;
  const source = hasSource ? preservedMarks.filter(isMark) : [];
  if (value === null && source.length === 0) return null;
  const before = litAstParagraphMarkFormattingToWord(source);
  let marks: LitAstMark[] = structuredClone(source);
  const attrs: Record<string, unknown> = { ...marks.find(mark => mark.type === "textStyle")?.attrs };

  // The canonical subset does not own the whole run-property bag. Preserve
  // source semantics first so the generator invalidates only actual edits.
  for (const key of ["fontFamily", "fontSizePt", "color"] as const) {
    if ((before?.[key] ?? null) === (value?.[key] ?? null)) continue;
    const property = key === "fontSizePt" ? "fontSize" : key;
    delete attrs[property];
    if (key === "fontFamily") {
      delete attrs.fontFamilyAsciiTheme; delete attrs.fontFamilyHighAnsiTheme;
    } else if (key === "color") {
      delete attrs.themeColor; delete attrs.themeShade; delete attrs.themeTint;
    }
    if (value?.[key] != null) attrs[property] = key === "fontSizePt" ? `${value.fontSizePt}pt` : value[key];
  }
  for (const key of ["bold", "italic", "underline", "strike"] as const) {
    if ((before?.[key] ?? null) === (value?.[key] ?? null)) continue;
    marks = marks.filter(mark => mark.type !== key);
    if (key === "bold" || key === "italic") {
      delete attrs[key];
      if (value?.[key] === false) attrs[key] = false;
    }
    if (value?.[key] === true) marks.push({ type: key });
  }

  // Keep the original raw semantic snapshot unchanged. It is the comparison
  // authority for LitDOCX, including fields this owner cannot edit or render.
  const textStyle = marks.findIndex(mark => mark.type === "textStyle");
  if (Object.keys(attrs).length > 0) {
    const mark: LitAstMark = { ...(textStyle < 0 ? {} : marks[textStyle]), type: "textStyle", attrs };
    if (textStyle < 0) marks.push(mark);
    else marks[textStyle] = mark;
  } else if (textStyle >= 0) marks.splice(textStyle, 1);
  return marks;
}
