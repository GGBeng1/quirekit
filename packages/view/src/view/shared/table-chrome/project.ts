import type {
  QuireTableChromeAnchor,
  QuireTableChromeModel,
  QuireViewCoordinateAuthority
} from "@quirekit/view-engine";
import type {
  QuireMountedTableChromeAnchor,
  QuireMountedTableChromeModel
} from "./types";

/**
 * Projects retained document-space Table chrome into browser viewport space.
 *
 * @param model - Headless Table chrome derived from retained layout.
 * @param authority - Mounted surface coordinate authority.
 * @returns Viewport-projected Table chrome.
 */
export function projectMountedTableChromeModel(
  model: QuireTableChromeModel,
  authority: QuireViewCoordinateAuthority
): QuireMountedTableChromeModel {
  return {
    ...model,
    fragments: model.fragments.map((fragment) => ({
      fragmentId: fragment.fragmentId,
      tableRect: authority.clientRectFromDocument(fragment.tableRect),
      guides: (fragment.guides ?? []).map((guide) => ({
        ...guide,
        rect: authority.clientRectFromDocument(guide.rect)
      })),
      corner: projectAnchor(fragment.corner, authority),
      rows: fragment.rows.map((anchor) => projectAnchor(anchor, authority)),
      columns: fragment.columns.map((anchor) =>
        projectAnchor(anchor, authority)
      ),
      insertions: fragment.insertions.map((anchor) =>
        projectAnchor(anchor, authority)
      ),
      resizes: fragment.resizes.map((anchor) =>
        projectAnchor(anchor, authority)
      ),
      menu: projectAnchor(fragment.menu, authority)
    }))
  };
}

/**
 * Projects one document-space Table anchor into viewport space.
 *
 * @param anchor - Retained Table anchor.
 * @param authority - Mounted surface coordinate authority.
 * @returns Viewport-projected anchor.
 */
function projectAnchor(
  anchor: QuireTableChromeAnchor,
  authority: QuireViewCoordinateAuthority
): QuireMountedTableChromeAnchor {
  return {
    ...anchor,
    rect: authority.clientRectFromDocument(anchor.rect)
  };
}
