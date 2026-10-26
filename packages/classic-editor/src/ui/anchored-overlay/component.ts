import type {
  DefineSetupFnComponent,
  SlotsType
} from "vue";
import AnchoredOverlay from "./anchored-overlay.vue";
import type {
  ClassicEditorAnchoredOverlayProps,
  ClassicEditorAnchoredOverlaySlots
} from "./types";

type ClassicEditorAnchoredOverlayEmits = {
  "update:show": (show: boolean) => void;
};

/** Public headless anchored overlay with a stable TypeScript declaration boundary. */
export const ClassicEditorAnchoredOverlay = AnchoredOverlay as unknown as DefineSetupFnComponent<
  ClassicEditorAnchoredOverlayProps,
  ClassicEditorAnchoredOverlayEmits,
  SlotsType<ClassicEditorAnchoredOverlaySlots>
>;
