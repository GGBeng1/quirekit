import { isMarkActive, type CommandProps } from "@quirekit/core";
import { underlineStyles } from "./styles";
import type { UnderlineStyle } from "./types";
/** @param value - Candidate persisted token. @returns Whether it belongs to ST_Underline. */
export function isUnderlineStyle(value: unknown): value is UnderlineStyle {
  return typeof value === "string" && (underlineStyles as readonly string[]).includes(value);
}

/** @param attrs - Native or legacy persisted fields. @returns Canonical tuple, with explicit null color distinct from missing legacy color. */
export function readUnderlineAttributes(attrs: Readonly<Record<string, unknown>>): { underlineType: UnderlineStyle; color: string | null } {
  const raw = attrs.litAstMarkAttrs;
  const legacy = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const underlineType = attrs.underlineType ?? legacy.underlineType ?? "single";
  const color = attrs.color === undefined ? legacy.color ?? null : attrs.color;
  if (!isUnderlineStyle(underlineType)) throw new TypeError(`Unsupported underline type: ${String(underlineType)}`);
  if (color !== null && (typeof color !== "string" || !/^#[0-9a-f]{6}$/iu.test(color))) throw new TypeError("Unsupported underline color");
  return { underlineType, color };
}

/** @param state - Current or chained command state. @returns Whether every selected underline is visible. */
export function isUnderlineActive(state: CommandProps["state"]): boolean {
  if (!isMarkActive(state, "underline")) return false;
  /** @param marks - Inline marks. @returns Whether the underline draws a visible line. */
  const visible = (marks: readonly CommandProps["state"]["doc"]["marks"][number][]) => {
    const mark = marks.find(item => item.type.name === "underline");
    return mark !== undefined && readUnderlineAttributes(mark.attrs).underlineType !== "none";
  };
  if (state.selection.empty) return visible(state.storedMarks ?? state.selection.$from.marks());
  let active = true;
  for (const range of state.selection.ranges) {
    state.doc.nodesBetween(range.$from.pos, range.$to.pos, node => { if (node.isText && !visible(node.marks)) active = false; });
  }
  return active;
}
