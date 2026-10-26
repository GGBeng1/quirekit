import type { MathStyleName, MathSwitch, MathTextName } from '../model/types';

/** Font commands map onto MathML variants; box and spacing commands render specially. */
export const mathStyleVariants: Readonly<Record<MathStyleName, string | undefined>> = Object.freeze({
  mathrm: 'normal', mathbf: 'bold', mathit: 'italic', mathsf: 'sans-serif', mathtt: 'monospace',
  mathbb: 'double-struck', mathcal: 'script', mathfrak: 'fraktur', mathscr: 'script',
  boldsymbol: 'bold-italic', operatorname: 'normal', 'operatorname*': 'normal',
  boxed: undefined, phantom: undefined, hphantom: undefined, vphantom: undefined, pmod: undefined, mod: undefined,
});
/** Text-mode commands and their MathML text variants. */
export const mathTextVariants: Readonly<Record<MathTextName, string>> = Object.freeze({
  text: 'normal', textrm: 'normal', textnormal: 'normal', mbox: 'normal',
  textit: 'italic', textbf: 'bold', textsf: 'sans-serif', texttt: 'monospace',
});
/** Style switches applying to the rest of their group. */
export const mathSwitchCommands: Readonly<Record<string, MathSwitch['style']>> = Object.freeze({
  displaystyle: 'display', textstyle: 'text', scriptstyle: 'script', scriptscriptstyle: 'scriptscript',
});
/** Horizontal space commands, in em. */
export const mathSpaceCommands: Readonly<Record<string, number>> = Object.freeze({
  ',': 3 / 18, ':': 4 / 18, '>': 4 / 18, ';': 5 / 18, '!': -3 / 18, ' ': 1 / 3, '~': 1 / 3,
  thinspace: 3 / 18, medspace: 4 / 18, thickspace: 5 / 18, negthinspace: -3 / 18,
  enspace: 0.5, quad: 1, qquad: 2,
});
/** Fixed delimiter size commands; l/r/m variants only change TeX spacing class. */
export const mathDelimiterSizes: Readonly<Record<string, 1 | 2 | 3 | 4>> = Object.freeze(Object.fromEntries(
  (['big', 'Big', 'bigg', 'Bigg'] as const).flatMap((name, index) =>
    ['', 'l', 'r', 'm'].map(suffix => [name + suffix, (index + 1) as 1 | 2 | 3 | 4])),
));
