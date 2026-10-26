import { HighlightStyle, syntaxHighlighting } from "@quirekit/cm-language";
import { EditorView } from "@quirekit/cm-view";
import { tagHighlighter, tags } from "@lezer/highlight";
import { themeVariableReferences as token } from "@quirekit/ui";

/** Syntax colors remain available in fences; Prose owns Markdown typography. */
export const proseHighlighting = syntaxHighlighting(HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: token.color.text.accent },
  { tag: [tags.typeName, tags.className, tags.namespace], color: token.color.info.text },
  { tag: [tags.string, tags.special(tags.string)], color: token.color.success.text },
  { tag: [tags.number, tags.bool, tags.null], color: token.color.warning.text },
  { tag: tags.regexp, color: token.color.danger.text },
  { tag: [tags.comment, tags.meta], color: token.color.text.tertiary },
  { tag: tags.heading, fontWeight: "inherit", textDecoration: "none" },
  { tag: tags.strong, fontWeight: "inherit" },
  { tag: tags.emphasis, fontStyle: "inherit" },
]));

/**
 * Markdown syntax classes for source mode. They are present in every mode, but only source mode styles
 * them, so rich modes keep Prose typography while source text still reads as structured Markdown.
 */
const sourceMarkdownTokens = syntaxHighlighting(tagHighlighter([
  { tag: tags.heading, class: "msfe-tok-heading" },
  { tag: tags.processingInstruction, class: "msfe-tok-mark" },
  { tag: tags.strong, class: "msfe-tok-strong" },
  { tag: tags.emphasis, class: "msfe-tok-emphasis" },
  { tag: tags.strikethrough, class: "msfe-tok-strike" },
  { tag: tags.link, class: "msfe-tok-link" },
  { tag: tags.url, class: "msfe-tok-url" },
  { tag: tags.labelName, class: "msfe-tok-label" },
  { tag: tags.quote, class: "msfe-tok-quote" },
]));

const source = "&[data-msfe-mode=source]";
const sourceMarkdownColors = EditorView.theme({
  [`${source} .msfe-tok-heading`]: { color: token.color.text.primary, fontWeight: "600" },
  [`${source} .msfe-tok-mark`]: { color: token.color.text.muted, fontWeight: "normal" },
  [`${source} .msfe-tok-strong`]: { fontWeight: "600" },
  [`${source} .msfe-tok-emphasis`]: { fontStyle: "italic" },
  [`${source} .msfe-tok-strike`]: { textDecoration: "line-through" },
  [`${source} .msfe-tok-link`]: { color: token.color.text.accent },
  [`${source} .msfe-tok-url`]: { color: token.color.text.tertiary, textDecoration: "underline", textUnderlineOffset: "2px" },
  [`${source} .msfe-tok-label`]: { color: token.color.info.text },
  [`${source} .msfe-tok-quote`]: { color: token.color.text.secondary },
});

/** Markdown structure colors for source mode only. */
export const sourceMarkdownHighlighting = [sourceMarkdownTokens, sourceMarkdownColors];
