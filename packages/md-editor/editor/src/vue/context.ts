import type { InjectionKey, Ref, ShallowRef } from "vue";
import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import type { PreviewEditRequest } from "@quirekit/msfe-markdown-extras";
import type { MdEditorLocale } from "./types";

/** Existing Vue ancestry supplies source access only to the product's action controls. */
export const mdEditorKey: InjectionKey<ShallowRef<MsfeEditor | undefined>> = Symbol("mdEditor");
/** Product locale inherited by source-bound Teleports. */
export const mdLocaleKey: InjectionKey<Readonly<ShallowRef<MdEditorLocale>>> = Symbol("mdLocale");
/** Product controls share the editor's existing layout breakpoint subscription. */
export const mdNarrowKey: InjectionKey<Readonly<Ref<boolean>>> = Symbol("mdNarrow");
/** Source-bound images open the product's existing destination dialog. */
export const mdImageEditKey: InjectionKey<(range: MsfeSourceRange) => void> = Symbol("mdImageEdit");
/** Formula and text-diagram previews open the product's existing source editing dialog. */
export const mdPreviewEditKey: InjectionKey<(request: PreviewEditRequest) => boolean> = Symbol("mdPreviewEdit");
