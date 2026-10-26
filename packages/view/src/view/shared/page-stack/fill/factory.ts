import type {
  QuirePageStackFillController,
  QuirePageStackFillControllerOptions
} from "./types";
import { MountedPageStackFillController } from "./controller";

/**
 * Creates the canonical mounted page-stack fill lifecycle controller.
 *
 * @param options - Backend scheduling and chunk execution strategy.
 * @returns Shared fill controller consumed by a mounted view.
 */
export function createQuirePageStackFillController(
  options: QuirePageStackFillControllerOptions
): QuirePageStackFillController {
  return new MountedPageStackFillController(options);
}
