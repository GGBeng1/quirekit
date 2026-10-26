/** Bundled Block Editor interface languages; document content is language independent. */
export type BlockEditorLocale = "zh-CN" | "en";

/** Explicit, presentation-only notification for one editor instance. */
export type BlockLocaleListener = (locale: BlockEditorLocale) => void;

/** Named interpolation values in interface messages. */
export type BlockTextValues = Readonly<Record<string, string | number>>;
