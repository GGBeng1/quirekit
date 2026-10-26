import type { QuireKitColorRamp, QuireKitColorScheme } from '../types';

/** Additional neutral identities, sharing the same eleven semantic steps. */
export const additionalNeutralPalettes: Readonly<Record<'slate' | 'stone', Readonly<Record<QuireKitColorScheme, QuireKitColorRamp>>>> = Object.freeze({
  slate: Object.freeze({
    light: Object.freeze([
      '#fcfdff', '#f5f7fa', '#f2f4f6', '#eceef2', '#dfe2e6', '#bec3ca',
      '#94989f', '#6a6e75', '#4e5158', '#32353c', '#191c22'
    ] as const),
    dark: Object.freeze([
      '#0b111b', '#101925', '#182331', '#213041', '#2a3b4f', '#496078',
      '#667c94', '#869aaf', '#9aaec4', '#bfccdb', '#eef3f9'
    ] as const)
  }),
  stone: Object.freeze({
    light: Object.freeze([
      '#fdfcfa', '#faf8f5', '#f5f1eb', '#ede7e0', '#dfd5cb', '#c4b8ac',
      '#8e847a', '#6f655d', '#5b524b', '#463f39', '#211e1b'
    ] as const),
    dark: Object.freeze([
      '#100e0c', '#181512', '#221e1a', '#2c2722', '#38312a', '#5c5248',
      '#796d60', '#9a8e7f', '#aea293', '#c9c0b5', '#f3eee7'
    ] as const)
  })
});
