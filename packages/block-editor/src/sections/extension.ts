import { Extension, type RawCommands } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import { readSections, sectionSibling, sectionTarget } from "./query";
import { createSectionPlugin, sectionKey } from "./state";
import { sectionMenu } from "./menu";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Chapter and stable document-location operations. */
    readonly blockSections: {
      /** @param id - Heading identity. @returns Whether folding was accepted. */
      readonly toggleBlockSection: (id: string) => ReturnType;
      /** @param id - Heading identity. @returns Whether the entire chapter was duplicated. */
      readonly duplicateBlockSection: (id: string) => ReturnType;
      /** @param id - Heading identity. @param direction - Adjacent same-level chapter. @returns Whether the chapter moved. */
      readonly moveBlockSection: (id: string, direction: "up" | "down") => ReturnType;
      /** @param id - Stable block identity. @returns Whether this document contains a navigable target. */
      readonly navigateBlockLink: (id: string) => ReturnType;
    };
  }
}

/** Headless chapter scope and transient visibility; no alternate content owner. */
export const BlockSections = Extension.create({
  name: "blockSections",
  /** @returns Contextual chapter actions. */
  addBlockMenuProviders() { return [sectionMenu]; },
  /** @returns Strongly typed, history-aware document commands and local folding. */
  addCommands(): Partial<RawCommands> { return {
    toggleBlockSection: id => ({ tr, dispatch }) => {
      const section = readSections(tr.doc).find(item => item.id === id);
      if (!section || section.body === section.to) return false;
      if (dispatch) {
        tr.setSelection(TextSelection.create(tr.doc, section.from + 1));
        tr.setMeta(sectionKey, id).setMeta("addToHistory", false);
      }
      return true;
    },
    duplicateBlockSection: id => ({ editor, commands }) => {
      const target = sectionTarget(editor, id);
      return !!target && editor.isEditable && commands.closeHistory() && commands.insertContentAt(target.blocks.at(-1)!.to, target.blocks.map(block => block.node.toJSON()));
    },
    moveBlockSection: (id, direction) => ({ editor, commands }) => {
      if (!editor.isEditable) return false;
      const sections = readSections(editor.state.doc), section = sections.find(item => item.id === id);
      const sibling = section && sectionSibling(sections, section, direction);
      const source = sectionTarget(editor, id), destination = sibling && sectionTarget(editor, sibling.id);
      if (!source || !destination) return false;
      return commands.moveBlockRange({ source: source.range, destination: {
        target: direction === "up" ? destination.block : destination.blocks.at(-1)!, side: direction === "up" ? "before" : "after",
        expectedDocumentRevision: source.range.expectedDocumentRevision
      } });
    },
    navigateBlockLink: id => ({ editor, tr, dispatch }) => {
      const block = readBlockCatalog(editor)?.byId.get(id);
      if (!block || tr.doc !== editor.state.doc) return false;
      if (dispatch) {
        tr.setSelection(block.node.isTextblock ? TextSelection.create(tr.doc, block.from + 1)
          : NodeSelection.isSelectable(block.node) ? NodeSelection.create(tr.doc, block.from) : TextSelection.near(tr.doc.resolve(block.from)));
        tr.setMeta("addToHistory", false).scrollIntoView();
      }
      return true;
    }
  }; },
  /** @returns Instance-owned visibility projection. */
  addProseMirrorPlugins() { return this.editor ? [createSectionPlugin(this.editor)] : []; }
});
