import type {
  QuireLayoutBox,
  QuireTableCellFragment
} from "../../src/layout/engine";
import { createQuireTestSubLayoutProjection } from "./sub-layout-projection";

const testCapabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

/**
 * Retains explicit provider-like identity on a low-level table-cell test box.
 *
 * Production code receives these facts from the provider host. This helper is
 * intentionally test-only so low-level pagination fixtures must declare the
 * same facts instead of exercising an identity-inference fallback.
 *
 * @param box - Low-level source cell box used by a pagination fixture.
 * @param cell - Table-cell fragment represented by the source box.
 * @returns Immutable box with one explicitly identified sub-layout projection.
 */
export function retainQuireTestTableCellSubLayoutIdentity(
  box: QuireLayoutBox,
  cell: QuireTableCellFragment
): QuireLayoutBox {
  const contentLayoutRect = cell.contentLayoutRect ?? cell.contentRect;
  const rootId = `root:test-table-cell:${cell.semanticCellId}`;
  const regionId = `region:test-table-cell:${cell.semanticCellId}`;
  const source = {
    sourceId: `test-table-cell:${cell.semanticCellId}`,
    range: cell.range
  };
  const region = {
    rootId: { value: rootId },
    regionId: { value: regionId },
    kind: "table-cell" as const
  };
  const existing = box.subLayoutFragments?.[0]?.subLayout;
  const geometryRoot = {
    ...(existing?.geometry.root ?? {
      id: `test-table-cell:${cell.semanticCellId}`,
      kind: "table-cell" as const,
      range: cell.range,
      placement: {
        parentId: cell.id,
        rect: cell.rect,
        contentRect: contentLayoutRect
      },
      localRect: {
        x: 0,
        y: 0,
        width: contentLayoutRect.width,
        height: contentLayoutRect.height
      },
      writingMode: "horizontal-tb" as const,
      dependencySignature: `test:${cell.semanticCellId}`
    })
  };
  const viewRoot = {
    ownership: {
      status: "resolved" as const,
      root: {
        id: { value: rootId },
        kind: "table-cell" as const,
        source,
        capabilities: testCapabilities
      },
      owner: {
        region,
        source,
        capabilities: testCapabilities
      }
    }
  };
  const projection = existing === undefined
    ? createQuireTestSubLayoutProjection({
        root: geometryRoot,
        resultId: `${cell.id}:test-source`,
        acceptedBand: { top: 0, bottom: contentLayoutRect.height },
        localToResult: {
          x: contentLayoutRect.x,
          y: contentLayoutRect.y
        },
        contentClip: contentLayoutRect,
        interactionClip: cell.contentRect,
        dependencySignature: geometryRoot.dependencySignature,
        viewRoot
      })
    : {
        ...existing,
        geometry: { ...existing.geometry, root: geometryRoot },
        view: { ...existing.view, root: viewRoot }
      };

  return {
    ...box,
    subLayoutFragments: [
      { subLayout: projection },
      ...(box.subLayoutFragments?.slice(1) ?? [])
    ]
  };
}
