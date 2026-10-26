import type { Editor } from "@quirekit/core";
import { Decoration, DecorationSet, Plugin, PluginKey, type Node, type Selection, type EditorState } from "@quirekit/pm";
import { readSections } from "./query";
import type { BlockSectionState } from "./types";
import { sectionControl, releaseSectionControl } from "./control";

export const sectionKey = new PluginKey<BlockSectionState>("blockSections");

/** @param editor - Commands owning the control. @param doc - Current document. @param folded - Transient IDs. @returns Retained presentation with zero-width heading controls. */
function project(editor: Editor, doc: Node, folded: ReadonlySet<string>): BlockSectionState {
  const sections = readSections(doc), decorations: Decoration[] = [];
  const hidden = sections.filter(section => folded.has(section.id));
  // Hide whole canonical siblings, not their text alone. The HTML View's existing
  // visibility measurement excludes these nodes from hit testing and selection ink.
  let hiddenIndex = 0, hiddenUntil = 0;
  doc.forEach((node, from) => {
    while (hiddenIndex < hidden.length && hidden[hiddenIndex]!.body <= from) hiddenUntil = Math.max(hiddenUntil, hidden[hiddenIndex++]!.to);
    if (from < hiddenUntil) {
      decorations.push(Decoration.node(from, from + node.nodeSize, { class: "qk-block-section-hidden" }));
    }
  });
  for (const section of sections) {
    if (section.body === section.to) continue;
    const collapsed = folded.has(section.id);
    decorations.push(Decoration.node(section.from, section.body, { class: "qk-block-section-heading", "aria-label": doc.nodeAt(section.from)!.textContent }));
    decorations.push(Decoration.widget(section.from + 1, view => sectionControl(view.dom.ownerDocument, editor, section.id, collapsed),
      { key: `section:${section.id}:${collapsed}`, side: -1, stopEvent: () => true, destroy: releaseSectionControl }));
  }
  return { sections, byId: new Map(sections.map(section => [section.id, section])), folded, decorations: DecorationSet.create(doc, decorations) };
}

/** @param selection - Accepted selection. @param from - Hidden start. @param to - Hidden end. @returns Whether either endpoint enters hidden content. */
function enters(selection: Selection, from: number, to: number): boolean {
  return selection.from >= from && selection.from < to || selection.to > from && selection.to < to;
}

/** @param editor - Instance command owner. @returns Local folding state with no selection-only document scans. */
export function createSectionPlugin(editor: Editor): Plugin<BlockSectionState> {
  return new Plugin<BlockSectionState>({ key: sectionKey, state: {
    /** @param _config - Plugin configuration. @param state - Initial document. @returns First retained projection. */
    init: (_config, state) => project(editor, state.doc, new Set()),
    /** @param tr - Accepted input. @param previous - Retained state. @returns Changed projection only when its dependencies change. */
    apply(tr, previous) {
      const toggle = tr.getMeta(sectionKey) as string | undefined;
      if (!tr.docChanged && !tr.selectionSet && !toggle) return previous;
      const sections = tr.docChanged ? readSections(tr.doc) : previous.sections;
      const byId = tr.docChanged ? new Map(sections.map(section => [section.id, section])) : previous.byId;
      const folded = new Set(previous.folded);
      if (toggle) { if (folded.has(toggle)) folded.delete(toggle); else folded.add(toggle); }
      for (const id of folded) {
        const section = byId.get(id);
        if (!section || enters(tr.selection, section.body, section.to)) folded.delete(id);
      }
      if (!tr.docChanged && folded.size === previous.folded.size && [...folded].every(id => previous.folded.has(id))) return previous;
      return project(editor, tr.doc, folded);
    }
  }, props: { decorations: (state: EditorState) => sectionKey.getState(state)?.decorations ?? null } });
}
