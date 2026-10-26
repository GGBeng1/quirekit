import type { ReactNode } from "react";
import type { MarkdownLocale, MarkdownPreview, MarkdownRenderFrame, ReadingInput } from "@quirekit/incremark-core";

/** Framework-owned preview inputs; they never carry an editor mutation target. */
export interface PreviewComponentProps {
  /** Confirmed preview source and renderer family. */ readonly inputs: MarkdownPreview;
}

/** Static source presentation and client-only copy control. */
export interface SourceProps {
  /** Literal code body. */ readonly code: string;
  /** Plain source language. */ readonly language: string;
  /** Control language. */ readonly locale?: MarkdownLocale | undefined;
}

/** React render attempt and commit-only error queue. */
export interface ReadingFrame {
  /** Core's speculative cache frame. */ readonly projection: MarkdownRenderFrame<ReactNode> | undefined;
  /** Escaped/framework output. */ readonly output: ReactNode;
}

/** Immutable validated input passed into React's local resource boundary. */
export interface ReadingBoundaryProps {
  /** Canonical source and output-family presentation. */ readonly input: ReadingInput<ReactNode>;
}

/** Input-scoped descendant error state, reset when the accepted node changes. */
export interface BoundaryState {
  /** Source snapshot owning this error state. */ readonly input: ReadingInput<ReactNode>;
  /** Whether a descendant failed. */ readonly failed: boolean;
}

/** A resource result belongs to precisely one immutable contribution input. */
export interface ResourceState {
  /** Source snapshot owning this lease. */ readonly input: ReadingInput<ReactNode>;
  /** Whether the loader has supplied an accepted resource. */ readonly ready: boolean;
  /** Owned value, never an unaccepted late result. */ readonly value: unknown;
  /** Whether this input's loader or render callback failed. */ readonly failed: boolean;
}
