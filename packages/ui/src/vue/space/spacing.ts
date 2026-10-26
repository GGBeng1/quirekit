import type { QuireKitSpaceGap } from './types';

const gapVariables: Record<Exclude<QuireKitSpaceGap, 0>, string> = {
  inlineTight: 'var(--qk-space-inline-tight)',
  inline: 'var(--qk-space-inline)',
  surfaceCompact: 'var(--qk-space-surface-compact)',
  surface: 'var(--qk-space-surface)',
  group: 'var(--qk-space-group)',
  section: 'var(--qk-space-section)'
};

/**
 * Resolves a composition gap against the currently inherited theme.
 * @param gap Semantic spacing role, or zero for intentionally adjacent elements.
 * @returns A CSS length expression without freezing theme values.
 */
export function resolveSpaceGap(gap: QuireKitSpaceGap): string {
  return gap === 0 ? '0px' : gapVariables[gap];
}
