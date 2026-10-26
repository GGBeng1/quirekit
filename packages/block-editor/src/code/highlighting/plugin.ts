import { getChangedRanges, isProseMirrorAttrStep } from "@quirekit/core";
import { Decoration, DecorationSet, Plugin, PluginKey, type EditorState, type Node as PMNode } from "@quirekit/pm";
import { highlightTree, classHighlighter } from "@lezer/highlight";
import { codeGrammars } from "./grammars";
import { codeLineNumbers } from "./lines";

import type { CodeTokenSpans } from "../types";

/** @param cache - Instance-owned bounded source cache. @param node - Immutable code source. @param position - Current block boundary. @returns Rebased syntax decorations; large/unknown languages remain editable plain text. */
function tokens(cache: Map<string, CodeTokenSpans>, node: PMNode, position: number): Decoration[] {
  const language = String(node.attrs.language ?? "").toLowerCase();
  const source = node.textContent;
  if (source.length > 20000) return codeLineNumbers(node, position);
  const key = `${language}\0${source}`;
  let spans = cache.get(key);
  if (!spans) {
    const result: { from: number; to: number; class: string }[] = [];
    const parser = codeGrammars[language];
    // Bound synchronous grammar work. This affects presentation only; no source
    // is dropped and ordinary selection transactions never enter the parser.
    if (parser) highlightTree(parser.parse(source), classHighlighter,
      (from, to, classes) => result.push({ from, to, class: classes }));
    spans = result; cache.set(key, spans);
    if (cache.size > 32) cache.delete(cache.keys().next().value!);
  }
  return [...spans.map(span => Decoration.inline(position + 1 + span.from, position + 1 + span.to, { class: span.class })), ...codeLineNumbers(node, position)];
}

/** @returns Incremental syntax presentation that retains the document's one input owner. */
export function createCodeHighlightPlugin(): Plugin<DecorationSet> {
  const cache = new Map<string, CodeTokenSpans>();
  const key = new PluginKey<DecorationSet>("blockCodeHighlight");
  return new Plugin<DecorationSet>({
    key,
    state: {
      /** @param _config - Plugin configuration. @param state - Initial canonical state. @returns Initial syntax decorations. */
      init(_config, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, position) => { if (node.type.name === "codeBlock") { decorations.push(...tokens(cache, node, position)); return false; } return true; });
        return DecorationSet.create(state.doc, decorations);
      },
      /** @param tr - Accepted transaction. @param previous - Retained decorations. @returns Mapped decoration set, reparsing only touched code blocks. */
      apply(tr, previous) {
        if (!tr.docChanged) return previous;
        let next = previous.map(tr.mapping, tr.doc);
        const touched = new Map<number, PMNode>();
        for (const { newRange } of getChangedRanges(tr)) {
          tr.doc.nodesBetween(Math.max(0, newRange.from - 1), Math.min(tr.doc.content.size, newRange.to + 1), (node, position) => {
            if (node.type.name === "codeBlock") { touched.set(position, node); return false; } return true;
          });
        }
        // Attribute steps keep positions unchanged, so text-change ranges omit
        // them. Only grammar and line-number changes invalidate code decoration.
        tr.steps.forEach((step, index) => {
          if (!isProseMirrorAttrStep(step) || (step.attr !== "language" && step.attr !== "lineNumbers")) return;
          const mapped = tr.mapping.slice(index + 1).mapResult(step.pos, 1);
          const node = mapped.deleted ? null : tr.doc.nodeAt(mapped.pos);
          if (node?.type.name === "codeBlock") touched.set(mapped.pos, node);
        });
        for (const [position, node] of touched) {
          next = next.remove(next.find(position, position + node.nodeSize));
          next = next.add(tr.doc, tokens(cache, node, position));
        }
        return next;
      }
    },
    props: { /** @param state - Canonical state. @returns Current syntax spans. */ decorations(state: EditorState) { return key.getState(state) ?? null; } }
  });
}
