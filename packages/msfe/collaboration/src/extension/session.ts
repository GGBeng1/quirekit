import { Facet } from "@quirekit/cm-state";
import type { CollaborationSession } from "../session/session";

/** Exact source-owner identity shared by optional collaboration extensions. */
export const collaborationSession = Facet.define<CollaborationSession, CollaborationSession | null>({ combine: values => values[0] ?? null });
