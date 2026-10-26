import { createAbsolutePositionFromRelativePosition, createRelativePositionFromJSON, createRelativePositionFromTypeIndex,
  type Text, type RelativePosition } from "yjs";
import type { CollaborationUser, PresencePacket, ResolvedParticipant } from "./types";

/** @param value - Untrusted wire value. @returns Whether it is a non-array object. */
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }

/** @param value - Untrusted wire identity. @returns A bounded text-only display identity, or null. */
export function readUser(value: unknown): CollaborationUser | null {
  if (!record(value) || typeof value.id !== "string" || !value.id.length || value.id.length > 128
    || typeof value.name !== "string" || !value.name.trim() || value.name.length > 80 || /[\u0000-\u001f\u007f]/u.test(value.name)
    || typeof value.color !== "string" || !/^#[\da-f]{6}$/iu.test(value.color)) return null;
  return { id: value.id, name: value.name, color: value.color };
}

/** @param value - Untrusted Yjs identity. @returns Whether it contains finite protocol integers. */
function identity(value: unknown): boolean {
  return record(value) && Number.isSafeInteger(value.client) && (value.client as number) >= 0
    && (value.client as number) <= 0xffffffff && Number.isSafeInteger(value.clock) && (value.clock as number) >= 0;
}

/** @param value - JSON endpoint. @returns A validated Yjs relative position. */
function endpoint(value: unknown): RelativePosition | null {
  if (!record(value) || value.type != null && !identity(value.type) || value.item != null && !identity(value.item)
    || value.tname != null && value.tname !== "source" || value.assoc != null && ![-1, 0, 1].includes(value.assoc as number)
    || value.type == null && value.tname == null) return null;
  return createRelativePositionFromJSON({ type: value.type, item: value.item, tname: value.tname, assoc: value.assoc ?? 0 });
}

/** @param value - Untrusted ephemeral payload. @returns A bounded normalized protocol message, or null. */
export function decodePacket(value: unknown): PresencePacket | null {
  try {
    if (!record(value) || value.version !== 1 || !["editing", "viewing"].includes(value.activity as string)) return null;
    const user = readUser(value.user); if (!user) return null;
    if (value.selection === null) return { version: 1, user, activity: value.activity as PresencePacket["activity"], selection: null };
    if (!record(value.selection)) return null;
    const anchor = endpoint(value.selection.anchor), head = endpoint(value.selection.head);
    return anchor && head ? { version: 1, user, activity: value.activity as PresencePacket["activity"], selection: { anchor, head } } : null;
  } catch { return null; }
}

/** @param text - Canonical source. @param user - Validated display identity. @param activity - Focus/editability status.
 * @param selection - Directed primary selection, or null on blur. @returns Source-relative transient state. */
export function encodePacket(text: Text, user: CollaborationUser, activity: PresencePacket["activity"],
  selection: { readonly anchor: number; readonly head: number } | null): PresencePacket {
  return { version: 1, user, activity, selection: selection ? {
    anchor: createRelativePositionFromTypeIndex(text, selection.anchor), head: createRelativePositionFromTypeIndex(text, selection.head),
  } : null };
}

/** @param text - Exact current source. @param id - Provider-owned connection id. @param packet - Validated payload.
 * @returns Display participant and a selection only when both endpoints resolve to this source. */
export function resolvePacket(text: Text, id: string, packet: PresencePacket): ResolvedParticipant {
  const anchor = packet.selection && createAbsolutePositionFromRelativePosition(packet.selection.anchor, text.doc!);
  const head = packet.selection && createAbsolutePositionFromRelativePosition(packet.selection.head, text.doc!);
  return { id, user: packet.user, activity: packet.activity,
    selection: anchor?.type === text && head?.type === text ? { anchor: anchor.index, head: head.index } : null };
}
