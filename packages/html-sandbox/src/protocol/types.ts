/** Versioned, bounded guest or trusted-runner event envelope. */
export interface SandboxMessage {
  /** Protocol revision. */ readonly version: 1;
  /** Host-created run identifier. */ readonly runId: number;
  /** Finite event kind. */ readonly type: "ready" | "resize" | "diagnostic" | "exit" | "failed";
  /** Optional untrusted viewport height. */ readonly height?: number;
  /** Optional bounded diagnostic text. */ readonly message?: string;
  /** Stable diagnostic code. */ readonly code?: string;
  /** Display severity only. */ readonly level?: "info" | "warn" | "error";
}
