import type { MdDocxPolicy } from "../docx/types";
import type { MdImageStorage } from "./types";

/**
 * Lets Word import and export use the editor's image storage unless the host configured them separately.
 * @param docx - Host Word options.
 * @param storage - Host image storage.
 * @returns Options whose missing `storeImage` / `resolveImage` delegate to the storage.
 */
export function withMdImageStorage(docx: MdDocxPolicy, storage: MdImageStorage | undefined): MdDocxPolicy {
  if (!storage) return docx;
  return {
    ...docx,
    storeImage: docx.storeImage ?? (async ({ dataUrl, alt }) => {
      const blob = await (await fetch(dataUrl)).blob();
      return storage.upload(blob, { signal: new AbortController().signal, source: "docx", ...(alt ? { name: alt } : {}) });
    }),
    ...(docx.resolveImage ? {} : storage.resolve ? { resolveImage: (url: string) => storage.resolve!(url, new AbortController().signal) } : {}),
  };
}
