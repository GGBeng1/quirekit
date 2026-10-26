import { compileExtensions } from "../extensions/compile";
import { acquireSource } from "../source-provider/acquire";
import { SourceRuntime } from "../source-provider/runtime";
import { mountEditor } from "./mount";
import type { MsfeEditor, MsfeEditorOptions } from "./types";

/**
 * Validates and acquires the source before mounting, rolling back every partial installation on failure.
 * @param options - Editor mount and extension configuration.
 * @returns Independent disposable editor.
 */
export function createMsfeEditor(options: MsfeEditorOptions): MsfeEditor {
  let editor: MsfeEditor;
  const compiled = compileExtensions(options.extensions ?? [], () => editor);
  const runtime = new SourceRuntime(acquireSource(compiled, options));
  const cleanup: (() => void)[] = [() => runtime.destroy()];
  try { return mountEditor(options, compiled, runtime, dispose => cleanup.push(dispose), value => { editor = value; }); }
  catch (error) {
    for (const dispose of cleanup.reverse()) try { dispose(); } catch { /* Preserve the installation failure. */ }
    throw error;
  }
}
