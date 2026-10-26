import { readQuireTableCellSelection } from "../table/cell-selection";
import { NodeSelection } from "@quirekit/pm";
import { isQuireRetainedLayerContributionActive } from "../../editor-layout/layer-contribution/activation";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import { createQuireInteractionGeometryAuthority } from "../geometry";
import { buildQuireTableSelectionRangeGeometries } from "../table";
import {
  buildQuireStructuredRangeSelectionGeometries
} from "./structured-range/geometry";
import {
  QuireStructuredRangeSelection
} from "./structured-range";
import type {
  QuireSelectionGeometry,
  QuireSelectionGeometryOptions
} from "../types";

/**
 * Builds canvas geometry for the current editor selection in a layout snapshot.
 *
 * @param options - Layout snapshot and caret options for selection mapping.
 * @returns Canvas selection geometry for the snapshot selection.
 */
export function buildQuireSelectionGeometry(
  options: QuireSelectionGeometryOptions
): QuireSelectionGeometry {
  const { snapshot } = options;
  const geometryAuthority = createQuireInteractionGeometryAuthority({ snapshot });
  const { selection } = snapshot.state.pm;

  const cellSelection = readQuireTableCellSelection(selection);
  if (cellSelection !== null) {
    return {
      carets: [],
      ranges: buildQuireTableSelectionRangeGeometries({ snapshot, selection: cellSelection })
    };
  }

  if (selection instanceof QuireStructuredRangeSelection) {
    return {
      carets: [],
      ranges: buildQuireStructuredRangeSelectionGeometries({
        snapshot,
        selection,
        ...(options.selectionContext === undefined
          ? {}
          : { selectionContext: options.selectionContext })
      })
    };
  }

  if (
    selection instanceof NodeSelection
    && hasActiveSelectedOwnerPresentation(snapshot)
  ) {
    return { carets: [], ranges: [] };
  }

  if (selection.empty) {
    const caret = geometryAuthority.caretAtPosition(
      selection.from,
      options.caretWidth,
      options.selectionContext
    );

    return {
      carets: caret === null
        ? []
        : [
            {
              position: caret.position,
              rect: caret.rect,
              ...(caret.queryOwner === undefined
                ? {}
                : { queryOwner: caret.queryOwner })
            }
          ],
      ranges: []
    };
  }

  return {
    carets: [],
    ranges: geometryAuthority.selectionRects({
      from: selection.from,
      to: selection.to
    }, options.selectionContext).ranges
  };
}

/**
 * Reports whether an exact node selection already has owner-drawn chrome.
 *
 * Generic range paint must stay out of this state: object controls are the
 * visual selection authority, while text-range geometry remains available for
 * ordinary node selections that do not provide their own selected product.
 *
 * @param snapshot - Layout snapshot carrying selection-activated products.
 * @returns Whether one exact selected-owner product is active.
 */
function hasActiveSelectedOwnerPresentation(
  snapshot: QuireLayoutSnapshot
): boolean {
  return (snapshot.layerContributions ?? []).some((contribution) =>
    contribution.activation?.kind === "selected-owner"
    && isQuireRetainedLayerContributionActive(contribution, snapshot.state)
  );
}
