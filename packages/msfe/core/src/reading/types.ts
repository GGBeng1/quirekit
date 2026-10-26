import type { AnyExtension } from "../authoring/types";

/** Headless, source-owned reading configuration; editor lifecycle hooks are not mounted. */
export interface MsfeReadStateOptions {
  /** Logical Markdown source; CodeMirror normalizes line separators. */ readonly markdown?: string;
  /** Pure configuration shared with the editor, including grammar and reading contributions. */ readonly extensions?: readonly AnyExtension[];
}
