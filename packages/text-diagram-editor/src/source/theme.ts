import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@quirekit/cm-language";
import { EditorView } from "@quirekit/cm-view";
import { themeVariableReferences as token } from "@quirekit/ui";

/** Semantic colors update with the host theme without rebuilding editor state. */
export const diagramSourceTheme = [syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: token.color.text.accent },
  { tag: tags.string, color: token.color.success.text },
  { tag: tags.number, color: token.color.warning.text },
  { tag: [tags.operator, tags.bracket], color: token.color.info.text },
  { tag: tags.comment, color: token.color.text.tertiary, fontStyle: "italic" },
])), EditorView.theme({
  "&": { height: "var(--qk-diagram-source-height, 360px)", fontSize: "13px", color: token.color.text.primary, backgroundColor: token.color.surface.page,
    border: `1px solid ${token.color.border.subtle}`, borderRadius: token.radius.control, overflow: "hidden" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: "1.6", overflow: "auto" },
  ".cm-content": { padding: "8px 0", caretColor: token.color.text.primary },
  ".cm-line": { padding: "0 10px" },
  ".cm-gutters": { backgroundColor: token.color.surface.subtle, color: token.color.text.tertiary, borderRight: `1px solid ${token.color.border.subtle}` },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: token.color.surface.hover },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: token.color.text.primary },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: token.color.selection.document },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: token.color.info.surface, outline: `1px solid ${token.color.info.border}` },
  ".cm-panels": { color: token.color.text.primary, backgroundColor: token.color.surface.subtle },
  ".cm-panels-top": { borderBottom: `1px solid ${token.color.border.subtle}` },
  ".cm-search": { fontFamily: "inherit", fontSize: "12px" },
  ".cm-textfield, .cm-button": { color: token.color.text.primary, background: token.color.surface.page,
    border: `1px solid ${token.color.border.default}`, borderRadius: token.radius.control },
  ".cm-textfield": { maxWidth: "140px" },
  ".cm-searchMatch": { backgroundColor: token.color.warning.surface, outline: `1px solid ${token.color.warning.border}` },
  ".cm-searchMatch-selected": { backgroundColor: token.color.info.surface, outline: `1px solid ${token.color.info.border}` },
})];
