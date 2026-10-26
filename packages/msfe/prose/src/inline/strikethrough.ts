import { Mark, defineSource, sourceCommand, toggleSourceMark } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";

/** GFM strikethrough is independently replaceable and configurable through Mark inheritance. */
export const Strikethrough = Mark.create({ name: "strikethrough",
  /** @returns Queryable source semantics. */
  addSource: () => defineSource({ nodes: ["Strikethrough"], read: () => ({}), patch: () => null }),
  /** @returns One canonical toggle transaction. */
  addCommands: () => ({ toggleStrikethrough: () => sourceCommand(toggleSourceMark({ node: "Strikethrough", marker: "~~", markerNode: "StrikethroughMark" })) }),
  /** @returns Text styling without changing the input owner. */
  addProjections: () => [{ nodes: ["Strikethrough"],
    /** @param input - Confirmed GFM syntax. @returns Styling and source-reveal decorations. */
    decorate({ node, active }) {
      const marks = node.getChildren("StrikethroughMark"), first = marks[0], last = marks.at(-1);
      if (!first || !last || first.to >= last.from) return [];
      const result = [Decoration.mark({ class: "msfe-strike" }).range(first.to, last.from)];
      if (!active) for (const mark of marks) result.push(Decoration.replace({}).range(mark.from, mark.to));
      return result;
    },
  }],
});
