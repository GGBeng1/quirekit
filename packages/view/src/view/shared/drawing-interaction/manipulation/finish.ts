import type { QuireDrawingControllerCommitIntent } from "@quirekit/view-engine";
import type { CreateMountedDrawingInteractionRuntimeOptions, MountedDrawingAnchorRelocation } from "../types";
import type { MountedDrawingInteractionSession } from "./types";
import { readCurrentMountedDrawingSource } from "./session";
import { resolveMountedDrawingCommitReanchor } from "./reanchor";
import { commitMountedWordDrawingManipulation } from "../commit";

/**
 * Commits final source intent through the canonical Word command after revalidation.
 * @param options - Mounted editor authority.
 * @param session - Immutable captured owner.
 * @param intent - Final controller result, or no drag.
 * @param relocation - Optional accepted target-page placement.
 * @returns Whether a canonical command was committed.
 */
export function finishMountedDrawingManipulation(options: CreateMountedDrawingInteractionRuntimeOptions,
  session: MountedDrawingInteractionSession, intent: QuireDrawingControllerCommitIntent | null,
  relocation: MountedDrawingAnchorRelocation | undefined): boolean {
  const source = readCurrentMountedDrawingSource(options, session);
  const reanchor = intent === null || source === undefined
    ? { kind: "rejected" } as const
    : resolveMountedDrawingCommitReanchor(
        options,
        session,
        source,
        intent,
        relocation
      );
  return intent !== null
    && source !== undefined
    && reanchor.kind !== "rejected"
    && commitMountedWordDrawingManipulation(
      options.editor,
      session.position,
      source,
      intent,
      reanchor.kind === "reanchor" ? reanchor.relocation : undefined
    );
}
