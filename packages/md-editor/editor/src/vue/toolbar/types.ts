import type { MsfeEditor, SourceAnchor } from "@quirekit/msfe-core";
import type { MdMentionSource } from "../../commands/types";
import type { MdEditorLocale } from "../types";
import type { EditorState } from "@quirekit/cm-state";
import type { MdBlockInsertionRequest } from "../blocks/insertion/types";

/** Product-owned data passed through the public Toolbar unchanged. */
export interface MdToolbarContext {
  /** Current mounted source owner. */ readonly editor: MsfeEditor;
  /** Accepted state dependency for open menu projections. */ readonly state: EditorState;
  /** Current control language. */ readonly locale: MdEditorLocale;
  /** Host contact source, absent when mention authoring is unavailable. */ readonly mentions: MdMentionSource | undefined;
  /** Anchor captured before a field or menu receives focus. */ readonly anchor: SourceAnchor | undefined;
  /** @param request - Explicit adjacent destination with a deferred parameter task. */
  insert(request: MdBlockInsertionRequest): void;
}
