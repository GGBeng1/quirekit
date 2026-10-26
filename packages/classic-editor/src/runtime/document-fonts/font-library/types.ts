import type {
  ClassicEditorCustomWebFontSourceRecord,
  ClassicEditorStylesheetFontSourceRecord,
  ClassicEditorWebFontSource
} from "../../../types";

/** Mutable source registry owned by one mounted Classic font library. */
export interface ClassicWebFontSourceRegistry {
  /** All bundled and enabled source adapters by stable id. */
  readonly sources: Map<string, ClassicEditorWebFontSource>;
  /** Enabled declarative source records by stable id. */
  readonly customSources: Map<string, ClassicEditorCustomWebFontSourceRecord>;
  /** User-enabled static CSS snapshots. */
  readonly stylesheetSources: Map<string, ClassicEditorStylesheetFontSourceRecord>;
  /**
   * Reads a static CSS source without enabling it.
   * @param url - Direct stylesheet URL.
   * @param name - Optional display label.
   * @returns Validated snapshot.
   */
  inspectStylesheet(url: string, name?: string): Promise<ClassicEditorStylesheetFontSourceRecord>;
  /**
   * Enables a static snapshot without network requests.
   * @param record - Validated stylesheet record.
   */
  enableStylesheet(record: ClassicEditorStylesheetFontSourceRecord): void;
  /**
   * Loads and validates one descriptor without enabling it.
   *
   * @param descriptorUrl - User-supplied HTTPS descriptor URL.
   * @returns Persistable validated source record.
   */
  inspect(descriptorUrl: string): Promise<ClassicEditorCustomWebFontSourceRecord>;
  /**
   * Enables one validated custom source.
   *
   * @param record - Persistable validated source record.
   */
  enable(record: ClassicEditorCustomWebFontSourceRecord): void;
  /**
   * Removes one custom source adapter.
   *
   * @param sourceId - Stable custom source id.
   * @returns Whether a custom source was removed.
   */
  remove(sourceId: string): boolean;
}
