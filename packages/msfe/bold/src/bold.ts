import { Mark, defineSource, sourceCommand } from "@quirekit/msfe-core";
import { Decoration, EditorView } from "@quirekit/cm-view";
import { toggleSourceMark, type MsfeExtension, type MsfeCommand } from "@quirekit/msfe-core";

/** @returns A pure bold source command with multi-selection support. */
export function toggleBold(): MsfeCommand { return toggleSourceMark({ node: "StrongEmphasis", marker: "**", markerNode: "EmphasisMark" }); }

/** @returns Strong-emphasis projection and a native undoable keyboard shortcut. */
function boldBackend(): MsfeExtension {
  return { id: "bold", commands: { toggleBold }, projections: [{ nodes: ["StrongEmphasis"], decorate({ node, active }) {
    const marks = node.getChildren("EmphasisMark");
    const first = marks[0], last = marks[1];
    if (!first || !last || first.to >= last.from) return [];
    return [Decoration.mark({ class: "msfe-bold" }).range(first.to, last.from),
      ...(active ? [] : marks.map(mark => Decoration.replace({}).range(mark.from, mark.to)))];
  } }], extensions: [EditorView.baseTheme({ ".msfe-bold": { fontWeight: "700" } })] };
}

/** Configurable bold feature; configuring does not mutate other editors. */
export const Bold = Mark.create<Record<string, never>>({
  name: "bold",
  addOptions() { return {}; },
  addAttributes: () => ({}),
  addSource: () => defineSource({ nodes: ["StrongEmphasis"], read: () => ({}), patch: () => null }),
  addCommands() { return { toggleBold: () => sourceCommand(toggleBold()) }; },
  addKeyboardShortcuts() { return { "Mod-b": () => this.editor.commands.toggleBold() }; },
  addProjections() { return boldBackend().projections!; },
  addCodeMirrorExtensions() { return boldBackend().extensions!; },
});

/** @returns Independently configured feature. */
export function bold() { return Bold.configure({}); }
