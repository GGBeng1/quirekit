/** HTML affects presentation only; there is no script execution mode. */
export type HtmlRendering = "source" | "safe";

/** Host configuration for the optional HTML extension. */
export interface HtmlOptions {
  /** Initial preference, default source. Source editor mode always shows source. */
  readonly rendering: HtmlRendering;
  /** Optional additional restriction on already-sanitized HTTP(S), relative or mailto links. */
  readonly allowLink?: (url: string) => boolean;
  /** Explicit permission for already-sanitized HTTP(S) or relative images; default denies loading. */
  readonly allowImage?: (url: string) => boolean;
}

/** Instance-owned preference, retained across document replacement. */
export interface HtmlStorage {
  /** Last accepted host preference, including input-deferred requests. */
  rendering: HtmlRendering;
}

/** Deterministic mounted work; no timings or document contents are collected. */
export interface HtmlWork {
  /** Viewport decoration builds. */
  projects: number;
  /** Bounded HTML parser calls. */
  parses: number;
  /** Actual DOMPurify calls, including entity decoding. */
  sanitizations: number;
  /** Cached candidate reuse, including position-only remapping. */
  cacheHits: number;
  /** Unsupported candidate roots retained as source. */
  fallbacks: number;
}
