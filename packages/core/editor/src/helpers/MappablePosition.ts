import type { MapResult, Transaction } from "@quirekit/pm";

/** Position object that can be mapped through ProseMirror transactions. */
export class MappablePosition {
  /** Absolute document position. */
  position: number;

  /**
   * Creates a mappable position.
   *
   * @param position - Absolute document position.
   */
  constructor(position: number) {
    this.position = position;
  }

  /**
   * Creates a mappable position from JSON.
   *
   * @param json - JSON object with a `position` property.
   * @returns Mappable position instance.
   */
  static fromJSON(json: { readonly position: number }): MappablePosition {
    return new MappablePosition(json.position);
  }

  /**
   * Serializes this position to JSON.
   *
   * @returns JSON representation.
   */
  toJSON(): { readonly position: number } {
    return {
      position: this.position
    };
  }
}

/** Result returned when a mappable position is mapped through a transaction. */
export interface GetUpdatedPositionResult {
  /** Updated mappable position. */
  readonly position: MappablePosition;
  /** ProseMirror mapping result, or null when no mapping was available. */
  readonly mapResult: MapResult | null;
}

/**
 * Maps a position through a transaction.
 *
 * @param position - Position to map.
 * @param transaction - Transaction whose mapping should be applied.
 * @returns Updated position and the underlying map result.
 */
export function getUpdatedPosition(
  position: MappablePosition,
  transaction: Transaction
): GetUpdatedPositionResult {
  const mapResult = transaction.mapping.mapResult(position.position);

  return {
    position: new MappablePosition(mapResult.pos),
    mapResult
  };
}

/**
 * Creates a mappable position from an absolute document position.
 *
 * @param position - Absolute document position.
 * @returns Mappable position instance.
 */
export function createMappablePosition(position: number): MappablePosition {
  return new MappablePosition(position);
}
