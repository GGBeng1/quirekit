import type { ClassicEditorInstance, ClassicEditorOptions } from "../types";
import { ClassicEditorRuntime } from "./runtime";

/**
 * Creates a framework-neutral Classic Editor product instance.
 *
 * @param options - Product document, preset, feature, plugin, and mount options.
 * @returns Reusable product instance.
 */
export function createClassicEditor(
  options: ClassicEditorOptions = {}
): ClassicEditorInstance {
  return new ClassicEditorRuntime(options);
}
