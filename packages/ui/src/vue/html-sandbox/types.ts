import type { HtmlSandboxConfig, HtmlSandboxDiagnostic, HtmlSandboxState } from "@quirekit/html-sandbox";
/** Height belongs to presentation and never grants guest capabilities. */
export type QuireKitHtmlSandboxHeight = number | { readonly min?: number; readonly max?: number; readonly initial?: number };
/** Framework adapter for the independent HTML execution controller. */
export interface QuireKitHtmlSandboxProps {
  /** Exact HTML source; no document writeback occurs. */ readonly html: string;
  /** True only after both syntax and upstream generation are complete. Defaults to true. */ readonly complete?: boolean | undefined;
  /** Stable document/block identity; defaults to this component mount. */ readonly identity?: string | undefined;
  /** Trusted host policy; defaults to manual execution with embedded resources. */ readonly config?: HtmlSandboxConfig | undefined;
  /** Accessible frame and section name. */ readonly title?: string | undefined;
  /** Fixed CSS pixel height or bounded automatic height. Defaults to 320. */ readonly height?: QuireKitHtmlSandboxHeight | undefined;
  /** Require an explicit enter action before guest interaction, for editor selection. Defaults to false. */ readonly interactionGated?: boolean | undefined;
}
/** Public imperative operations delegate to the one controller. */
export interface QuireKitHtmlSandboxExpose {
  /** Run the current complete snapshot. @returns Whether the runtime admitted it. */ run(): Promise<boolean>;
  /** Stop the current or pending execution. */ stop(): void;
}
/** Neutral event callback owned by the framework adapter. */
export interface HtmlSandboxComponentEvents {
  /** @param state - Current immutable runtime projection. */ state(state: HtmlSandboxState): void;
  /** @param diagnostic - Plain-text diagnostic. */ diagnostic(diagnostic: HtmlSandboxDiagnostic): void;
  /** @param height - Applied CSS-pixel geometry. */ resize(height: number): void;
  /** Return focus to the trusted outer controls. */ exit(): void;
}
