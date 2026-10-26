/** One owned resource; each acquisition must return its own lease. */
export interface ResourceLease<T> {
  /** Consumer value, never automatically persisted in Markdown. */
  readonly value: T;
  /** Releases this acquisition, including a result arriving after cancellation. */
  readonly release?: () => void;
}
