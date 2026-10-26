import type { AnyExtension } from "@quirekit/msfe-core";
import type { MarkdownExtension } from "@quirekit/lezer-markdown";

/** Source configuration, fixed for the lifetime of one reading session. */
export interface MarkdownOptions {
  /** Extended Markdown defaults (notes, math, containers and inline extras); false installs only core GFM plus explicit extensions. */
  readonly preset?: "extended" | false;
  /** Source-bearing features, including validated custom Node/Mark definitions. */
  readonly extensions?: readonly AnyExtension[];
  /** Native Lezer syntax additions; use a source codec when fields also need validation. */
  readonly syntax?: readonly MarkdownExtension[];
}

/** Reading control language, independent of document text. */
export type MarkdownLocale = "zh-CN" | "en";

/** Transport metadata; no terminal status freezes parsing or discards received text. */
export type MarkdownStatus = "receiving" | "complete" | "stopped" | "error";

/** A source-preserving failure, isolated to its captured node or parsing session. */
export interface MarkdownReadingError {
  /** Installed owner or the source session. */ readonly owner: string;
  /** Failed operation. */ readonly phase: "parse" | "read" | "load" | "render" | "dispose";
  /** Inclusive UTF-16 start in the captured source. */ readonly from: number;
  /** Exclusive UTF-16 end in the captured source. */ readonly to: number;
  /** Original error for host diagnostics. */ readonly cause: unknown;
}
