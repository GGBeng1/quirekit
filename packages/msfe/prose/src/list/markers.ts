import { Extension, sourceCommand } from "@quirekit/msfe-core";
import { Decoration } from "@quirekit/cm-view";
import { changeListIndent, continueList } from "./commands";
import { OrderedMarker, orderedListNumber } from "./numbering";

/** Native list prefixes; task controls retain their own source and component lifecycle. */
export const ListMarkers = Extension.create({ name: "listMarkers",
  /** @returns Atomic commands sharing the canonical draft and history. */
  addCommands: () => ({ indentList: () => sourceCommand(changeListIndent(1)), outdentList: () => sourceCommand(changeListIndent(-1)),
    continueList: () => sourceCommand(continueList()) }),
  /** @returns Contextual shortcuts; returning false preserves normal Tab focus traversal. */
  addKeyboardShortcuts() { return { Tab: () => !this.editor.isActive("table") && this.editor.commands.indentList(),
    "Shift-Tab": () => !this.editor.isActive("table") && this.editor.commands.outdentList(),
    "Mod-]": () => this.editor.commands.indentList(), "Mod-[": () => this.editor.commands.outdentList() }; },
  /** @returns Viewport-bounded markers with source-preserving locked numbering. */
  addProjections: () => [{ nodes: ["ListMark"],
    /** @param input - Current marker and directed source selection. @returns A semantic list prefix. */
    decorate({ state, node, mode, active, selection }) {
      const task = node.parent?.getChild("Task")?.getChild("TaskMarker");
      const taskActive = task && mode === "live" && selection.ranges.some(range => range.empty
        ? range.head >= task.from && range.head <= task.to : range.from < task.to && range.to > task.from);
      const to = node.to + Number(state.sliceDoc(node.to, node.to + 1) === " ");
      if (task) return taskActive ? [] : [Decoration.replace({}).range(node.from, to)];
      const bullet = node.parent?.parent?.name === "BulletList";
      if (!bullet && mode === "locked") {
        const number = orderedListNumber(state, node);
        if (number !== undefined) return [Decoration.replace({ widget: new OrderedMarker(number) }).range(node.from, to)];
      }
      let depth = 0;
      // Three public Prose marker levels are enough; deeper ancestry uses the last role.
      for (let parent = node.parent; parent && depth < 3; parent = parent.parent) {
        if (parent.name === "BulletList" || parent.name === "OrderedList") depth++;
      }
      return [Decoration.mark({ class: `msfe-list-prefix msfe-list-depth-${depth}${bullet && !active ? " msfe-list-prefix-hidden" : ""}` }).range(node.from, to)];
    },
  }],
});
