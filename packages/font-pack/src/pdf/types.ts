/** Binary font data accepted by the native PDF backend. */
export type QuirePortablePdfFontData = Uint8Array | ArrayBuffer;

/** Supported posture of one portable PDF font face. */
export type QuirePortablePdfFontStyle = "normal" | "italic";

/** Stable asset declaration published by the portable PDF font preset. */
export interface QuirePortablePdfFontAsset {
  /** Stable asset identifier passed to the application-owned loader. */
  readonly id:
    | "carlito-400-normal"
    | "carlito-400-italic"
    | "carlito-700-normal"
    | "carlito-700-italic"
    | "noto-serif-sc-400-normal"
    | "noto-serif-sc-700-normal"
    | "noto-sans-hans-400-normal"
    | "noto-sans-hans-700-normal"
    | "noto-sans-symbols-2-400-normal";
  /** File name exported under `@quirekit/font-pack/pdf/fonts/`. */
  readonly fileName: string;
  /** Physical OpenType family embedded in generated PDFs. */
  readonly family: string;
  /** Numeric CSS weight represented by this face. */
  readonly weight: number;
  /** CSS posture represented by this face. */
  readonly style: QuirePortablePdfFontStyle;
  /** Whether the PDF backend may subset this physical face. */
  readonly subset: boolean;
  /** Optional Unicode range used only as a negative candidate prefilter. */
  readonly unicodeRange?: string | undefined;
}

/**
 * Loads one package-declared portable PDF font asset.
 *
 * @param asset - Stable asset declaration selected by PDF font metadata.
 * @returns Complete static font bytes.
 */
export type QuirePortablePdfFontAssetLoader = (
  asset: QuirePortablePdfFontAsset
) => QuirePortablePdfFontData | Promise<QuirePortablePdfFontData>;

/** Factory options owned by the application composing PDF export. */
export interface QuirePortablePdfFontSourceOptions {
  /** Host loader that resolves a package asset to complete font bytes. */
  readonly loadAsset: QuirePortablePdfFontAssetLoader;
}

/**
 * Structurally compatible native PDF font source without a PDF package
 * dependency.
 */
export interface QuirePortablePdfFontSource {
  /** Stable font identifier. */
  readonly id: string;
  /** Physical font family embedded in the PDF. */
  readonly family: string;
  /** Logical families intentionally mapped without compatibility warnings. */
  readonly acceptedSubstitutions?: readonly string[] | undefined;
  /** Lazy complete-font loader invoked only when this face is selected. */
  readonly data: () =>
    QuirePortablePdfFontData | Promise<QuirePortablePdfFontData>;
  /** OpenType features disabled for stable PDF text encoding. */
  readonly features?: Readonly<Record<string, boolean>> | undefined;
  /** Whether the face may diagnose and serve as a generic fallback. */
  readonly fallback?: boolean | undefined;
  /** Optional Unicode range used only as a negative candidate prefilter. */
  readonly unicodeRange?: string | undefined;
  /** Numeric CSS weight represented by this face. */
  readonly weight: number;
  /** CSS posture represented by this face. */
  readonly style: QuirePortablePdfFontStyle;
  /** Whether the PDF backend may subset this face. */
  readonly subset: boolean;
}

/** Stable asset declaration published by the portable monospace preset. */
export interface QuirePortableMonoFontAsset extends Omit<QuirePortablePdfFontAsset, "id"> {
  /** Stable asset identifier passed to the application-owned loader. */
  readonly id:
    | "dejavu-sans-mono-400-normal"
    | "dejavu-sans-mono-400-italic"
    | "dejavu-sans-mono-700-normal"
    | "dejavu-sans-mono-700-italic";
}

/** Factory options for the portable monospace preset. */
export interface QuirePortableMonoFontSourceOptions {
  /**
   * Host loader that resolves a package asset to complete font bytes.
   *
   * @param asset - Monospace asset declaration.
   * @returns Complete static font bytes.
   */
  readonly loadAsset: (asset: QuirePortableMonoFontAsset) => QuirePortablePdfFontData | Promise<QuirePortablePdfFontData>;
}
