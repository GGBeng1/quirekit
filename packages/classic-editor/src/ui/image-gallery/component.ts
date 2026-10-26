import type {
  DefineSetupFnComponent,
  SlotsType
} from "vue";
import ImageGallery from "./image-gallery.vue";
import type {
  ClassicEditorImageGalleryProps,
  ClassicEditorImageGallerySlots
} from "./types";

type ClassicEditorImageGalleryEmits = {
  "update:show": (show: boolean) => void;
  "update:activeIndex": (activeIndex: number) => void;
};

/** Public image-gallery component with a stable TypeScript declaration boundary. */
export const ClassicEditorImageGallery = ImageGallery as unknown as
DefineSetupFnComponent<
  ClassicEditorImageGalleryProps,
  ClassicEditorImageGalleryEmits,
  SlotsType<ClassicEditorImageGallerySlots>
>;
