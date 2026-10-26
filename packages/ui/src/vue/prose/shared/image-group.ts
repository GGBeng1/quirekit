import type { InjectionKey } from "vue";
import type { ImagePreviewGroupContext } from "../../image-preview/group/types";

/** Prose images opt in; ordinary interactive Image demos do not join the article. */
export const proseImageGroupKey: InjectionKey<ImagePreviewGroupContext> = Symbol("quirekit.prose-images");
