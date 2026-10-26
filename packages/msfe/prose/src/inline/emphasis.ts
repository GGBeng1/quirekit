import { Mark, defineSource, sourceCommand, toggleSourceMark, type ProjectionDecoration } from "@quirekit/msfe-core";

/** Native emphasis owns semantic queries and source edits independently of other prose features. */
export const Emphasis = Mark.create({ name: "emphasis",
  /** @returns Pure source semantics without a component renderer. */
  addSource: () => defineSource({ nodes: ["Emphasis"], read: () => ({}), patch: () => null }),
  /** @returns An undoable command through the shared transaction builder. */
  addCommands: () => ({ toggleEmphasis: () => sourceCommand(toggleSourceMark({ node: "Emphasis", marker: "*", markerNode: "EmphasisMark" })) }),
  /** @returns Viewport-bounded formatting; the runtime reveals markers during source activity. */
  addProjectionLayers() { const name = this.name; return [{ key: `${name}-format`, placement: "inline", build: input => {
    const result: ProjectionDecoration[] = [];
    for (const match of input.query(name).matches) {
      const marks = match.node.children("EmphasisMark"), first = marks[0], last = marks.at(-1);
      if (!first || !last || first.to >= last.from) continue;
      result.push({ type: "mark", from: first.to, to: last.from, class: "msfe-emphasis" });
      for (const marker of marks) result.push({ type: "replace", key: `marker-${marker.from}`, from: marker.from, to: marker.to });
    }
    return result;
  } }]; },
});
