import type { Editor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import type { Node } from "@quirekit/pm";
import type { BlockActionTarget } from "../ui/blocks/types";
import type { BlockSection } from "./types";

const cache = new WeakMap<Node, readonly BlockSection[]>();
/** @param doc - Immutable document. @returns Linear-time outline boundaries, cached for selection-only transactions. */
export function readSections(doc: Node): readonly BlockSection[] {
  const cached = cache.get(doc); if (cached) return cached;
  const result: BlockSection[] = [], stack: number[] = [];
  doc.forEach((node, from) => {
    if (node.type.name !== "heading" || !node.attrs.blockId) return;
    const level = Number(node.attrs.level);
    while (stack.length && result[stack.at(-1)!]!.level >= level) {
      const index = stack.pop()!; result[index] = { ...result[index]!, to: from };
    }
    stack.push(result.length);
    result.push({ id: node.attrs.blockId, from, body: from + node.nodeSize, to: doc.content.size, level });
  });
  cache.set(doc, result); return result;
}

/** @param editor - Canonical document owner. @param id - Heading identity. @returns Current complete chapter target, using the existing scope authority. */
export function sectionTarget(editor: Editor, id: string): BlockActionTarget | null {
  const catalog = readBlockCatalog(editor), section = readSections(editor.state.doc).find(item => item.id === id);
  if (!catalog || !section) return null;
  const blocks = catalog.blocks.filter(block => block.from >= section.from && block.to <= section.to);
  const first = blocks[0], last = blocks.at(-1);
  if (!first || !last || first.from !== section.from || last.to !== section.to) return null;
  return { block: first, blocks, range: { anchor: first, focus: last, expectedDocumentRevision: catalog.revision } };
}

/** @param sections - Current outline. @param section - Source chapter. @param direction - Requested sibling. @returns Adjacent same-level chapter without crossing a parent boundary. */
export function sectionSibling(sections: readonly BlockSection[], section: BlockSection, direction: "up" | "down"): BlockSection | undefined {
  const step = direction === "up" ? -1 : 1;
  for (let i = sections.indexOf(section) + step; i >= 0 && i < sections.length; i += step) {
    const candidate = sections[i]!;
    if (candidate.level < section.level) return undefined;
    if (candidate.level === section.level) return candidate;
  }
  return undefined;
}
