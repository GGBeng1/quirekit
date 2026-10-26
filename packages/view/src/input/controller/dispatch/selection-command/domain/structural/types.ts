import type {
  QuireDocumentSelectionCommandRoute,
  QuireNodeSelectionCommandRoute,
  QuireTableCellsSelectionCommandRoute
} from "@quirekit/view-engine";

/** Structural selection command routes owned by the structural domain. */
export type QuireStructuralSelectionCommandRoute =
  | QuireTableCellsSelectionCommandRoute
  | QuireNodeSelectionCommandRoute
  | QuireDocumentSelectionCommandRoute;
