import { defineSource, isSafeDestination, readSourceDestination, patchSourceDestination } from "@quirekit/msfe-core";
import type { LinkAttributes } from "./types";

/** Inline edits retain surrounding bytes; reference edits materialize only the selected usage. */
export const linkSource = defineSource<LinkAttributes>({ nodes: ["Link", "Autolink", "URL"],
  read(document, node) {
    const destination = readSourceDestination(document, node);
    return destination && isSafeDestination(destination.url) ? { url: destination.url } : null;
  },
  patch(document, node, patch) {
    if (typeof patch.url !== "string" || !isSafeDestination(patch.url) || Object.keys(patch).some(key => key !== "url")) return null;
    return patchSourceDestination(document, node, patch);
  },
});
