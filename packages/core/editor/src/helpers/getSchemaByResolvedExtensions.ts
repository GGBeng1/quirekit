import { Schema } from "@quirekit/pm";
import type { QuireAnyExtension } from "../types";
import { createSchemaSpec } from "../schema";

/**
 * Creates a ProseMirror schema from resolved extensions.
 *
 * @param extensions - Resolved extensions that contribute nodes, marks, or attributes.
 * @returns ProseMirror schema assembled from the extension set.
 */
export function getSchemaByResolvedExtensions(
  extensions: readonly QuireAnyExtension[]
): Schema {
  return new Schema(createSchemaSpec(extensions));
}
