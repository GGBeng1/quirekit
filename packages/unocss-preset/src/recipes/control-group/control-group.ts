import type { StaticShortcut } from '@unocss/core';

/** The group owns connection geometry, while children own all control states and typography. */
export const controlGroupShortcuts: StaticShortcut[] = [
  ['qk-control-group', 'relative box-border inline-flex w-fit min-w-0 max-w-full items-stretch flex-nowrap', { layer: 'qk-recipes' }],
  ['qk-control-group--horizontal', 'flex-row', { layer: 'qk-recipes' }],
  ['qk-control-group--vertical', 'flex-col', { layer: 'qk-recipes' }],
  ['qk-control-group--block', 'flex w-full', { layer: 'qk-recipes' }]
];

/** Public recipe names available to both UnoCSS and the standalone stylesheet. */
export const controlGroupRecipeCatalog = Object.freeze(controlGroupShortcuts.map(shortcut => shortcut[0]));

// Only direct, known control roots participate. Hidden native form controls and nested
// adornment buttons never enter the edge calculation; v-if leaves no phantom first/last cell.
const member = ':is(.qk-input,.qk-button,[data-scope="select"][data-part="root"]):not([hidden])';
const selectSurface = ' > [data-scope="select"][data-part="control"] > .qk-select__trigger';

/**
 * Select's visible border lives below its root; other supported controls own their root border.
 * @param selector - Direct member or adjacent-member selector.
 * @returns Selectors for exactly the participating visible surfaces.
 */
function surfaces(selector: string): string {
  return `${selector}:is(.qk-input,.qk-button),${selector}${selectSurface}`;
}

/**
 * Remove only internal corners, retaining the original control's exterior radius and outline.
 * @param orientation - The connected axis.
 * @returns Axis-specific connection CSS.
 */
function connectedEdges(orientation: 'horizontal' | 'vertical'): string {
  const root = `.qk-control-group--${orientation}`;
  const after = `${root} > ${member} ~ ${member}`;
  const before = `${root} > ${member}:has(~ ${member})`;
  const axis = orientation === 'horizontal' ? 'inline' : 'block';
  const startCorners = orientation === 'horizontal' ? ['start-start', 'end-start'] : ['start-start', 'start-end'];
  const endCorners = orientation === 'horizontal' ? ['start-end', 'end-end'] : ['end-start', 'end-end'];
  return [
    `${after}{margin-${axis}-start:calc(-1 * var(--qk-border-width-default))}`,
    `${surfaces(after)}{${startCorners.map(corner => `border-${corner}-radius:0`).join(';')}}`,
    `${surfaces(before)}{${endCorners.map(corner => `border-${corner}-radius:0`).join(';')}}`
  ].join('\n');
}

/** One shared seam, logical corners and unobstructed child-owned focus rings and popups. */
export const controlGroupStaticCss = [
  `.qk-control-group > ${member}{position:relative;min-inline-size:0;max-inline-size:100%}`,
  `.qk-control-group > ${member}:hover{z-index:1}`,
  `.qk-control-group > ${member}:is(:focus-within,:has([data-state="open"])){z-index:2}`,
  '.qk-control-group--block.qk-control-group--horizontal > .qk-input{flex:1 1 0%}',
  `.qk-control-group--vertical > ${member}{inline-size:100%!important}`,
  connectedEdges('horizontal'),
  connectedEdges('vertical')
].join('\n');
