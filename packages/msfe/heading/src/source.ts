import { defineSource } from "@quirekit/msfe-core";
import type { HeadingAttributes } from "./types";

/** Exact source codec; changing heading family is left to explicit structural commands. */
export const headingSource = defineSource<HeadingAttributes>({
  nodes: ["ATXHeading1", "ATXHeading2", "ATXHeading3", "ATXHeading4", "ATXHeading5", "ATXHeading6", "SetextHeading1", "SetextHeading2"],
  read: (_document, node) => ({ level: Number(node.kind.slice(-1)) }),
  patch(_document, node, patch) {
    const marker = node.child("HeaderMark");
    if (!marker || patch.level === undefined) return null;
    if (node.kind.startsWith("Setext")) return patch.level <= 2
      ? { from: marker.from, to: marker.to, insert: (patch.level === 1 ? "=" : "-").repeat(marker.to - marker.from) } : null;
    return { from: marker.from, to: marker.to, insert: "#".repeat(patch.level) };
  },
});
