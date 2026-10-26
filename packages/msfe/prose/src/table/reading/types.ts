/** Reading relationships derived from a confirmed table, without a second text model. */
export interface TableReadingModel {
  /** Header and body row source starts, excluding the source delimiter line. */
  readonly rows: readonly number[];
  /** Native source start to one-based semantic row index. */
  readonly indexes: ReadonlyMap<number, number>;
  /** Semantic column count. */
  readonly columns: number;
}
