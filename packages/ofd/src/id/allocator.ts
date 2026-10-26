/** Deterministic positive identifier allocator for one OFD document. */
export class OFDIdAllocator {
  private nextValue = 1n;

  /**
   * Allocates the next positive identifier.
   *
   * @returns Decimal identifier token.
   */
  allocate(): string {
    const value = this.nextValue;
    this.nextValue += 1n;
    return value.toString(10);
  }

  /**
   * Returns the greatest allocated identifier.
   *
   * @returns Decimal maximum identifier, or `0` before allocation.
   */
  maximum(): string {
    return (this.nextValue - 1n).toString(10);
  }
}
