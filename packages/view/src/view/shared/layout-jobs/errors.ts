import type { QuireLayoutJobFailedResult } from "./types";

/** Stable failure codes that one job handler may deliberately report. */
export type QuireLayoutJobExecutionErrorCode = Extract<
  QuireLayoutJobFailedResult["code"],
  "capability-mismatch" | "invalid-payload"
>;

/** Explicit clone-safe job failure raised by a concrete handler. */
export class QuireLayoutJobExecutionError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: QuireLayoutJobExecutionErrorCode;

  /**
   * Creates an explicit layout job execution failure.
   *
   * @param code - Stable machine-readable failure code.
   * @param message - Human-readable diagnostic detail.
   */
  constructor(code: QuireLayoutJobExecutionErrorCode, message: string) {
    super(message);
    this.name = "QuireLayoutJobExecutionError";
    this.code = code;
  }
}
