/** Existing semantic gaps; zero deliberately joins items without adding a new scale. */
export type QuireKitSpaceGap = 0 | 'inlineTight' | 'inline' | 'surfaceCompact' | 'surface' | 'group' | 'section';
/** Arrangement of the slotted elements. */
export type QuireKitSpaceOrientation = 'horizontal' | 'vertical';
/** Cross-axis alignment; start/end follow the inherited writing direction. */
export type QuireKitSpaceAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
/** Main-axis distribution, retaining gap as the minimum distance. */
export type QuireKitSpaceJustify = 'start' | 'center' | 'end' | 'between';
/** Layout-only composition; child components retain their semantics and state. */
export interface QuireKitSpaceProps {
  /** Native root element. List roots require li children; named regions need a label. */
  readonly as?: 'div' | 'span' | 'section' | 'nav' | 'ul' | 'ol';
  /** Main layout direction. Defaults to horizontal. */
  readonly orientation?: QuireKitSpaceOrientation;
  /** Semantic distance between siblings. Defaults to inline. */
  readonly gap?: QuireKitSpaceGap;
  /** Physical row gap, independently overriding gap in either orientation. */
  readonly rowGap?: QuireKitSpaceGap;
  /** Physical column gap, independently overriding gap in either orientation. */
  readonly columnGap?: QuireKitSpaceGap;
  /** Cross-axis alignment. Defaults to center horizontally and stretch vertically. */
  readonly align?: QuireKitSpaceAlign;
  /** Main-axis distribution. Defaults to start. */
  readonly justify?: QuireKitSpaceJustify;
  /** Allow horizontal rows to wrap. Defaults to true; ignored vertically. */
  readonly wrap?: boolean;
  /** Fill the available inline width instead of fitting the content. Defaults to false. */
  readonly block?: boolean;
}
