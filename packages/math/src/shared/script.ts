// Scripts covered by the mathematical font; other letters are text, not math identifiers.
const mathScripts = /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Common}\p{Script=Inherited}]+$/u;
// Common-script characters that still belong to East Asian text or emoji.
const textCommon = /[　-〿＀-￯\p{Extended_Pictographic}]/u;

/**
 * Decides whether a character is prose text rather than a mathematical symbol.
 * Such characters are typed as `\text{…}` and rendered as `mtext`.
 * @param value - One Unicode scalar or a short symbol value.
 * @returns Whether the value needs text treatment.
 */
export function isMathTextScalar(value: string): boolean {
  return !mathScripts.test(value) || textCommon.test(value);
}
