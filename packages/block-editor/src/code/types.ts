import type { Node as PMNode } from "@quirekit/pm";
import type { QuireViewMutationRecord } from "@quirekit/core";

/** Controlled code header data; document text stays in the retained content DOM. */
export interface BlockCodeState extends BlockCodeDisplay {
  /** Canonical language, with empty meaning plain text. */
  readonly language: string;
  /** Current document permission. */
  readonly readOnly: boolean;
}

/** Persistent presentation settings independent of the source text. */
export interface BlockCodeDisplay {
  /** Whether logical source lines have numbers. */
  readonly lineNumbers: boolean;
  /** Whether long source lines wrap. */
  readonly wrap: boolean;
  /** Maximum source viewport height in pixels; null expands to the content. */
  readonly height: number | null;
  /** Explicit code palette or the surrounding document theme. */
  readonly theme: "auto" | "light" | "dark";
}

/** Source-bound presentation update; stale controls cannot overwrite newer settings. */
export interface BlockCodeDisplayChange {
  /** Current code node boundary. */
  readonly position: number;
  /** Settings observed by the requesting surface. */
  readonly expected: BlockCodeDisplay;
  /** Only the changed settings. */
  readonly patch: Partial<BlockCodeDisplay>;
}

/** Framework-neutral editable code block with a separately mounted header. */
export interface BlockCodeSurface {
  /** Stable outer node. */
  readonly dom: HTMLElement;
  /** Retained document-owned text; Vue never renders this subtree. */
  readonly contentDOM: HTMLElement;
  /** Provider-preserving header destination. */
  readonly header: HTMLElement;
  /** @returns Current header state, without serializing code text. */
  snapshot(): BlockCodeState;
  /** @returns Live source read only for clipboard requests. */
  getCode(): string;
  /** @param language - Chosen grammar. @returns Source-bound command acceptance. */
  setLanguage(language: string): boolean;
  /** @param patch - Persistent display changes. @returns Source-bound command acceptance. */
  setDisplay(patch: Partial<BlockCodeDisplay>): boolean;
  /** @param node - Current retained node. @returns Whether identity survives. */
  update(node: PMNode): boolean;
  /** Refreshes controls only when document permission changes. */
  syncEditable(): void;
  /** @param event - Native event. @returns Whether header controls own it. */
  stopEvent(event: Event): boolean;
  /** @param mutation - Native mutation. @returns Whether it belongs to header chrome. */
  ignoreMutation(mutation: QuireViewMutationRecord): boolean;
  /** Revokes callbacks and removes the mounted header. */
  destroy(): void;
}

/** Conditional language write at a live retained node position. */
export interface BlockCodeLanguageChange {
  /** Canonical node boundary. */
  readonly position: number;
  /** Language observed by the header before applying. */
  readonly expected: string;
  /** New language, with empty meaning plain text. */
  readonly language: string;
}

/** Cached source-local lexical styles; positions are rebased only when projected. */
export type CodeTokenSpans = readonly { readonly from: number; readonly to: number; readonly class: string }[];
