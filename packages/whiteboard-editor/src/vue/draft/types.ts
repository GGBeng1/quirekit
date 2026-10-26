import type { ShallowRef } from "vue";
import type { WhiteboardEditor } from "@quirekit/whiteboard-excalidraw";
import type { WhiteboardDraftState } from "../../draft/types";

/** Minimal reactive dependencies of the recovery UI. */
export interface DraftWorkspaceOptions {
  /** Current isolated drawing runtime. */ readonly runtime: ShallowRef<WhiteboardEditor | undefined>;
  /** @returns Current host permission, independent of the recovery overlay. */ readonly readOnly: () => boolean;
  /** Signals restored source as an unsaved change, never a document commit. */ readonly changed: () => void;
}
/** Small recovery panel inputs. */
export interface DraftPanelProps {
  /** Storage state for this one captured document. */ readonly state?: WhiteboardDraftState | undefined;
  /** Host permission or active storage/import operation. */ readonly disabled: boolean;
  /** Current explicit action error. */ readonly error: unknown;
}
