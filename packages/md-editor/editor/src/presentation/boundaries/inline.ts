import { isSafeDestination, readSourceDestination, sourceDocument, sourceNode, type EditingBoundaryRule } from "@quirekit/msfe-core";

/** Link labels are editable text; destinations belong to the link controls. */
export const linkBoundary: EditingBoundaryRule = { nodes: ["Link", "Autolink", "URL"],
  /** @param context - Confirmed link syntax and reference definitions. @returns Paired label bounds only when the renderer projects a safe resolved link. */
  resolve({ state, node }) {
    const destination = readSourceDestination(sourceDocument(state), sourceNode(node));
    return destination && isSafeDestination(destination.url) && destination.labelFrom < destination.labelTo
      ? { from: node.from, to: node.to, contentFrom: destination.labelFrom, contentTo: destination.labelTo,
        kind: "style", navigation: "content", deletion: "unwrap" } : null;
  },
};
