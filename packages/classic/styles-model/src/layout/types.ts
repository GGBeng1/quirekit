import type { QuireFontSelectionResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import type { WordParagraphModelFormatting } from "@quirekit/classic-paragraph-model";

/** Document-wide named-style authority shaped for a layout engine. */
export interface WordStylesParagraphStyleContext {
  /** Active paragraph style registry, or undefined when the document has no Word Styles. */
  readonly token: unknown;
  /** Stable registry identity, or null when the document has no Word Styles. */
  readonly signature: string | null;
}

/**
 * Word named-style semantics shaped for a layout engine's paragraph model.
 *
 * The shape is structural so this package stays independent of any engine;
 * `@quirekit/classic-layout` registers it with the canvas engine.
 */
export interface WordStylesParagraphModelSemantics {
  /** Compiles a source-run font selector without exposing Word semantics to the engine. */
  readonly fontSelection: QuireFontSelectionResolver;
  /** Resolves the document's named-style authority once per snapshot. */
  readonly styleContext: (doc: Node) => WordStylesParagraphStyleContext;
  /** Resolves effective paragraph formatting from styles, a table-style layer and direct formatting. */
  readonly resolveParagraph: (node: Node, context: WordStylesParagraphStyleContext, tableLayer: unknown) =>
    WordParagraphModelFormatting;
  /** Creates cache identity for named-style typography affecting one paragraph. */
  readonly styleTextSignature: (node: Node, context: WordStylesParagraphStyleContext, tableLayer: unknown) => string;
  /** Applies named-style and table-style typography to an extension-resolved node style. */
  readonly nodeTextStyle: (nodeStyle: QuireNodeCanvasTextStyle | null, node: Node,
    context: WordStylesParagraphStyleContext, tableLayer: unknown) => QuireNodeCanvasTextStyle | null;
}
