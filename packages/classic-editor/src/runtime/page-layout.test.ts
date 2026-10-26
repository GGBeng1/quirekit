import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { readClassicEditorPageLayout } from "./page-layout";

/** @param y - Top. @param height - Height. @returns Rectangle across the body width. */
const rect = (y: number, height: number) => ({ x: 100, y, width: 400, height });

/**
 * @param doc - Source document the snapshot claims.
 * @returns Snapshot with two pages, bodies 100–900 and 1100–1900, and a footer line at 920.
 */
function snapshot(doc: object): QuireLayoutSnapshot {
  const fragment = (y: number) => ({ rect: rect(y, 20), lineHeight: 20 });
  return {
    state: { pm: { doc } },
    pages: [
      { pageIndex: 0, range: { from: 0, to: 40 }, pageRect: rect(0, 1000), bodyRect: rect(100, 800) },
      { pageIndex: 1, range: { from: 40, to: 60 }, pageRect: rect(1000, 1000), bodyRect: rect(1100, 800) }
    ],
    root: { rect: rect(0, 2000), children: [
      { rect: rect(100, 400), textFragments: [fragment(100), fragment(480)] },
      { rect: rect(920, 20), textFragments: [fragment(920)] },
      { rect: rect(1100, 60), children: [{ rect: rect(1100, 60) }] }
    ] }
  } as unknown as QuireLayoutSnapshot;
}

describe("readClassicEditorPageLayout", () => {
  it("reports each page's range and the lowest body content, leaving out the footer", () => {
    const doc = {};
    expect(readClassicEditorPageLayout(snapshot(doc), doc as never)).toEqual([
      { from: 0, to: 40, bodyTop: 100, bodyBottom: 900, contentBottom: 500 },
      { from: 40, to: 60, bodyTop: 1100, bodyBottom: 1900, contentBottom: 1160 }
    ]);
  });

  it("returns null before a layout of the given document is rendered", () => {
    expect(readClassicEditorPageLayout(snapshot({}), {} as never)).toBeNull();
    expect(readClassicEditorPageLayout(undefined, {} as never)).toBeNull();
  });
});
