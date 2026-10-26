import type { WhiteboardPreviewUpload } from "../types";
import type { QuireKitTheme } from "@quirekit/ui";
import type { WhiteboardDocument, WhiteboardEditRequest } from "@quirekit/whiteboard";
import type { WhiteboardEditor, WhiteboardSnapshot } from "@quirekit/whiteboard-excalidraw";
import type { WhiteboardDraftOptions } from "../draft/types";
/** Reusable workspace inputs. */
export interface WhiteboardEditorProps {
  /** New reference explicitly opens a new document. */ readonly document: WhiteboardDocument;
  /** Stable host document identity captured for this workspace; omission disables local recovery. */ readonly drafts?: WhiteboardDraftOptions | undefined;
  /** Unified controls and scene chrome. */ readonly theme?: QuireKitTheme | undefined;
  /** Current permission. */ readonly readOnly?: boolean | undefined;
  /** Dialog owns the title when embedded. */ readonly embedded?: boolean | undefined;
}
/** Workspace public ref. */
export interface WhiteboardEditorHandle {
  /** @returns Source and PNG from a single frozen draft. */ snapshot(): Promise<WhiteboardSnapshot>;
  /** @returns Whether the owned checkpoint was cleared after a successful host save or explicit discard. */ clearDraft(): Promise<boolean>;
  /** Returns input to the canvas. */ focus(): void;
}
/** Component lifecycle notifications. */
export interface WhiteboardEditorEmits {
  /** Runtime ready after lazy loading. */ ready: [editor: WhiteboardEditor];
  /** Source invalidation, without whole-document serialization. */ change: [];
  /** A recovery decision temporarily blocks save and drawing. */ draftPending: [pending: boolean];
  /** Action or mount failure. */ error: [error: unknown];
}
/** Host content integrated into the shared workspace header. */
export interface WhiteboardEditorSlots {
  /** @returns Host-owned save status in the standalone header. */ status?(): unknown;
  /** @returns Host actions such as theme selection and saving. */ actions?(): unknown;
}
/** Shared modal props. */
export interface WhiteboardDialogProps {
  /** Host owns atomic acceptance. */ readonly request: WhiteboardEditRequest;
  /** Captured stable document identity enabling local recovery. */ readonly drafts?: WhiteboardDraftOptions | undefined;
  /** Theme inherited from the editor opening the task. */ readonly theme?: QuireKitTheme | undefined;
  /** Stores the preview PNG and saves its address; omitted keeps it inline. */ readonly uploadPreview?: WhiteboardPreviewUpload | undefined;
}
