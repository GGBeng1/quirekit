import type { QuireExtensionAttributeSpec } from "@quirekit/core";

/** Schema attribute map required by the shared whole-node revision strategy. */
export const wordRevisionNodeAttributes = Object.freeze({
  wordNodeRevision: {
    default: null,
    rendered: false
  } satisfies QuireExtensionAttributeSpec
});
