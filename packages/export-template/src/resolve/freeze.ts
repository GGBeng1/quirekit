/** @param value - Fresh serializable configuration. @returns Deeply immutable value. */
export function freezeTemplate<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeTemplate); Object.freeze(value); }
  return value;
}
