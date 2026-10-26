import type { EditorView } from "@quirekit/cm-view";
import type { TextDiagramLanguage } from "@quirekit/text-diagram";

/** Controlled source state, independent of the host document editor. */
export interface DiagramSourceValue {
  /** Exact source authority; unchanged drafts are never normalized on mount. */ source: string;
  /** Active diagram grammar and history slot. */ language: TextDiagramLanguage;
  /** Accessible source control name. */ label: string;
  /** Optional Field control identity. */ id?: string | undefined;
  /** Optional Field description and keyboard help. */ describedBy?: string | undefined;
  /** Field validation state after an oversized edit. */ invalid?: boolean | undefined;
  /** Interface language for the built-in search panel. */ locale?: string | undefined;
  /** Prevent editing while saving or exporting. */ disabled: boolean;
}

/** Mount-time callbacks and the explicit DOM owner. */
export interface DiagramSourceOptions {
  /** Container whose ownerDocument also owns the CodeMirror instance. */ parent: HTMLElement;
  /** Initial controlled source. */ value: DiagramSourceValue;
  /** Receives one notification per accepted local document change. */ onChange: (source: string) => void;
  /** Reports rejection of an oversized edit and clears on accepted edits. */ onLimit: (exceeded: boolean) => void;
}

/** Component-owned controller; not part of the published package surface. */
export interface DiagramSourceEditor {
  /** Stable CodeMirror view for this workspace lifetime. */ readonly view: EditorView;
  /** Synchronizes real prop changes without echoing controlled updates. */ sync: (value: DiagramSourceValue) => void;
  /** Opens the localized search and replace panel. */ search: () => void;
  /** Reserves source-local Escape before a containing dialog dismisses. */ handleEscape: (event: KeyboardEvent) => void;
  /** Idempotently releases the view and per-language history. */ destroy: () => void;
}

/** Copyable lexical state, used only for coloring and bracket indentation. */
export interface DiagramTokenState {
  /** Closing marker for an open multiline comment. */ commentEnd: string | null;
  /** Quotation marker for an open string. */ quote: string | null;
  /** Indentation columns for open bracket blocks. */ indents: number[];
}
