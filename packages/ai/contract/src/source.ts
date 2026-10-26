import type { QuireAiJsonSchema } from "./types";

/** Range of a source document, in UTF-16 offsets of its LF text. */
export interface QuireAiSourceRange {
  /** Start offset. */
  readonly from: number;
  /** End offset; equal to `from` for a point. */
  readonly to: number;
}

/** Engine-neutral kind of a source block, as the core lists and edits it. */
export type QuireAiSourceBlockKind =
  | "heading" | "paragraph" | "list-item" | "quote" | "code" | "table" | "math" | "html"
  | "front-matter" | "footnote" | "definition" | "thematic-break" | "other";

/** What a source block fact shows in place of a block's source. */
export interface QuireAiSourceBlockPresentation {
  /** One-line summary shown instead of the source, such as "流程图：报销审批（9 个节点）". */
  readonly label: string;
  /** Name of the described command that changes the block, named when a whole-block replace is refused. */
  readonly command?: string | undefined;
  /** Short name for people reviewing a change, such as "流程图“报销审批”"; the model never sees it. */
  readonly title?: string | undefined;
}

/** A source block as a fact sees it. */
export interface QuireAiSourceBlockInput {
  /** Block source. */
  readonly text: string;
  /** Syntax or semantic name. */
  readonly name: string;
  /** Read-only attributes, such as a code block's language. */
  readonly attrs: Readonly<Record<string, string | number | boolean>>;
}

/** A kind of figure the model may write as fenced code, listed in the core's figure catalog. */
export interface QuireAiSourceAuthoring {
  /** Fence language, such as `mermaid`. */
  readonly fence: string;
  /** What the figure draws and when it suits, in one line. */
  readonly description: string;
}

/** Checks blocks of some fence languages before they are written, such as by rendering them. */
export interface QuireAiSourceBlockCheck {
  /** Fence languages this check covers. */
  readonly languages: readonly string[];
  /**
   * @param block - Block about to be written.
   * @param ports - Host resources, such as a renderer.
   * @returns Why it cannot be written, such as a syntax error with its line, or undefined when it is fine.
   */
  readonly run: (block: QuireAiSourceBlockInput, ports: Readonly<Record<string, unknown>>) => Promise<string | undefined>;
}

/** Describes source blocks: a summary in place of data, figures to write as code, and checks before writing. */
export interface QuireAiSourceBlockCapability {
  /** Fact discriminator. */
  readonly kind: "source-block";
  /** Syntax or semantic names of the blocks this fact describes. */
  readonly names: readonly string[];
  /**
   * @param block - The block's source and attributes.
   * @returns Summary to show, or undefined to list the source as it is.
   */
  readonly present?: ((block: QuireAiSourceBlockInput) => QuireAiSourceBlockPresentation | undefined) | undefined;
  /** Figures of this kind the model may write as fenced code. */
  readonly authoring?: readonly QuireAiSourceAuthoring[] | undefined;
  /** Check run on written blocks before they enter the document. */
  readonly check?: QuireAiSourceBlockCheck | undefined;
}

/** One message of an annotation thread. */
export interface QuireAiAnnotationMessage {
  /** Author's display name. */
  readonly author: string;
  /** Whether the author is an AI agent. */
  readonly agent: boolean;
  /** ISO 8601 creation time. */
  readonly createdAt: string;
  /** Message body as inline Markdown. */
  readonly body: string;
}

/** An annotation attached to a source range, such as a comment thread kept outside the source. */
export interface QuireAiAnnotation {
  /** Feature-owned identity, passed back to described commands; never shown to the model. */
  readonly id: string;
  /** Current source range, or null when the annotated text can no longer be found. */
  readonly range: QuireAiSourceRange | null;
  /** Text the annotation was made on. */
  readonly quote: string;
  /** Whether the thread is open, resolved, or lost its text. */
  readonly status: "open" | "resolved" | "detached";
  /** Messages in order. */
  readonly messages: readonly QuireAiAnnotationMessage[];
}

/** Declares annotations attached to source ranges, which the core lists after the body. */
export interface QuireAiAnnotationCapability {
  /** Fact discriminator. */
  readonly kind: "annotation";
  /** Section title in the view, such as "批注". */
  readonly label: string;
  /** @returns Current annotations in document order. */
  readonly read: () => readonly QuireAiAnnotation[];
}

/** Any fact a source editor extension contributes to the AI core. */
export type QuireAiSourceCapability = QuireAiSourceBlockCapability | QuireAiAnnotationCapability;

/** What a described source command acts on. */
export type QuireAiSourceCommandTarget = "document" | "block" | "text" | "annotation";

/** Document facts handed to a described source command's adapter. */
export interface QuireAiSourceCommandContext {
  /** Current document text. */
  readonly text: string;
  /** Range of the target block, or null for document and annotation targets. */
  readonly block: QuireAiSourceRange | null;
  /** Where content inserted after the target block goes: after the block and after what earlier operations of the call put there. */
  readonly after: number | null;
  /** Range the command acts on: the selected text, the block, or the annotation; null for the document. */
  readonly range: QuireAiSourceRange | null;
  /** Text of `range`, or null. */
  readonly selected: string | null;
  /** Identity the AI writes as, or null when the host gives none. */
  readonly author: { readonly id: string; readonly name: string } | null;
  /** Feature identity of the target annotation, or null. */
  readonly annotation: string | null;
  /** Result of `prepare`, when the command declares one. */
  readonly prepared: unknown;
}

/** Agent description of a source editor command, shaped like the rich-text descriptor. */
export interface QuireAiSourceCommandDescriptor {
  /** One-line description of what the command does. */
  readonly description: string;
  /** JSON Schema of the Agent parameters. */
  readonly params?: QuireAiJsonSchema | undefined;
  /** Target; default `document`. */
  readonly target?: QuireAiSourceCommandTarget | undefined;
  /** Block kinds a block or text target must be. */
  readonly kinds?: readonly QuireAiSourceBlockKind[] | undefined;
  /** Parameter names counted from 1 by the Agent and from 0 by the command. */
  readonly ordinals?: readonly string[] | undefined;
  /** Side-effect class; `read` commands are not offered for editing. */
  readonly risk?: "read" | "write" | "policy" | undefined;
  /** Whether the command must be the only operation of its transaction. */
  readonly standalone?: boolean | undefined;
  /** Catalog group. */
  readonly category?: string | undefined;
  /**
   * @param params - Agent parameters.
   * @param context - Current document facts.
   * @returns Command options, or null when nothing in the document matches.
   */
  readonly adapt?: ((params: unknown, context: QuireAiSourceCommandContext) => unknown) | undefined;
  /**
   * @param params - Agent parameters.
   * @param ports - Host resources.
   * @returns Prepared value handed to `adapt`.
   */
  readonly prepare?: ((params: unknown, ports: Readonly<Record<string, unknown>>) => Promise<unknown>) | undefined;
  /**
   * @param params - Agent parameters.
   * @param context - Current document facts.
   * @returns Whether the requested state is already in place.
   */
  readonly satisfied?: ((params: unknown, context: QuireAiSourceCommandContext) => boolean) | undefined;
}
