import type { EditorBlockMenuFactory } from "./types";

declare module "@quirekit/core" {
  /** Optional UI contribution hook on behavior extensions, outside the Core implementation. */
  interface QuireExtensionConfig<Options extends object = object, Storage extends object = object> {
    /** Declares feature-owned contextual block operations, collected once per editor. */
    readonly addBlockMenuProviders?: EditorBlockMenuFactory<Options, Storage>;
  }
  /** Optional contextual menu hook on schema nodes. */
  interface QuireNodeConfig<Options extends object = object, Storage extends object = object> {
    /** Declares contextual operations for this node or its semantic family. */
    readonly addBlockMenuProviders?: EditorBlockMenuFactory<Options, Storage>;
  }
  /** Optional contextual menu hook on schema marks. */
  interface QuireMarkConfig<Options extends object = object, Storage extends object = object> {
    /** Declares mark-related operations applicable to a captured whole block. */
    readonly addBlockMenuProviders?: EditorBlockMenuFactory<Options, Storage>;
  }
}
