/** Common physical page sizes expressed in OFD millimetres. */
export const OFDPageSizes = Object.freeze({
  A0: Object.freeze({ width: 841, height: 1189 }),
  A1: Object.freeze({ width: 594, height: 841 }),
  A2: Object.freeze({ width: 420, height: 594 }),
  A3: Object.freeze({ width: 297, height: 420 }),
  A4: Object.freeze({ width: 210, height: 297 }),
  A5: Object.freeze({ width: 148, height: 210 }),
  A6: Object.freeze({ width: 105, height: 148 }),
  Legal: Object.freeze({ width: 215.9, height: 355.6 }),
  Letter: Object.freeze({ width: 215.9, height: 279.4 })
});

/** Name of one page size exposed by `OFDPageSizes`. */
export type OFDPageSizeName = keyof typeof OFDPageSizes;
