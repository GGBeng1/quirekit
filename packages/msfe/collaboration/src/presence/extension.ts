import { Extension } from "@quirekit/msfe-core";
import { PresenceController } from "./controller";
import { presenceProjection } from "./projection/layer";
import type { CollaborationPresenceOptions } from "./types";

/** Optional remote primary selections and member notifications, separate from source collaboration. */
export const CollaborationPresence = Extension.create<CollaborationPresenceOptions, { controller?: PresenceController }>({
  name: "collaborationPresence", requires: ["collaboration"],
  /** @returns Inert configuration, validated when mounted. */
  addOptions() { return { session: null, user: null }; },
  /** @returns Editor-local optional controller. */
  addStorage() { return {}; },
  /** @returns Passive CM layers and their source-neutral state field. */
  addCodeMirrorExtensions() { return presenceProjection; },
  /** @returns Complete ephemeral lifetime disposer. */
  onCreate() {
    const controller = this.storage.controller = new PresenceController(this.editor, this.options);
    return () => controller.destroy();
  },
  /** @param event - Accepted transaction; presence effects do not schedule themselves. */
  onTransaction(event) {
    const transaction = event.transaction;
    if (transaction.docChanged || transaction.selection || transaction.state.readOnly !== transaction.startState.readOnly) this.storage.controller?.changed();
  },
  /** Publishes source focus without changing local selection. */
  onFocus() { this.storage.controller?.focus(true); },
  /** Removes the remote caret while keeping this connection visible as a member. */
  onBlur() { this.storage.controller?.focus(false); },
});
