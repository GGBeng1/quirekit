import type { MathDocument } from '../model/types';
import { getMathVisualSlots } from '../visual/slots';

/**
 * Enters the first inserted empty slot, including limits that precede the operand marker.
 * @param document - Complete reparsed edit.
 * @param start - Inserted source start.
 * @param length - Inserted source length.
 * @param fallback - Marker/end offset when all template roles are filled.
 * @returns Exact safe source caret.
 */
export function mathTemplateCaret(document: MathDocument, start: number, length: number, fallback: number): number {
  return getMathVisualSlots(document).find(slot => !slot.sequence.children.length && slot.from >= start && slot.to <= start + length)?.from ?? fallback;
}
