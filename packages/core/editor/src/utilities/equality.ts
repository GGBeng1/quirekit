/** Mark shape accepted from JSON content or ProseMirror marks. */
export interface MarkLike {
  /** Mark name or mark type carrying a name. */
  readonly type: string | { readonly name: string };
  /** Optional mark attributes. */
  readonly attrs?: Readonly<Record<string, any>> | null | undefined;
}

/**
 * Compares two optional attribute records using own-key and `Object.is` semantics.
 *
 * @param left - First attribute record.
 * @param right - Second attribute record.
 * @returns Whether both records contain the same own keys and values.
 */
export function attrsEqual(
  left: Readonly<Record<string, any>> | null | undefined,
  right: Readonly<Record<string, any>> | null | undefined
): boolean {
  if (left === right) return true;
  if (left == null || right == null) return false;
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => (
    Object.prototype.hasOwnProperty.call(right, key)
    && Object.is(left[key], right[key])
  ));
}

/**
 * Compares mark collections without depending on their array order.
 *
 * @param left - First mark collection.
 * @param right - Second mark collection.
 * @returns Whether both collections contain the same named marks and attributes.
 */
export function marksEqual(
  left: readonly MarkLike[],
  right: readonly MarkLike[]
): boolean {
  if (left.length !== right.length) return false;
  const unmatched = [...right];
  for (const candidate of left) {
    const candidateName = resolveMarkName(candidate);
    const index = unmatched.findIndex((entry) => (
      resolveMarkName(entry) === candidateName
      && attrsEqual(entry.attrs, candidate.attrs)
    ));
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return true;
}

/** @param mark - Mark whose type name should be read. @returns Stable mark name. */
function resolveMarkName(mark: MarkLike): string {
  return typeof mark.type === "string" ? mark.type : mark.type.name;
}
