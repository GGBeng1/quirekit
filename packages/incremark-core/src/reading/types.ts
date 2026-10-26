import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { PreviewProps } from "@quirekit/msfe-markdown-extras";
import type { MarkdownLocale, MarkdownReadingError } from "../types";
import type { MarkdownReadingPort, ReadingContribution, ReadingInput } from "../contributions/types";

/** Source metadata supplied to registered framework components. */
export interface MarkdownNodeInfo {
  /** Canonical Lezer syntax name. */ readonly type: string;
  /** Inclusive UTF-16 offset. */ readonly from: number;
  /** Exclusive UTF-16 offset. */ readonly to: number;
}

/** Additional restrictions over the fixed HTML sanitizer; executable tags cannot be enabled. */
export interface MarkdownHtmlOptions {
  /** Opt into a resource-free CSS subset; style tags remain forbidden. */ readonly styles?: "safe";
  /** Optional subset of sanitized tags; excluded wrappers are unwrapped. */ readonly allowedElements?: readonly string[];
  /** @param url - Sanitized destination. @returns Whether the host permits this link. */ readonly allowLink?: (url: string) => boolean;
  /** @param url - Sanitized image destination. @returns Whether the host permits loading it. */ readonly allowImage?: (url: string) => boolean;
}

/** Trusted adapter for additional product nodes after source contributions. */
export type MarkdownNodeRenderer<Output> = (context: ReadingContext<Output>, node: SyntaxNode) => Output | undefined;

/** Instance-local presentation configuration; it does not alter parsing. */
export interface MarkdownRenderOptions<Output> {
  /** Disable reuse for diagnostics; parsing remains incremental. */ readonly cache?: boolean;
  /** Framework-owned semantic tag replacements, observed by identity. */ readonly components?: Readonly<Partial<Record<string, unknown>>>;
  /** Explicit safe HTML opt-in; omitted preserves source. */ readonly html?: boolean | MarkdownHtmlOptions;
  /** Trusted product adapter. */ readonly renderNode?: MarkdownNodeRenderer<Output>;
  /** @param state - Accepted snapshot. @returns Identity covering external adapter reads; omit to conservatively reproject. */ readonly renderNodeKey?: (state: EditorState) => unknown;
}

/** Confirmed source inputs for a framework-owned preview. */
export type MarkdownPreview = Pick<PreviewProps, "kind" | "text" | "source" | "language">;

/** Confirmed container presentation, independent of a UI library. */
export interface MarkdownContainer {
  /** Grammar-provided kind. */ readonly kind: string;
  /** Plain source title. */ readonly title: string;
  /** Semantic tone. */ readonly tone: "neutral" | "info" | "success" | "warning" | "danger";
  /** Whether presentation uses a disclosure control. */ readonly collapsible: boolean;
  /** Initial disclosure state. */ readonly open: boolean;
}

/** Framework-specific output factory; all source interpretation remains in core. */
export interface MarkdownAdapter<Output> {
  /** Isolated contribution registry port. */ readonly reading: MarkdownReadingPort<Output>;
  /** @param value - Literal decoded text. @returns Escaped framework output. */ text(value: string): Output;
  /** @param children - Ordered projected children. @returns Combined output without an extra DOM element. */ fragment(children: readonly Output[]): Output;
  /** @param components - Local replacements. @param node - Canonical owner. @param tag - Semantic tag. @param attributes - Sanitized properties. @param children - Projected content. @param locale - Control language. @returns Framework element or registered component. */
  element(components: MarkdownRenderOptions<Output>["components"], node: SyntaxNode, tag: string, attributes?: Record<string, unknown>, children?: Output, locale?: MarkdownLocale): Output;
  /** @param source - Exact unresolved source. @param block - Whether the unparsed document suffix needs a block wrapper. @returns Escaped pre-wrapped source. */ fallback(source: string, block?: boolean): Output;
  /** @param node - Source owner. @param code - Confirmed body. @param language - Source language. @param locale - Control language. @returns Metadata/source presentation. */ source(node: SyntaxNode, code: string, language: string, locale?: MarkdownLocale): Output;
  /** @param node - Source owner. @param attributes - Confirmed container properties. @param children - Projected blocks. @returns Container presentation. */ container(node: SyntaxNode, attributes: MarkdownContainer, children: Output): Output;
  /** @param node - Source owner. @param checked - Confirmed status. @param label - Localized accessible label. @returns Read-only task control. */ task(node: SyntaxNode, checked: boolean, label: string): Output;
  /** @param node - Source owner. @param inputs - Confirmed preview data. @returns A framework-owned resource boundary. */ preview(node: SyntaxNode, inputs: MarkdownPreview): Output;
  /** @param input - Validated immutable source and presentation. @returns A framework-owned contribution boundary. */ contribution(input: ReadingInput<Output>): Output;
  /** @param node - Top-level source owner. @param output - Accepted projection. @returns A stable parent-update boundary. */ block(node: SyntaxNode, output: Output): Output;
}

/** Optional instrumentation and retention boundary for one projection. */
export interface ReadingProjection<Output> {
  /** @param context - Accepted source. @param node - Direct Document child. @param project - Ordinary projection. @returns Reused or newly projected output. */ block(context: ReadingContext<Output>, node: SyntaxNode, project: () => Output): Output;
  /** Records an actual node dispatch, including deferred helpers. */ projected(): void;
}

/** Disposable projection context; the immutable source remains authoritative. */
export interface ReadingContext<Output> {
  /** Instance-local rendering policy. */ readonly options: MarkdownRenderOptions<Output>;
  /** Output factory with no semantic authority. */ readonly adapter: MarkdownAdapter<Output>;
  /** @param node - Source owner. @param tag - Semantic tag. @param attributes - Validated properties. @param children - Projected content. @returns Framework presentation. */ element(node: SyntaxNode, tag: string, attributes?: Record<string, unknown>, children?: Output): Output;
  /** Reading-instance navigation namespace. */ readonly prefix: string;
  /** Accepted source and parse. */ readonly state: EditorState;
  /** Control language. */ readonly locale: MarkdownLocale;
  /** Snapshot-local candidates for this output family. */ readonly contributions: ReadonlyMap<string, readonly ReadingContribution<Output>[]>;
  /** @param failure - Isolated consumer failure. */ report(failure: MarkdownReadingError): void;
  /** @param node - Confirmed node. @returns Safe framework content, never evaluated source HTML. */ render(node: SyntaxNode): Output;
}
