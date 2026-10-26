/** Quiet surface treatments for independent content. */
export type QuireKitCardVariant = 'outline' | 'soft' | 'plain' | 'raised';
/** Container padding density, independent of single-line control heights. */
export type QuireKitCardDensity = 'compact' | 'comfortable';
/** Public static content container; interaction belongs to its slotted controls. */
export interface QuireKitCardProps {
  /** Native content semantics. Named sections and articles use the automatic title when available. */
  readonly as?: 'div' | 'article' | 'section';
  /** Automatic header title, replaced by the title slot. */
  readonly title?: string;
  /** Supporting copy below the title, replaced by the description slot. */
  readonly description?: string;
  /** Heading level chosen by the document hierarchy; p opts out of heading semantics. */
  readonly titleAs?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  /** Surface and outline treatment, without implicit hover or elevation. */
  readonly variant?: QuireKitCardVariant;
  /** Shared semantic container spacing; does not resize nested controls. */
  readonly density?: QuireKitCardDensity;
  /** Add inset separators between present header, body and footer regions. */
  readonly divided?: boolean;
}
