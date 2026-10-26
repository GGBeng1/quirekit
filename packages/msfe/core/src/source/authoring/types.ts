import type { MsfeNodeViewRenderer, MsfeNodeViewResource } from "../../views/types";
import type { MarkdownReferenceResult } from "../../markdown/types";

/** Logical source coordinates use UTF-16 offsets, with end positions exclusive. */
export interface SourceEdit {
  /** Inclusive start. */
  readonly from: number;
  /** Exclusive end; omission means insertion. */
  readonly to?: number;
  /** Exact replacement; omission means deletion. */
  readonly insert?: string;
}

/** A bounded line of canonical Markdown. */
export interface SourceLine {
  /** One-based line number. */
  readonly number: number;
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end, without line break. */
  readonly to: number;
  /** Exact line source. */
  readonly text: string;
}

/** Text-only access also safe during a state reducer, before the resulting parser state exists. */
export interface SourceText {
  /** Total logical UTF-16 length. */
  readonly length: number;
  /** @param from - Inclusive offset. @param to - Exclusive offset. @returns Exact bounded source. */
  slice(from: number, to: number): string;
  /** @param position - Logical source offset. @returns Containing line. */
  lineAt(position: number): SourceLine;
}

/** Read-only accepted document access independent of the parser and view implementation. */
export interface SourceDocument extends SourceText {
  /** @param label - Raw Markdown reference label without brackets. @returns Shared reference semantics, including explicit partial-parser status. */
  resolveReference(label: string): MarkdownReferenceResult;
}

/** Lazy parser-neutral syntax access; no duplicated persistent AST is allocated. */
export interface SourceNode {
  /** Confirmed syntax kind selected by the configured source adapter. */
  readonly kind: string;
  /** Immediate syntax owner, distinguishing standalone tokens from destination fields. */
  readonly parentKind: string | null;
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end. */
  readonly to: number;
  /** @returns Lazy confirmed parent syntax, without allocating a second AST. */
  parent(): SourceNode | null;
  /** @param kind - Child syntax kind. @returns First matching direct child. */
  child(kind: string): SourceNode | null;
  /** @param kind - Optional syntax kind; omission traverses all direct children in source order. @returns Matching direct children. */
  children(kind?: string): readonly SourceNode[];
}

/** Simple, non-nesting inline syntax. Complex grammars use the explicit backend hook. */
export interface InlineSyntax {
  /** Public syntax name, unique within the installed grammar. */
  readonly name: string;
  /** Literal opening delimiter. */
  readonly open: string;
  /** Literal closing delimiter. */
  readonly close: string;
}

/** Persisted semantic attribute contract; the source codec remains responsible for exact encoding. */
export interface Attribute {
  /** Default used only when a decoded source field is absent. */
  readonly default?: unknown;
  /** @param value - Decoded or requested value. @returns Whether the value belongs to this attribute. */
  readonly validate?: (value: unknown) => boolean;
}

/** Named persisted fields admitted by addAttributes. Unknown patches are rejected. */
export type Attributes = Readonly<Record<string, Attribute>>;

/** Parser-neutral semantic codec; rendering is optional and never owns persistence. */
export interface SourceDefinition<Attrs extends object, Resource = unknown> {
  /** Confirmed syntax kinds, or the inline syntax name when syntax is specified. */
  readonly nodes: readonly string[];
  /** Optional simple syntax contributed by this feature. */
  readonly syntax?: InlineSyntax;
  /** Single-line replacement or a non-editable control before source-owned content. */
  readonly placement?: "replace" | "before";
  /** Whether the control stays visible while source is selected. */
  readonly showWhenActive?: boolean;
  /** Preserve a settled replacement's measured height offscreen, including error fallback; ordinary inline controls leave this disabled. */
  readonly measureHeight?: boolean;
  /** @param document - Canonical source. @param node - Confirmed syntax. @returns Source-derived semantic fields or fallback. */
  readonly read: (document: SourceDocument, node: SourceNode) => Attrs | null;
  /** Optional bounded fingerprint; must cover all patchable fields. */
  readonly source?: (document: SourceDocument, node: SourceNode) => string;
  /** @param document - Canonical source. @param node - Current syntax. @param patch - Semantic fields. @returns Exact source edits or refusal. */
  readonly patch: (document: SourceDocument, node: SourceNode, patch: Partial<Attrs>) => SourceEdit | readonly SourceEdit[] | null;
  /** Optional abortable resource loader shared by all renderers. */
  readonly load?: (attrs: Readonly<Attrs>, signal: AbortSignal) => MsfeNodeViewResource<Resource> | Promise<MsfeNodeViewResource<Resource>>;
  /** Native renderer, optional when addNodeView supplies a component renderer. */
  readonly renderer?: MsfeNodeViewRenderer;
}

/** Heterogeneous installation boundary; defineSource retains author-side attribute/resource typing. */
export type SourceSpec = SourceDefinition<object>;
