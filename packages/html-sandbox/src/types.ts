/** Supported execution intent; only the trusted host may supply it. */
export type HtmlSandboxExecution = "disabled" | "manual" | "on-complete";
/** Browser transport; a hosted runner must be a separately deployed trusted asset. */
export type HtmlSandboxTransport = { readonly kind: "srcdoc" } | { readonly kind: "hosted"; readonly runnerUrl: string };
/** Trusted host policy, never extracted from HTML or Markdown. */
export interface HtmlSandboxConfig {
  /** Defaults to srcdoc. */ readonly transport?: HtmlSandboxTransport;
  /** Embedded resources only; this is not a complete network-egress guarantee. */ readonly resources?: "embedded";
  /** Defaults to manual. */ readonly execution?: HtmlSandboxExecution;
}
/** Fully validated, immutable host policy. */
export interface HtmlSandboxResolvedConfig {
  /** Selected transport. */ readonly transport: HtmlSandboxTransport;
  /** Supported resource policy. */ readonly resources: "embedded";
  /** Host execution intent. */ readonly execution: HtmlSandboxExecution;
}
/** Atomic source ownership snapshot. */
export interface HtmlSandboxSource {
  /** Exact original HTML, never rewritten by the runtime. */ readonly html: string;
  /** Syntax and upstream generation are both complete. */ readonly complete: boolean;
  /** Stable document/block identity, independent of source offsets. */ readonly identity: string;
}
/** Public runtime stage; running means the bridge is ready, not application success. */
export type HtmlSandboxPhase = "idle" | "starting" | "running" | "stopped" | "failed" | "disposed";
/** Immutable projection of the one execution state machine. */
export interface HtmlSandboxState {
  /** Current lifecycle stage. */ readonly phase: HtmlSandboxPhase;
  /** Source differs from the active snapshot. */ readonly dirty: boolean;
  /** Monotonically increasing execution generation. */ readonly runId: number;
}
/** Bounded, text-only diagnostic. Guest messages are always untrusted. */
export interface HtmlSandboxDiagnostic {
  /** Stable machine-readable code. */ readonly code: string;
  /** Plain text detail; never render as HTML. */ readonly message: string;
  /** Severity for display. */ readonly level: "info" | "warn" | "error";
  /** Whether the content came from untrusted guest code. */ readonly untrusted: boolean;
}
/** Events carry no editor commands, authorization or document mutation capability. */
export type HtmlSandboxEvent =
  | { readonly type: "state"; readonly state: HtmlSandboxState }
  | { readonly type: "diagnostic"; readonly diagnostic: HtmlSandboxDiagnostic }
  | { readonly type: "resize"; readonly height: number }
  | { readonly type: "exit" };
