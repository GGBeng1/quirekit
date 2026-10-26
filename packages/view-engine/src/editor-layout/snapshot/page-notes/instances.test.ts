import { Schema } from "@quirekit/pm";
import type { QuirePageFragment, QuirePageNote } from "@quirekit/layout/pagination";
import { describe, expect, it } from "vitest";
import { createTestPageModel, createTestPageSection } from "../../../../test-support/document-profile/page-model";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { attachQuirePageFootnoteInstances } from "./instances";
import { attachQuirePageEndnoteInstances } from "./endnote-instances";
import type { QuirePageFootnoteSourceLayout } from "./types";

const schema = new Schema({ nodes: { doc: { content: "text*" }, text: {} } });
const bodyRect = { x: 40, y: 40, width: 320, height: 320 };
const first = { id: "first", offset: 0, height: 20, continuation: false };
const second = { id: "second", offset: 0, height: 20, continuation: false };

describe("page note occurrence placement", () => {
  it("places page-bottom notes in source order and preserves existing page facts", () => {
    const options = fixture({ notes: [first, second], noteAreaHeight: 50,
      noteSeparators: [{ x: 1, y: 2, width: 3, height: 4 }], noteRanges: [{ from: 1, to: 2 }] });
    const before = structuredClone(options.layoutDocument);
    const result = attachQuirePageFootnoteInstances(options);
    expect(result.children.map(child => child.rect)).toEqual([
      { x: 40, y: 320, width: 120, height: 20 },
      { x: 40, y: 340, width: 120, height: 20 }
    ]);
    expect(result.pages[0]?.noteSeparators).toEqual([
      { x: 1, y: 2, width: 3, height: 4 }, { x: 40, y: 314, width: 80, height: 2 }
    ]);
    expect(result.pages[0]?.noteRanges).toEqual([{ from: 1, to: 2 }, { from: 101, to: 111 }, { from: 121, to: 131 }]);
    expect(result.children.map(child => child.id)).toEqual(["first:page:0:first", "second:page:0:second"]);
    expect(options.layoutDocument).toEqual(before);
  });

  it("places continued column notes at the reserved page bottom", () => {
    const continued = { ...second, continuation: true };
    const options = fixture({ noteAreaBottom: 380, columns: [
      { columnIndex: 0, range: { from: 1, to: 2 }, rect: bodyRect,
        bodyRect: { x: 40, y: 40, width: 150, height: 200 }, notes: [first], noteAreaHeight: 30 },
      { columnIndex: 1, range: { from: 2, to: 3 }, rect: bodyRect,
        bodyRect: { x: 210, y: 40, width: 150, height: 200 }, notes: [continued], noteAreaHeight: 40 }
    ] });
    const result = attachQuirePageFootnoteInstances(options);
    expect(result.children.map(child => child.rect)).toEqual([
      { x: 40, y: 360, width: 120, height: 20 }, { x: 210, y: 360, width: 120, height: 20 }
    ]);
    expect(result.pages[0]?.noteSeparators).toEqual([
      { x: 40, y: 354, width: 80, height: 2 }, { x: 210, y: 349, width: 150, height: 2 }
    ]);
  });

  it("uses explicit endnote areas, clips continued content, and retains physical page identity", () => {
    const options = fixture({ pageIndex: 3, endNoteAreas: [
      { rect: { x: 20, y: 450, width: 60, height: 30 }, notes: [first], continuation: false },
      { rect: { x: 20, y: 600, width: 180, height: 30 },
        notes: [{ ...second, offset: 10, height: 10, continuation: true }], continuation: true }
    ] });
    const result = attachQuirePageEndnoteInstances(options);
    expect(result.children.map(child => child.rect)).toEqual([
      { x: 20, y: 460, width: 120, height: 20 }, { x: 20, y: 620, width: 120, height: 10 }
    ]);
    expect(result.pages[0]?.noteSeparators).toEqual([
      { x: 20, y: 454, width: 60, height: 2 }, { x: 20, y: 609, width: 180, height: 2 }
    ]);
    expect(result.children[1]).toMatchObject({ id: "second:page:3:second", range: { from: 126, to: 131 },
      children: [{ id: "second-line-1:page:3:second", rect: { y: 620, height: 10 } }] });
  });

  it.each(["footnote", "endnote"] as const)("ignores missing %s sources without adding phantom height", kind => {
    const missing: QuirePageNote = { ...first, id: "missing", height: 200 };
    const options = fixture({ notes: [missing, first], noteAreaHeight: 30,
      endNoteAreas: [{ rect: { x: 40, y: 330, width: 320, height: 30 }, notes: [missing, first], continuation: false }] });
    const result = (kind === "footnote" ? attachQuirePageFootnoteInstances : attachQuirePageEndnoteInstances)(options);
    expect(result.children).toHaveLength(1);
    expect(result.children[0]?.rect.y).toBe(340);
  });

  it("reuses documents without notes and preserves explicit empty endnote areas", () => {
    const options = fixture({});
    expect(attachQuirePageFootnoteInstances(options)).toBe(options.layoutDocument);
    expect(attachQuirePageEndnoteInstances(options)).toBe(options.layoutDocument);
    const empty = fixture({ endNoteAreas: [] });
    expect(attachQuirePageEndnoteInstances(empty)).not.toBe(empty.layoutDocument);
    expect(attachQuirePageEndnoteInstances(empty).pages[0]).toMatchObject({ noteRanges: [], noteSeparators: [] });
    expect(attachQuirePageEndnoteInstances({ ...empty, sources: [] })).toBe(empty.layoutDocument);
  });
});

/**
 * Creates two measured note sources and a page with explicit placement facts.
 * @param page - Placement facts to overlay on a deterministic body page.
 * @returns Services and immutable source products for either note attachment path.
 */
function fixture(page: Partial<QuirePageFragment>) {
  const layoutDocument: QuireLayoutDocument = {
    id: "document", range: { from: 0, to: 140 }, rect: bodyRect, children: [], anchors: [],
    anchorOccurrenceGaps: [], anchorPlacementGaps: [], hitTargets: [],
    anchorRegionProducts: { roots: [], regions: [], hitTargets: [], layerContributions: [], selectionPolicies: [], gaps: [] },
    pages: [{ pageIndex: 0, range: { from: 1, to: 20 }, pageRect: { x: 0, y: 0, width: 400, height: 400 },
      bodyRect, rect: bodyRect, endInfo: { openMarks: [], openNodes: [] }, ...page }]
  };
  const sources: QuirePageFootnoteSourceLayout[] = [first, second].map((note, index) => {
    const from = 101 + index * 20;
    return { noteId: note.id, storyId: note.id, referencePosition: index + 1, anchors: [], sourceCapabilities: [],
      layout: { id: note.id, range: { from, to: from + 10 }, rect: { x: 0, y: 0, width: 120, height: 20 },
        children: [0, 1].map(line => ({ id: `${note.id}-line-${line}`, range: { from: from + line * 5, to: from + (line + 1) * 5 },
          rect: { x: 0, y: line * 10, width: 120, height: 10 } })) } };
  });
  return { layoutDocument, documentNode: schema.node("doc"), sources, section: createTestPageSection(1),
    separatorHeight: 10, continuationSeparatorHeight: 20, pageCount: 4,
    textMeasurer: { /** @returns Deterministic advance for these non-text fixtures. */ measureText() { return { width: 0 }; } },
    pageModel: { ...createTestPageModel(), footnoteSeparator: { length: 80, lineWidth: 2 } } };
}
