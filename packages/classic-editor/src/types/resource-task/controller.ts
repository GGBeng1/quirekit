import type {
  ClassicEditorHostResourceTaskInput,
  ClassicEditorHostResourceTaskResult
} from "./types";

/** Instance authority for concurrent end-to-end Host resource workflows. */
export interface ClassicEditorHostResourceTaskController {
  /**
   * Starts one resource workflow and retains its private input for explicit retry.
   *
   * @param input - Complete typed workflow input.
   * @returns Result of the initial attempt.
   */
  startResource(
    input: ClassicEditorHostResourceTaskInput
  ): Promise<ClassicEditorHostResourceTaskResult>;
  /**
   * Requests cancellation of one active task outside its commit section.
   *
   * @param taskId - Instance-local task identity.
   * @returns Whether cancellation was accepted.
   */
  cancel(taskId: string): boolean;
  /**
   * Requests a fresh generation for one retryable failed task.
   *
   * @param taskId - Instance-local task identity.
   * @returns Whether retry was accepted.
   */
  retry(taskId: string): boolean;
  /** Aborts active attempts and releases retained private workflow inputs. */
  destroy(): void;
}
