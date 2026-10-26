import type { MindMapDocument, MindMapSnapshot } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import type { QuireKitTheme } from "@quirekit/ui";
import type { MindEditorRecoveryOptions } from "../../recovery/types";

/** Public Vue editor props; source replacement is an explicit host operation. */
export interface MindEditorProps {
  /** Explicit host-owned local draft identity; omitted disables storage and page listeners. */ readonly recovery?: MindEditorRecoveryOptions | undefined;
  /** Initial immutable document; replace its identity to open another document. */ readonly document: MindMapDocument;
  /** Host-controlled document title beside the product name; defaults to the live main-root text. */ readonly title?: string | undefined;
  /** Whether authoring commands are unavailable. */ readonly readOnly?: boolean | undefined;
  /** Theme shared by controls, nodes and the viewport. */ readonly theme?: QuireKitTheme | undefined;
}

/** Public ref API; no third-party runtime object is exposed. */
export interface MindEditorHandle {
  /** @returns Clear completion after an explicit successful save or cancellation; forced unmount preserves recovery. */ finishRecovery(): Promise<boolean>;
  /** @param document - Exact source accepted by a standalone host. @returns New recovery baseline without resetting editor history. */ acceptRecoverySave(document: MindMapDocument): Promise<void>;
  /** @returns Canonical source after native text is committed. */ getDocument(): Promise<MindMapDocument>;
  /** @returns Content-only SVG without editor chrome or background dots. */ exportSvg(): Promise<MindMapSnapshot>;
  /** Focuses the active editing surface. */ focus(): void;
  /** @returns Completion of fitting content to the current container. */ fit(): Promise<void>;
}

/** Typed Vue events; source serialization stays explicit. */
export interface MindEditorEmits {
  /** Whether a recovery decision blocks authoring and host save. */ recoveryPending: [pending: boolean];
  /** Provides the initialized public controller. */ ready: [editor: MindMapEditor];
  /** Invalidates the current source without copying the full tree. */ change: [count: number];
  /** Reports mount, command or export failures to the host. */ error: [error: unknown];
}
