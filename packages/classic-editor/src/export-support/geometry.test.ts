import type { QuireEditor } from "@quirekit/core";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import { describe, expect, it } from "vitest";
import {
  defaultClassicEditorFixedLayoutPageGeometry,
  resolveClassicEditorFixedLayoutGeometry
} from "./geometry";

describe("Classic fixed-layout export geometry", () => {
  it("uses the single frozen A4 policy for generic documents", () => {
    const resolved = resolveClassicEditorFixedLayoutGeometry(
      createEditorShape("paragraph"),
      undefined
    );

    expect(resolved).toEqual({
      viewportRect: defaultClassicEditorFixedLayoutPageGeometry.pageRect,
      pageGeometry: defaultClassicEditorFixedLayoutPageGeometry
    });
    expect(Object.isFrozen(defaultClassicEditorFixedLayoutPageGeometry)).toBe(true);
    expect(defaultClassicEditorFixedLayoutPageGeometry.pageGap).toBe(16);
    expect(defaultClassicEditorFixedLayoutPageGeometry.bodyRect.x).toBe(96);
  });

  it("keeps Word page geometry document-owned", () => {
    const resolved = resolveClassicEditorFixedLayoutGeometry(
      createEditorShape("wordSection"),
      undefined
    );

    expect(resolved.pageGeometry).toBeUndefined();
    expect(resolved.viewportRect).toBe(
      defaultClassicEditorFixedLayoutPageGeometry.pageRect
    );
  });

  it("gives an explicit geometry exact priority for every document kind", () => {
    const explicit: QuirePageGeometry = {
      pageRect: { x: 2, y: 3, width: 400, height: 600 },
      bodyRect: { x: 12, y: 13, width: 380, height: 560 },
      pageGap: 18
    };

    for (const rootName of ["paragraph", "wordSection"]) {
      const resolved = resolveClassicEditorFixedLayoutGeometry(
        createEditorShape(rootName),
        explicit
      );
      expect(resolved.pageGeometry).toBe(explicit);
      expect(resolved.viewportRect).toBe(explicit.pageRect);
    }
  });
});

/**
 * Creates the minimal editor shape consumed by the geometry policy.
 *
 * @param rootName - First document child node name.
 * @returns QuireEditor-compatible policy fixture.
 */
function createEditorShape(rootName: string): QuireEditor {
  return {
    state: {
      doc: {
        firstChild: {
          type: { name: rootName }
        }
      }
    }
  } as unknown as QuireEditor;
}
