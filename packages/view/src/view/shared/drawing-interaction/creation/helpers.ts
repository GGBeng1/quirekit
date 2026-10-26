import type { QuireDrawingControllerState, QuireDrawingCreatingState } from "@quirekit/view-engine";
import type { MountedDrawingCreatedTextBox, MountedDrawingCreationOptions } from "../types";
import { v4 as uuidv4 } from "uuid";


/**
 * Reports whether controller state owns a paintable creation track.
 *
 * @param state - Current pure drawing-controller state.
 * @returns Whether the state is provisional creation.
 */
export function isDrawingCreatingState(
  state: QuireDrawingControllerState
): state is QuireDrawingCreatingState {
  return state.kind === "creating";
}

/**
 * Allocates stable creation identities while accepting deterministic test input.
 *
 * @param options - Optional host-supplied identities.
 * @returns Complete anchor, drawing, and story identities.
 */
export function resolveMountedDrawingCreationIdentities(
  options: MountedDrawingCreationOptions
): MountedDrawingCreatedTextBox {
  const token = createMountedDrawingIdentityToken();
  const objectId = options.objectId ?? `word-${options.drawingKind === "shape" ? "shape" : "text-box"}:${token}`;
  return {
    objectId,
    drawingId: options.drawingId ?? `${objectId}:drawing`,
    storyId: options.storyId ?? `${objectId}:story`
  };
}

/**
 * Creates one random identity token for a mounted drawing.
 *
 * @returns UUID v4 token.
 */
function createMountedDrawingIdentityToken(): string {
  return uuidv4();
}

/**
 * Checks whether one document point lies inside a page rectangle.
 *
 * @param rect - Candidate page rectangle.
 * @param point - Document-space pointer point.
 * @returns Whether the page owns the point.
 */
export function containsPoint(
  rect: Readonly<{ x: number; y: number; width: number; height: number }>,
  point: Readonly<{ x: number; y: number }>
): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}
