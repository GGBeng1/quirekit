import type { QuireViewOptions } from "../types";
import { QuireView } from "./canvas-view";

/**
 * Creates a canvas view facade.
 *
 * @param options - Canvas view creation options.
 * @returns A new canvas view facade.
 */
export function createQuireView(options: QuireViewOptions): QuireView {
  return new QuireView(options);
}
