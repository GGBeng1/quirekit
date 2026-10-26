/** Feature-owned declaration about the render impact of one complete transaction. */
export interface QuireTransactionRenderImpact {
  /**
   * Only transient presentation changes; document and all layout sources remain
   * unchanged. Consumers must still verify transaction and layout dependencies.
   */
  readonly kind: "presentation-only";
}

/** Transient intent of keyboard-like selection navigation with a fixed anchor. */
export interface QuireSelectionNavigation {
  /** Logical PM head movement: decreasing (-1) or increasing (1), not screen direction. */
  readonly direction: -1 | 1;
}
