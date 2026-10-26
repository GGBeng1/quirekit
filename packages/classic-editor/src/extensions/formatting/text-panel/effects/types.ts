/** Independent paint-only effects supported by the text inspector. */
export type TextEffect = "outline" | "shadow" | "emboss" | "imprint";

/** Effective checkbox states; undefined denotes mixed selected values. */
export type TextEffectState = Readonly<Record<TextEffect, boolean | undefined>>;
