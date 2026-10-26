import type {
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../../view-graph";

export const quireInteractionSnapshotPassThroughPolicy: QuireViewPointerPolicy = {
  kind: "pass-through",
  shouldFocusEditor: false,
  shouldPreventDefault: false
};

export const quireSelectionInteractionLayer: QuireViewLayerRef = {
  plane: "selection",
  zIndex: 10
};

export const quireAnnotationInteractionLayer: QuireViewLayerRef = {
  plane: "annotation"
};
