import { Node, defineSource } from "@quirekit/msfe-core";
import type { TaskAttributes } from "./types";
import { taskRenderer } from "./renderer";

/** Task marker semantics shared by native, Vue and React views. */
export const TaskItem = Node.create({ name: "taskItem",
  /** @returns The single writable task field. */
  addAttributes: () => ({ checked: { default: false, validate: value => typeof value === "boolean" } }),
  /** @returns Exact one-character edits in the shared history. */
  addSource: () => defineSource<TaskAttributes>({ nodes: ["TaskMarker"], placement: "replace", renderer: taskRenderer,
    /** @param document - Canonical Markdown. @param node - Confirmed marker. @returns Valid task fields or source fallback. */
    read(document, node) {
      const marker = document.slice(node.from, node.to);
      return /^\[[ xX]\]$/u.test(marker) ? { checked: marker[1]!.toLowerCase() === "x" } : null;
    },
    /** @param document - Canonical Markdown. @param node - Confirmed marker. @param patch - Admitted fields. @returns Exact checkbox edit. */
    patch: (_document, node, patch) => typeof patch.checked !== "boolean" ? null : { from: node.from + 1, to: node.to - 1, insert: patch.checked ? "x" : " " },
  }),
});
