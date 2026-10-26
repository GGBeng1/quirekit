import type { ClassicEditorFontHubMessageKey, ClassicEditorText, ClassicEditorWebFontSource } from "@classic/types";
import type { useClassicFontHub } from "./use-font-hub";

/** Reactive business state shared by the Font Hub's task views. */
export type ClassicFontHubController = ReturnType<typeof useClassicFontHub>;

/** Localized Font Hub copy resolver. */
export type ClassicFontHubMessageResolver = (key: ClassicEditorFontHubMessageKey) => string;

/** Source-contributed text resolver. */
export type ClassicFontHubTextResolver = (value: ClassicEditorText) => string;

/** Configured source label resolver. */
export type ClassicFontHubSourceLabelResolver = (source: ClassicEditorWebFontSource) => string;
