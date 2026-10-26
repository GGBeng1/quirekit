import { moveMathCommand } from '@quirekit/math';

/**
 * Moves between actual tile centers, including wide presets that span several columns.
 * @param buttons - Visible choices in their catalog order.
 * @param current - Current catalog index.
 * @param key - One directional arrow key.
 * @returns Nearest choice in the requested visual direction, or the retained index.
 */
export function moveFormulaChoice(buttons: readonly Element[], current: number, key: string): number {
  return moveMathCommand(buttons.map(button => button.getBoundingClientRect()), current, key);
}
