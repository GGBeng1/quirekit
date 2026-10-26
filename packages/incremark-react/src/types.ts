import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { EditorState } from "@quirekit/cm-state";
import type { MarkdownOptions, MarkdownLocale, MarkdownStatus, MarkdownReadingError, MarkdownNodeInfo, MarkdownRenderOptions as CoreOptions, ReadingContext } from "@quirekit/incremark-core";

/** Props supplied to a custom semantic component; consume node before forwarding DOM props. */
export interface MarkdownComponentProps {
  /** Canonical source metadata, supplied to custom components only. */ readonly node: MarkdownNodeInfo;
  /** Projected semantic children. */ readonly children?: ReactNode;
  /** Validated tag properties such as href, src, code or language. */ readonly [attribute: string]: unknown;
}

/** Instance-local native tag/component replacements; application components are trusted code. */
export type MarkdownComponents = Readonly<Partial<Record<string, ComponentType<MarkdownComponentProps> | string>>>;

/** React semantic projection context over canonical source. */
export type MarkdownRenderContext = ReadingContext<ReactNode>;

/** Trusted product adapter; source extension authors normally use withMarkdownReading. */
export type MarkdownNodeRenderer = (context: MarkdownRenderContext, node: import("@lezer/common").SyntaxNode) => ReactNode;

/** Instance-local React rendering options over shared cache and HTML policy. */
export interface MarkdownRenderOptions extends CoreOptions<ReactNode> {
  /** Semantic element/component overrides. */ readonly components?: MarkdownComponents;
}

/** Accepted source inputs; content and state are mutually exclusive. */
export interface MarkdownSourceInput {
  /** Exact authoritative host source, including a streaming prefix. */ readonly content?: string | undefined;
  /** Advanced existing parser snapshot. */ readonly state?: EditorState | undefined;
  /** Document/message identity; replacement resets resources. */ readonly identity?: string | undefined;
  /** Pure parser configuration; replace identity to reconfigure. */ readonly options?: MarkdownOptions | undefined;
  /** Deterministic first-render strategy; semantic is the default. */ readonly ssr?: "semantic" | "source" | undefined;
}

/** Immutable cached external-store snapshot; unchanged inputs keep object identity. */
export interface MarkdownSourceSnapshot {
  /** Accepted canonical parse, or undefined for deferred/failed parsing. */ readonly state: EditorState | undefined;
  /** Whether a cooperative parse continuation remains. */ readonly pending: boolean;
  /** Document generation for resource and cache ownership. */ readonly generation: number;
  /** Isolated source failure, delivered after commit. */ readonly error: MarkdownReadingError | undefined;
}

/** React reader supporting static text, AI streaming and accepted parser states. */
export interface QuireMarkdownProps extends MarkdownSourceInput, MarkdownRenderOptions {
  /** Transport status; changing it does not reparse or finalize source. */ readonly status?: MarkdownStatus;
  /** Control language, independent of document text. */ readonly locale?: MarkdownLocale;
  /** Outer reader class. */ readonly className?: string;
  /** Outer reader style. */ readonly style?: CSSProperties;
  /** @param failure - Source-preserving local error; observers cannot break fallback. */ readonly onError?: (failure: MarkdownReadingError) => void;
}

export type { MarkdownNodeInfo, MarkdownHtmlOptions, MarkdownLocale, MarkdownStatus, MarkdownReadingError } from "@quirekit/incremark-core";
