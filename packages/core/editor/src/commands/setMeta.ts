import type { Command } from "../types";

/**
 * Stores a metadata value on the current transaction.
 *
 * @param key - ProseMirror metadata key.
 * @param value - Value to store.
 * @returns Command that writes transaction metadata.
 */
export function setMeta(key: unknown, value: unknown): Command {
  return ({ tr }) => {
    tr.setMeta(key as never, value);

    return true;
  };
}
