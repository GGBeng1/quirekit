import { EditorState } from "@quirekit/cm-state";
import { compileExtensions } from "../extensions/compile";
import { createMarkdownLanguage } from "../markdown/parsing/language";
import { compositionField, revisionField } from "../state/fields";
import type { MsfeReadStateOptions } from "./types";

/**
 * Creates the canonical parser without allocating an EditorView or mounting editor hooks.
 * @param options - Source and pure extension configuration; mounted editor access is unavailable.
 * @returns A read-only snapshot whose parser can advance through CM's public parsing APIs.
 */
export function createMsfeReadState(options: MsfeReadStateOptions = {}): EditorState {
  const compiled = compileExtensions(options.extensions ?? []);
  if (compiled.sourceProvider) throw new Error("reading-source-provider: content already owns this document");
  return EditorState.create({ doc: options.markdown ?? "", extensions: [
    EditorState.readOnly.of(true), compositionField, revisionField,
    createMarkdownLanguage(compiled.syntax), compiled.extensions,
  ] });
}
