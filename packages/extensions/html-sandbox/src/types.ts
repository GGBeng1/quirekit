import type { HtmlSandboxDocument } from "@quirekit/html-sandbox";
/** Disposable shell supplied by a framework adapter. */
export interface HtmlSandboxViewHandle {
  /** @param document - New source-backed node data. */ update(document: HtmlSandboxDocument): void;
  /** Releases the public component and its runtime. */ destroy(): void;
}
/** Generic node behavior; the document can never provide this mount callback. */
export interface HtmlSandboxOptions {
  /** @param container - Retained host container. @param document - Validated node data. @returns Disposable component shell. */
  readonly mount: ((container: HTMLElement, document: HtmlSandboxDocument) => HtmlSandboxViewHandle) | null;
}
/** Canonical insertion request. */
export interface HtmlSandboxInsertion {
  /** Portable source object. */ readonly document: HtmlSandboxDocument;
  /** Optional explicit range start. */ readonly from?: number;
  /** Optional explicit range end. */ readonly to?: number;
}
/** Conflict-aware source replacement. */
export interface HtmlSandboxUpdate {
  /** Exact current node position. */ readonly position: number;
  /** Expected previous HTML; a concurrent source change rejects the edit. */ readonly expectedHtml: string;
  /** Complete replacement data. */ readonly document: HtmlSandboxDocument;
}
