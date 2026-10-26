import type { Transaction } from "@quirekit/pm";

/** Result returned when the tracker maps a position. */
export interface TrackerResult {
  /** Mapped document position. */
  readonly position: number;
  /** Whether the mapped range was deleted by any tracked step. */
  readonly deleted: boolean;
}

/** Tracks positions through steps appended to a transaction after construction. */
export class Tracker {
  /** Transaction being tracked. */
  readonly transaction: Transaction;

  /** Step index captured when the tracker was created. */
  readonly currentStep: number;

  /**
   * Creates a transaction tracker.
   *
   * @param transaction - Transaction whose future steps should be tracked.
   */
  constructor(transaction: Transaction) {
    this.transaction = transaction;
    this.currentStep = this.transaction.steps.length;
  }

  /**
   * Maps a position through steps appended after the tracker was created.
   *
   * @param position - Position to map.
   * @returns Mapped position and deletion flag.
   */
  map(position: number): TrackerResult {
    let deleted = false;
    const mappedPosition = this.transaction.steps
      .slice(this.currentStep)
      .reduce((newPosition, step) => {
        const mapResult = step.getMap().mapResult(newPosition);

        if (mapResult.deleted) {
          deleted = true;
        }

        return mapResult.pos;
      }, position);

    return {
      position: mappedPosition,
      deleted
    };
  }
}
