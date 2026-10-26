export * from "./class-style";
export * from "./font-hints";
export * from "./inline-style";
export {
  parseDecorationPositiveNumber,
  parseDecorationStyleAttribute,
  readDecorationStringAttr,
  splitDecorationClassNames,
  type QuireDecorationStyleMap
} from "./parse";
export { mergeResolvedDecorationStyle } from "./theme";
export {
  readQuireDecorationAttrs,
  resolveQuireDecorationStyle,
  type QuireDecorationStyleResolution
} from "./resolve";
export * from "./text-decoration";
