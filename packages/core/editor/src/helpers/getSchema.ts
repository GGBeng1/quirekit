import { Schema } from "@quirekit/pm";
import { createSchemaSpec } from "../schema";
import type { QuireAnyExtension } from "../types";

/**
 * Creates a ProseMirror schema from resolved QuireKit extensions.
 *
 * @param extensions - Resolved extensions that contribute schema fields.
 * @returns ProseMirror schema assembled from the extension set.
 */
export function getSchema(extensions: readonly QuireAnyExtension[]): Schema {
  return new Schema(createSchemaSpec(extensions));
}
