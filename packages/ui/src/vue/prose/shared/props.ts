import type { DefinedProseProps } from './types';

/**
 * Omits absent optional values while retaining explicit false, empty strings and zero.
 * @param props - Resolved adapter input.
 * @returns Present props, preserving the child component's own default resolution.
 */
export function definedProseProps<T extends object>(props: T): DefinedProseProps<T> {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as DefinedProseProps<T>;
}
