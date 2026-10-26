import { createMsfeEditor, type AnyExtension, type MsfeEditor } from "@quirekit/msfe-core";
import { StarterKit } from "@quirekit/msfe-starter-kit";
import { ProsePresentation } from "./presentation/extension";
import { ProseHeading, ProseBold, ProseBlockquote, ProseListMarkers, ProseEmphasis, ProseInlineCode,
  ProseStrikethrough, ProseTable, ProseContainer, ProseCodeBlock, ProseHorizontalRule, ProseLink } from "./presentation/features";
import type { MdEditorExtensionOptions, MdEditorOptions } from "./types";
import { mdExtraExtensions } from "./presentation/extras";
import { mdCodeLanguages } from "./code/languages";
import { configuredInlineBoundaries } from "./presentation/inline";

/** @param options - Explicit feature customization. @returns A complete source-first product preset with shared Prose presentation. */
export function createMdEditorExtensions(options: MdEditorExtensionOptions = {}): readonly AnyExtension[] {
  return [StarterKit.configure({ heading: ProseHeading, bold: ProseBold, blockquote: ProseBlockquote,
    listMarkers: ProseListMarkers, emphasis: ProseEmphasis, inlineCode: ProseInlineCode, strikethrough: ProseStrikethrough,
    table: ProseTable, codeBlock: ProseCodeBlock, horizontalRule: ProseHorizontalRule, link: ProseLink, ...options.features }),
  ...(options.containers === false ? [] : [ProseContainer.configure(options.containers ?? {})]),
  ...mdExtraExtensions(options.extras),
  ProsePresentation.configure({ editingMode: options.view === "preview" ? "markdown" : "document", inlineBoundaries: configuredInlineBoundaries(options),
    editingBoundaries: options.editingBoundaries ?? [] }), ...options.extensions ?? []];
}

/** @param options - Mount target, initial source and explicit product configuration. @returns The unchanged public MSFE instance contract. */
export function createMdEditor(options: MdEditorOptions): MsfeEditor {
  const { features, containers, extensions, view, inlineBoundaries, editingBoundaries, extras, ...editor } = options;
  return createMsfeEditor({ ...editor, mode: view === "source" ? "source" : "live", codeLanguages: options.codeLanguages ?? mdCodeLanguages,
    extensions: createMdEditorExtensions({ ...(view ? { view } : {}), ...(inlineBoundaries ? { inlineBoundaries } : {}), ...(editingBoundaries ? { editingBoundaries } : {}), ...(features ? { features } : {}),
      ...(containers === undefined ? {} : { containers }), ...(extras === undefined ? {} : { extras }), ...(extensions ? { extensions } : {}) }) });
}
