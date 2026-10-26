import type { MathDocument } from '../model/types';
import { getMathVisualSlots } from './slots';
import type { MathCaret, MathVisualDirection, MathVisualSelection, MathVisualSlot } from './types';

/**
 * Moves through structural slots rather than command characters or delimiters.
 * @param document - Complete formula.
 * @param selection - Current endpoints.
 * @param direction - Requested navigation action.
 * @param extend - Extend a same-slot child selection.
 * @param retainedSlots - Optional index retained for this exact document.
 * @returns Updated structural selection.
 */
export function moveMathVisual(document: MathDocument, selection: MathVisualSelection, direction: MathVisualDirection, extend = false, retainedSlots?: readonly MathVisualSlot[]): MathVisualSelection {
  const slots = retainedSlots ?? getMathVisualSlots(document);
  const current = slots.find(item => item.id === selection.focus.slot) ?? slots[0]!;
  const { index } = selection.focus;
  const count = current.sequence.children.length;
  if (extend && (direction === 'left' || direction === 'right')) return {
    focus: { slot: current.id, index: Math.max(0, Math.min(count, index + (direction === 'left' ? -1 : 1))) },
    anchor: selection.anchor ?? selection.focus,
  };
  if (direction === 'home' || direction === 'end') return { focus: { slot: current.id, index: direction === 'home' ? 0 : count } };
  if (direction === 'next' || direction === 'previous') {
    const next = slots[(slots.indexOf(current) + (direction === 'next' ? 1 : slots.length - 1)) % slots.length]!;
    return { focus: { slot: next.id, index: 0 } };
  }
  if (direction === 'up' || direction === 'down') {
    const next = verticalSlot(slots, current, direction);
    return { focus: next ? { slot: next.id, index: Math.min(index, next.sequence.children.length) } : selection.focus };
  }
  if (selection.anchor && selection.anchor.index !== index) return { focus: { slot: current.id, index: direction === 'left' ? Math.min(index, selection.anchor.index) : Math.max(index, selection.anchor.index) } };
  const target = direction === 'left' ? index - 1 : index;
  const nested = slots.filter(slot => slot.parent?.slot === current.id && slot.parent.index === target);
  const entry = direction === 'left' ? nested.at(-1) : nested[0];
  let focus: MathCaret;
  if (entry) focus = { slot: entry.id, index: direction === 'left' ? entry.sequence.children.length : 0 };
  else if (target >= 0 && target < count) focus = { slot: current.id, index: index + (direction === 'left' ? -1 : 1) };
  else {
    const siblings = current.parent ? slots.filter(slot => slot.parent?.slot === current.parent!.slot && slot.parent.index === current.parent!.index) : [];
    const sibling = siblings[siblings.indexOf(current) + (direction === 'right' ? 1 : -1)];
    focus = sibling ? { slot: sibling.id, index: direction === 'left' ? sibling.sequence.children.length : 0 }
      : current.parent ? { slot: current.parent.slot, index: current.parent.index + (direction === 'right' ? 1 : 0) } : selection.focus;
  }
  return { focus };
}
/**
 * Resolves explicit vertical peers, walking ancestors for nested content.
 * @param slots - Complete slot projection.
 * @param current - Active nested argument.
 * @param direction - Vertical direction.
 * @returns Related argument, when one exists.
 */
function verticalSlot(slots: readonly MathVisualSlot[], current: MathVisualSlot, direction: 'up' | 'down'): MathVisualSlot | undefined {
  if (!current.parent) return undefined;
  const role = current.id.split('/').at(-1)!;
  const matrixCell = /^cell-(\d+)-(\d+)$/u.exec(role);
  const cellTarget = matrixCell ? `cell-${Number(matrixCell[1]) + (direction === 'up' ? -1 : 1)}-${matrixCell[2]}` : undefined;
  const target = direction === 'up'
    ? cellTarget ?? ({ denominator: 'numerator', base: 'superscript', subscript: 'argument', radicand: 'degree', body: 'upper', lower: 'body' } as Record<string, string>)[role]
    : cellTarget ?? ({ numerator: 'denominator', base: 'subscript', superscript: 'argument', degree: 'radicand', body: 'lower', upper: 'body' } as Record<string, string>)[role];
  const sibling = slots.find(slot => slot.parent?.slot === current.parent!.slot && slot.parent.index === current.parent!.index && slot.id.endsWith(`/${target}`));
  const base = (role === 'subscript' && direction === 'up' || role === 'superscript' && direction === 'down')
    ? slots.find(slot => slot.parent?.slot === current.parent!.slot && slot.parent.index === current.parent!.index && slot.id.endsWith('/base')) : undefined;
  const functionScript = role === 'argument' ? (direction === 'up' ? 'superscript' : 'subscript') : undefined;
  const argumentPeer = functionScript ? slots.find(slot => slot.parent?.slot === current.parent!.slot && slot.parent.index === current.parent!.index && slot.id.endsWith(`/${functionScript}`)) : undefined;
  return sibling ?? base ?? argumentPeer ?? verticalSlot(slots, slots.find(slot => slot.id === current.parent!.slot)!, direction);
}
