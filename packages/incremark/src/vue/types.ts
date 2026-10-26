import type { Component, VNodeChild } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { MarkdownLocale, MarkdownOptions, MarkdownStatus } from "../types";
import type { ReadingContext } from "./rendering/types";

/** Instance-local semantic tag replacements; application components are trusted code. */
export type MarkdownComponents = Readonly<Partial<Record<string, Component | string>>>;

export type { MarkdownNodeInfo, MarkdownHtmlOptions } from "@quirekit/incremark-core";
import type { MarkdownHtmlOptions } from "@quirekit/incremark-core";

/** Read-only adapter for additional product nodes, after validated source contributions. */
export type MarkdownNodeRenderer = (context: ReadingContext, node: SyntaxNode) => VNodeChild | undefined;

/** Rendering configuration does not alter source parsing. */
export interface MarkdownRenderOptions {
  /** Disable block reuse for diagnostics; parsing remains incremental. Defaults to true in MarkdownRenderer. */ readonly cache?: boolean;
  /** Local overrides layered over native reading defaults. */ readonly components?: MarkdownComponents;
  /** Explicit safe HTML opt-in; default false preserves source. */ readonly html?: boolean | MarkdownHtmlOptions;
  /** Trusted product adapter; custom source authors normally use withMarkdownReading. */ readonly renderNode?: MarkdownNodeRenderer;
  /** @param state - Current snapshot. @returns Identity covering adapter reads outside each unchanged block, including external state; omit to conservatively reproject. */
  readonly renderNodeKey?: (state: EditorState) => unknown;
}

/** Reactive source inputs; optional Vue props may resolve to undefined. */
export interface MarkdownSourceInput {
  /** Existing snapshot, mutually exclusive with content. */ readonly state?: EditorState | undefined;
  /** Exact authoritative host source. */ readonly content?: string | undefined;
  /** Replacing identity releases the old session and resources. */ readonly identity?: string | undefined;
  /** Immutable configuration identity observed by the source host. */ readonly options?: object | undefined;
  /** Initial render strategy; semantic finishes parsing, source defers it until mount. */ readonly ssr?: "semantic" | "source" | undefined;
}

/** Vue reader supporting ordinary static text, streamed text and existing parser snapshots. */
export interface QuireMarkdownProps extends MarkdownRenderOptions {
  /** Full Markdown string, including the received prefix while streaming. */ readonly content?: string;
  /** Advanced accepted source snapshot; mutually exclusive with content. */ readonly state?: EditorState;
  /** Document/message identity, independent of its source. */ readonly identity?: string;
  /** Transport status only; completing or stopping keeps all source. */ readonly status?: MarkdownStatus;
  /** Fixed source extensions for this session; replace the object to reconfigure. */ readonly options?: MarkdownOptions;
  /** Copy, task and disclosure control language. */ readonly locale?: MarkdownLocale;
  /** Semantic SSR by default; source is an explicit deferred-parse option. */ readonly ssr?: "semantic" | "source";
}
