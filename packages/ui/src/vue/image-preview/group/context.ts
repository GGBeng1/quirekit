import type { InjectionKey } from "vue";
import type { ImagePreviewGroupContext } from "./types";

/** Only explicit adapters opt an Image into a containing group. */
export const imagePreviewGroupKey: InjectionKey<ImagePreviewGroupContext | null> = Symbol("quirekit.image-preview-group");
