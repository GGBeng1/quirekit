import { Extension } from "@quirekit/msfe-core";
import type { CollaborationExtensionOptions } from "./types";
import { collaborationSession } from "./session";

/** Optional extension selecting a prepared session as the instance's source/history owner. */
export const Collaboration = Extension.create<CollaborationExtensionOptions>({
  name: "collaboration",
  /** @returns Inert defaults, without a connection or shared state. */
  addOptions() { return { session: null }; },
  /** @returns Source-owner identity for independently installed optional capabilities. */
  addCodeMirrorExtensions() { return this.options.session ? collaborationSession.of(this.options.session) : []; },
  /** @returns Host-owned prepared source authority. */
  addSourceProvider() {
    if (!this.options.session) throw new Error("collaboration-session-required");
    return this.options.session;
  },
});
