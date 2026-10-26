/** Theme-derived loading placeholder configuration. */
export interface QuireKitSkeletonTokens {
  /** Quiet placeholder fill. */
  readonly background: string;
  /** Default line placeholder height. */
  readonly lineHeight: string;
  /** Default rectangular corner geometry. */
  readonly radius: string;
  /** Full pulse cycle; reduced motion disables the animation. */
  readonly duration: string;
  /** Shared easing for decorative intensity changes. */
  readonly easing: string;
  /** Muted end of the pulse, derived from theme opacity. */
  readonly minimumOpacity: number;
  /** Full intensity at the pulse ends. */
  readonly maximumOpacity: number;
}
