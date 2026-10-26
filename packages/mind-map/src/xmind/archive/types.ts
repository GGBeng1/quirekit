/** Detached archive with bounded entry reads; no host filesystem access. */
export interface XmindArchive {
  /** Canonical content payload. */ readonly source: string;
  /** Legacy XML discriminator. */ readonly xml: boolean;
  /** Optional legacy style table. */ readonly styles?: string;
  /** @param names - Referenced relative PNG paths. @returns Bounded inflated resources. */
  readResources(names: readonly string[]): ReadonlyMap<string, Uint8Array>;
}
