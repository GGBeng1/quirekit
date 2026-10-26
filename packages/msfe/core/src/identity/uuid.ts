import { v4 as uuidv4 } from "uuid";

/**
 * Allocates an opaque UUID for source, instance, intent and projected-view identities.
 * Works without a secure context, so LAN HTTP pages can allocate identities too.
 * @returns A random UUID v4.
 */
export function createSourceIdentity(): string {
  return uuidv4();
}
