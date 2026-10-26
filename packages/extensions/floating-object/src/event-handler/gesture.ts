import type { QuireExtensionViewEventHandler } from "@quirekit/core";
import { readFloatingObjectGeometry } from "../geometry";
import type { FloatingObjectAttributes } from "../types";

/** Initial geometry retained only for the lifetime of one captured pointer. */
export interface FloatingObjectGestureSnapshot {
  /** Exact document position before the manipulated source node. */
  readonly position: number;
  /** Geometry authority present when the pointer was captured. */
  readonly geometry: FloatingObjectAttributes;
  /** Exact document version expected before the next gesture phase. */
  readonly document: object;
}

const gestureSnapshots = new WeakMap<
  object,
  Map<number, FloatingObjectGestureSnapshot>
>();

/**
 * Reads canonical geometry at one exact source position.
 *
 * @param editor - Editor whose current document owns the position.
 * @param position - Position before the target node.
 * @returns Canonical geometry when the exact node still exists.
 */
export function readGeometryAtPosition(
  editor: Parameters<QuireExtensionViewEventHandler>[0]["editor"],
  position: number
): FloatingObjectAttributes | undefined {
  const node = editor.state.doc.nodeAt(position);
  return node === null ? undefined : readFloatingObjectGeometry(node.attrs);
}

/**
 * Stores rollback authority for one captured pointer.
 *
 * @param editor - Editor owning the captured interaction.
 * @param pointerId - Browser pointer identifier.
 * @param snapshot - Exact source position and starting geometry.
 */
export function writeGestureSnapshot(
  editor: object,
  pointerId: number,
  snapshot: FloatingObjectGestureSnapshot
): void {
  const snapshots = gestureSnapshots.get(editor) ?? new Map();
  snapshots.set(pointerId, snapshot);
  gestureSnapshots.set(editor, snapshots);
}

/**
 * Restores initial geometry when the mounted runtime cancels a gesture.
 *
 * @param editor - Editor owning the captured interaction.
 * @param pointerId - Browser pointer identifier.
 * @returns Whether the exact source node was restored.
 */
export function restoreGestureSnapshot(
  editor: Parameters<QuireExtensionViewEventHandler>[0]["editor"],
  pointerId: number
): boolean {
  const snapshot = gestureSnapshots.get(editor)?.get(pointerId);
  deleteGestureSnapshot(editor, pointerId);
  if (
    snapshot === undefined
    || editor.state.doc !== snapshot.document
    || readGeometryAtPosition(editor, snapshot.position) === undefined
  ) {
    return false;
  }
  return editor.commands.restoreFloatingObjectGeometry({
    position: snapshot.position,
    geometry: snapshot.geometry
  });
}

/**
 * Reads a gesture snapshot only while it owns the exact source version.
 *
 * @param editor - Editor owning the captured interaction.
 * @param pointerId - Browser pointer identifier.
 * @param position - Current target position reported by the captured event.
 * @returns Current snapshot, or undefined after source identity becomes stale.
 */
export function readCurrentGestureSnapshot(
  editor: Parameters<QuireExtensionViewEventHandler>[0]["editor"],
  pointerId: number,
  position: number
): FloatingObjectGestureSnapshot | undefined {
  const snapshot = gestureSnapshots.get(editor)?.get(pointerId);
  return snapshot !== undefined
    && snapshot.position === position
    && snapshot.document === editor.state.doc
    ? snapshot
    : undefined;
}

/**
 * Releases one transient gesture snapshot.
 *
 * @param editor - Editor owning the captured interaction.
 * @param pointerId - Browser pointer identifier.
 */
export function deleteGestureSnapshot(editor: object, pointerId: number): void {
  const snapshots = gestureSnapshots.get(editor);
  snapshots?.delete(pointerId);
  if (snapshots?.size === 0) gestureSnapshots.delete(editor);
}
