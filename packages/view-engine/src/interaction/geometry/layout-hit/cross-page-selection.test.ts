import { describe, expect, it } from "vitest";
import { paginateQuireLayoutDocument } from "../../../layout";
import { adaptQuireLayoutDocumentToSnapshot } from "../../../editor-layout";

import type { QuireLayoutSnapshot } from "../../../editor-layout";
import {
  createLayoutDocument,
  createLineFragments,
  createPageGeometry
} from "../../../../test-support/layout/pagination";
import { hitTestExactQuireLayoutSnapshot } from ".";

/**
 * Builds a two-page snapshot whose single paragraph straddles the page break.
 *
 * @returns Adapted layout snapshot for the straddling paragraph fixture.
 */
function createStraddlingParagraphSnapshot(): QuireLayoutSnapshot {
  const document = createLayoutDocument([
    {
      id: "paragraph-0",
      from: 1,
      to: 13,
      y: 0,
      height: 96,
      textFragments: createLineFragments({ lineCount: 4, y: 0 })
    }
  ]);
  const paginated = paginateQuireLayoutDocument({
    document,
    pageGeometry: createPageGeometry(48)
  });

  return adaptQuireLayoutDocumentToSnapshot({
    state: {} as QuireLayoutSnapshot["state"],
    document: paginated,
    viewportRect: { x: 0, y: 0, width: 600, height: 1600 }
  });
}

describe("canvas cross-page paragraph selection", () => {
  it("hit-tests page-1 lines of a straddling paragraph to a position inside it", () => {
    const result = hitTestExactQuireLayoutSnapshot({
      snapshot: createStraddlingParagraphSnapshot(),
      point: { x: 50, y: 60 }
    });

    expect(result.kind).toBe("position");
    if (result.kind !== "position") {
      return;
    }
    expect(result.position.pos).toBeGreaterThanOrEqual(1);
    expect(result.position.pos).toBeLessThanOrEqual(13);
    expect(result.rect.y).toBeGreaterThanOrEqual(50);
    expect(result.rect.y).toBeLessThan(800);
  });

  it("hit-tests page-2 continuation lines of a straddling paragraph to a position inside it", () => {
    const result = hitTestExactQuireLayoutSnapshot({
      snapshot: createStraddlingParagraphSnapshot(),
      point: { x: 50, y: 860 }
    });

    expect(result.kind).toBe("position");
    if (result.kind !== "position") {
      return;
    }
    expect(result.position.pos).toBeGreaterThanOrEqual(1);
    expect(result.position.pos).toBeLessThanOrEqual(13);
    expect(result.rect.y).toBeGreaterThanOrEqual(800);
  });

  it("selects across the page break when dragging from page 1 into page 2", () => {
    const snapshot = createStraddlingParagraphSnapshot();
    const anchor = hitTestExactQuireLayoutSnapshot({
      snapshot,
      point: { x: 50, y: 60 }
    });
    const head = hitTestExactQuireLayoutSnapshot({
      snapshot,
      point: { x: 50, y: 884 }
    });

    expect(anchor.kind).toBe("position");
    expect(head.kind).toBe("position");
    if (anchor.kind !== "position" || head.kind !== "position") {
      return;
    }

    expect(anchor.rect.y).toBeLessThan(800);
    expect(head.rect.y).toBeGreaterThanOrEqual(800);
    expect(head.position.pos).toBeGreaterThan(anchor.position.pos);
    expect(anchor.position.pos).toBeGreaterThanOrEqual(1);
    expect(head.position.pos).toBeLessThanOrEqual(13);
  });
});
