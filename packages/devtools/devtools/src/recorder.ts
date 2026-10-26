import { QuireDevtoolsMemoryRecorder } from "./recorder/memory";
import type {
  QuireDevtoolsOptions,
  QuireDevtoolsRecorder
} from "./types";

/**
 * Creates a headless QuireKit devtools recorder.
 *
 * @param options - Recorder options.
 * @returns Recorder instance.
 */
export function createQuireDevtoolsRecorder(
  options: QuireDevtoolsOptions = {}
): QuireDevtoolsRecorder {
  return new QuireDevtoolsMemoryRecorder(options);
}
