import type { CollaborationSession } from "../session/session";
import type { RelativePosition } from "yjs";

/** Host-provided display identity; it never grants document access. */
export interface CollaborationUser {
  /** Stable display identity, at most 128 characters. */
  readonly id: string;
  /** Plain-text name, between 1 and 80 characters. */
  readonly name: string;
  /** Six-digit hexadecimal participant color. */
  readonly color: string;
}

/** One remote editor incarnation, suitable for a host-owned member list. */
export interface CollaborationParticipant {
  /** Provider connection id, distinct from the user's display identity. */
  readonly id: string;
  /** Host-provided display user. */
  readonly user: CollaborationUser;
  /** Focused editable source versus an online viewer. */
  readonly activity: "editing" | "viewing";
}

/** Optional source-presence installation; configuring it allocates no network resources. */
export interface CollaborationPresenceOptions {
  /** Same prepared source owner used by the Collaboration extension. */
  readonly session: CollaborationSession | null;
  /** Host display identity. */
  readonly user: CollaborationUser | null;
  /** @param participants - Remote members only; called on identity/activity changes, not every cursor move. */
  readonly onParticipants?: (participants: readonly CollaborationParticipant[]) => void;
}

/** Bounded protocol payload; JSON conversion preserves both relative endpoint identities. */
export interface PresencePacket {
  /** Protocol version. */
  readonly version: 1;
  /** Display identity only. */
  readonly user: CollaborationUser;
  /** Current local focus/editability status. */
  readonly activity: "editing" | "viewing";
  /** Directed primary selection, cleared on blur. */
  readonly selection: { readonly anchor: RelativePosition; readonly head: RelativePosition } | null;
}

/** One remote selection resolved against the current accepted source. */
export interface ResolvedParticipant extends CollaborationParticipant {
  /** Source positions, absent while an endpoint cannot be resolved. */
  readonly selection: { readonly anchor: number; readonly head: number } | null;
}
