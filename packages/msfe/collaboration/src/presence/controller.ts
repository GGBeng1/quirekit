import type { MsfeEditor } from "@quirekit/msfe-core";
import type { CollaborationPresenceTransport } from "../transport/types";
import { collaborationSession } from "../extension/session";
import { presenceEffect } from "./projection/state";
import { decodePacket, encodePacket, readUser, resolvePacket } from "./wire";
import type { CollaborationParticipant, CollaborationPresenceOptions, CollaborationUser, ResolvedParticipant } from "./types";

/** Editor-owned ephemeral lifetime; no document serialization or transport work exists without installation. */
export class PresenceController {
  private readonly user: CollaborationUser;
  private channel: CollaborationPresenceTransport | undefined;
  private unlisten: (() => void) | undefined;
  private readonly unsubscribe: () => void;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private focused = false;
  private queued = false;
  private disposed = false;
  private sent = "";
  private roster = "";
  private projected = "";
  private source;

  /** @param editor - Current canonical instance. @param options - Exact session and host display identity. */
  constructor(private readonly editor: MsfeEditor, private readonly options: CollaborationPresenceOptions) {
    if (!options.session || editor.state.facet(collaborationSession) !== options.session) throw new Error("collaboration-presence-session-mismatch");
    const user = readUser(options.user); if (!user) throw new Error("collaboration-presence-user-invalid"); this.user = user;
    this.source = editor.state.doc;
    this.focused = editor.element.contains(editor.element.ownerDocument.activeElement);
    this.connection();
    this.unsubscribe = options.session.subscribe(() => this.connection());
  }

  /** Schedules only the latest accepted source/selection for a bounded fixed-window broadcast. */
  changed(): void {
    this.project();
    if (!this.channel || this.timer !== undefined || this.disposed) return;
    this.timer = setTimeout(() => { this.timer = undefined; this.publish(); }, 50);
  }

  /** @param focused - Whether native source focus is owned by this editor. */
  focus(focused: boolean): void {
    if (this.disposed || focused === this.focused) return;
    this.focused = focused; this.cancel(); this.publish();
  }

  /** Withdraws local state and retires every scheduled callback before editor teardown. */
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true; this.unsubscribe(); this.cancel(); this.release();
    if (this.roster !== "[]") this.options.onParticipants?.([]);
  }

  /** Changes capability only on connection transitions, not on per-key synchronization acknowledgements. */
  private connection(): void {
    if (this.disposed) return;
    const state = this.options.session!.state;
    if (state.lifecycle === "ready" && state.connection === "connected") {
      if (this.channel) return;
      this.channel = this.options.session!.acquirePresence();
      this.unlisten = this.channel.subscribe(() => this.project());
      this.sent = ""; this.publish(); this.project();
    } else if (this.channel) { this.cancel(); this.release(); this.project(); }
  }

  /** Stops at the lease boundary; a provider may already have retired this generation. */
  private release(): void {
    this.unlisten?.(); this.unlisten = undefined;
    this.channel?.release(); this.channel = undefined;
  }

  /** Cancels the single bounded publication window. */
  private cancel(): void { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }

  /** Publishes only semantic changes after source acceptance; focus loss is immediate. */
  private publish(): void {
    if (this.disposed || !this.channel) return;
    const { state } = this.editor, main = state.selection.main;
    // Read-only viewers share where they are reading, never a selected range.
    const selection = !this.focused ? null : state.readOnly ? { anchor: main.head, head: main.head } : main;
    const packet = encodePacket(this.options.session!.document.getText("source"), this.user,
      this.focused && !state.readOnly ? "editing" : "viewing", selection);
    const signature = JSON.stringify(packet);
    if (signature === this.sent) return;
    this.sent = signature; this.channel.publish(packet);
  }

  /** Coalesces incoming packets and accepted source changes after synchronous transport/CRDT callbacks settle. */
  private project(): void {
    if (this.disposed || this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false; if (this.disposed) return;
      const peers: ResolvedParticipant[] = [], text = this.options.session!.document.getText("source");
      let inspected = 0;
      for (const [id, value] of this.channel?.getStates() ?? []) {
        if (++inspected > 100) break;
        if (id === this.channel?.clientId || id.length > 128) continue;
        const packet = decodePacket(value); if (!packet) continue;
        const peer = resolvePacket(text, id, packet);
        if (peer.selection && Math.max(peer.selection.anchor, peer.selection.head) > this.editor.state.doc.length) continue;
        peers.push(peer);
      }
      peers.sort((a, b) => a.id.localeCompare(b.id));
      const projected = JSON.stringify(peers);
      // Geometry always belongs to the accepted source identity, even when relative endpoints resolve unchanged.
      if (this.projected !== projected || this.source !== this.editor.state.doc) {
        this.projected = projected; this.source = this.editor.state.doc;
        // Remote carets change on every peer keystroke without changing layout; a scroll snapshot here would pull back local scrolling and drag selection.
        this.editor.updateViewState({ effects: [presenceEffect.of(peers)], preserveScroll: false });
      }
      const members: CollaborationParticipant[] = peers.map(({ id, user, activity }) => ({ id, user, activity }));
      const roster = JSON.stringify(members);
      if (this.roster !== roster) { this.roster = roster; this.options.onParticipants?.(members); }
    });
  }
}
