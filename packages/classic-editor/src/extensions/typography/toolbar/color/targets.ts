import { readHighlighterPenState } from "@quirekit/extension-text-style";
import { readFormatPainterState } from "@quirekit/extensions";
import type { ClassicEditorColorTarget } from "../../types";
import { classicHighlightPaletteRows, resolveClassicHighlightHex, resolveClassicHighlightToken } from "../../highlight-palette";
import type { ClassicColorToolbarEditor, ClassicColorToolbarTarget } from "./types";

const hexColorPattern = /^#[0-9A-F]{6}$/iu;

/**
 * Reads one free RGB `textStyle` slot as an uppercase hex color.
 *
 * @param value - Attribute stored on the textStyle mark.
 * @returns Uppercase hex color, or null when the slot is unset or not hex.
 */
function readHexColor(value: unknown): string | null {
  return typeof value === "string" && hexColorPattern.test(value) ? value.toUpperCase() : null;
}

const colorTargets: Readonly<Record<ClassicEditorColorTarget, ClassicColorToolbarTarget>> = {
  color: {
    messageKey: "textColor", icon: "textColor", fallbackColor: "#111827", startsWithFallback: false, showMore: true,
    read: editor => readHexColor(editor.getAttributes("textStyle").color),
    apply: (editor, color) => editor.commands.setColor(color),
    clear: editor => editor.commands.unsetColor()
  },
  backgroundColor: {
    messageKey: "backgroundColor", icon: "fillColor", fallbackColor: "#FFF2A8", startsWithFallback: false, showMore: true,
    read: editor => readHexColor(editor.getAttributes("textStyle").backgroundColor),
    apply: (editor, color) => editor.commands.setBackgroundColor(color),
    clear: editor => editor.commands.unsetBackgroundColor()
  },
  // OOXML highlight only stores named tokens, so the picker offers Word's
  // fixed gallery and maps between paint colors and tokens at the boundary.
  // Without a selection the choice arms Word's highlighter pen instead.
  highlight: {
    messageKey: "textHighlight", icon: "textHighlight", fallbackColor: resolveClassicHighlightHex("yellow")!, startsWithFallback: true, showMore: false,
    colors: classicHighlightPaletteRows,
    read: editor => resolveClassicHighlightHex(editor.getAttributes("highlight").color),
    apply: (editor, color) => {
      const token = resolveClassicHighlightToken(color);
      if (token === undefined) return false;
      return editor.state.pm.selection.empty ? startPen(editor, token) : editor.commands.setHighlight({ color: token });
    },
    clear: editor => editor.state.pm.selection.empty ? startPen(editor, null) : editor.commands.unsetHighlight(),
    pen: {
      isActive: editor => readHighlighterPenState(editor.state).active,
      stop: editor => editor.commands.stopHighlighterPen()
    }
  }
};

/**
 * Arms the highlighter pen; it replaces an active format painter, as only one brush tool owns gestures.
 *
 * @param editor - Editor receiving the mode change.
 * @param token - Pen color, or null for the eraser.
 * @returns Whether the pen was armed.
 */
function startPen(editor: ClassicColorToolbarEditor, token: string | null): boolean {
  if (readFormatPainterState(editor.state).mode !== "off") editor.commands.cancelFormatPainter();
  return editor.commands.startHighlighterPen(token);
}

/**
 * Resolves the document adapter behind one Classic color widget.
 *
 * @param target - Color slot named by the owning contribution.
 * @returns Read, apply and clear operations plus the slot's picker preset.
 */
export function resolveClassicColorToolbarTarget(target: ClassicEditorColorTarget): ClassicColorToolbarTarget {
  return colorTargets[target];
}
