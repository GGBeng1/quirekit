/** Supported feature languages; regional tags resolve to one of these catalogues. */
export type FlowEditorLocale = "zh-CN" | "en";
/** Named, literal substitutions; user values are never translated. */
export type FlowMessageValues = Readonly<Record<string, string | number>>;
