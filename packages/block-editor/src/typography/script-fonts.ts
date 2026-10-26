import { Extension, getChangedRanges } from "@quirekit/core";
import { Decoration, DecorationSet, Plugin, PluginKey, type Node, type EditorState } from "@quirekit/pm";
import { splitQuireDocumentFontRuns } from "@quirekit/view-engine";

/** @param node - One immutable textblock. @param position - Its current source boundary. @returns Script-family spans using the same itemizer as Canvas. */
function fonts(node: Node, position: number): Decoration[] {
 const result: Decoration[] = [];
 node.forEach((child, offset) => {
  if (!child.isText) return;
  const attrs = child.marks.find(mark => mark.type.name === "textStyle")?.attrs;
  if (!attrs || ![attrs.fontFamilyLatin, attrs.fontFamilyEastAsia, attrs.fontFamilyComplexScript].some(Boolean)) return;
  const fontSet = { latin: attrs.fontFamilyLatin || attrs.fontFamily || "inherit", eastAsia: attrs.fontFamilyEastAsia || attrs.fontFamily || "inherit", complexScript: attrs.fontFamilyComplexScript || attrs.fontFamily || "inherit" };
  for (const run of splitQuireDocumentFontRuns({ text: child.text!, font: "16px sans-serif", fontSet })) {
   const family = fontSet[run.slot];
   result.push(Decoration.inline(position + 1 + offset + run.from, position + 1 + offset + run.to, { style: `font-family:${family}`, "data-block-font-slot": run.slot }));
  }
 });
 return result;
}
/** HTML projection of existing independent font slots; canonical marks and clipboard remain authoritative. */
export const BlockScriptFonts = Extension.create({
 name: "blockScriptFonts",
 /** @returns Incremental presentation; selection-only transactions perform no text traversal. */
 addProseMirrorPlugins() {
  const key = new PluginKey<DecorationSet>("blockScriptFonts");
  return [new Plugin<DecorationSet>({ key, state: {
   /** @param _config - Plugin configuration. @param state - Initial source. @returns Initial slot runs. */
   init(_config, state) {
    const spans: Decoration[] = [];
    state.doc.descendants((node, pos) => { if (node.isTextblock) { spans.push(...fonts(node, pos)); return false; } return true; });
    return DecorationSet.create(state.doc, spans);
   },
   /** @param tr - Accepted source change. @param previous - Last projection. @returns Changed textblocks only, with unchanged spans mapped. */
   apply(tr, previous) {
    if (!tr.docChanged) return previous;
    let next = previous.map(tr.mapping, tr.doc);
    const touched = new Map<number, Node>();
    for (const { newRange } of getChangedRanges(tr)) tr.doc.nodesBetween(Math.max(0, newRange.from - 1), Math.min(tr.doc.content.size, newRange.to + 1), (node, pos) => {
     if (node.isTextblock) { touched.set(pos, node); return false; } return true;
    });
    for (const [pos, node] of touched) next = next.remove(next.find(pos, pos + node.nodeSize)).add(tr.doc, fonts(node, pos));
    return next;
   }
  }, props: { /** @param state - Current source. @returns Retained slot decorations. */ decorations(state: EditorState) { return key.getState(state) ?? null; } } })];
 }
});
