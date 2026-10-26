import type { MathExpression, MathFunction, MathOperator, MathSequence, MathStyled, MathText } from "@quirekit/math";
import type { EncodeContext } from "./context";
import { scriptElement, slot, slotOf } from "./structures";
import { limitOperatorNames, naryCharacters, styleRunProperties } from "./tables";
import type { OmmlElement, OmmlNode } from "../types";
import { element, properties, property, run } from "../xml/build";

/**
 * Encodes the operand slot of an operator or function.
 * @param body - Grouped operand.
 * @param operand - Implicit operand taken from the following sibling.
 * @param context - Encoding context.
 * @returns `m:e`.
 */
function operandSlot(body: MathSequence | undefined, operand: MathExpression | undefined, context: EncodeContext): OmmlElement {
  return body === undefined ? slotOf("m:e", operand, context) : slot("m:e", body, context);
}

/**
 * Builds a `func` around an encoded name.
 * @param name - Encoded function name content.
 * @param argument - Encoded `m:e`.
 * @returns `m:func`.
 */
function functionElement(name: readonly OmmlNode[], argument: OmmlElement): OmmlElement {
  return element("m:func", [properties("m:funcPr"), element("m:fName", name), argument]);
}

/**
 * Encodes large operators as `nary` and limit-like operators as functions with limits.
 * @param operator - Operator.
 * @param operand - Implicit operand.
 * @param context - Encoding context.
 * @returns OMML structure.
 */
export function encodeOperator(operator: MathOperator, operand: MathExpression | undefined, context: EncodeContext): OmmlElement {
  const argument = operandSlot(operator.body, operand, context);
  const character = naryCharacters[operator.name];
  if (character !== undefined) {
    // Word's LaTeX input always states the limit location explicitly.
    return element("m:nary", [
      properties("m:naryPr",
        character === "" ? undefined : property("m:chr", character),
        property("m:limLoc", operator.placement === "side" ? "subSup" : "undOvr"),
        operator.lower === undefined ? property("m:subHide", "1") : undefined,
        operator.upper === undefined ? property("m:supHide", "1") : undefined),
      slot("m:sub", operator.lower, context),
      slot("m:sup", operator.upper, context),
      argument
    ]);
  }
  const name = run(limitOperatorNames[operator.name] ?? operator.name, { sty: "p" });
  if (operator.lower === undefined && operator.upper === undefined) return functionElement([name], argument);
  if (operator.placement === "side") return functionElement([scriptElement(element("m:e", [name]), operator.lower, operator.upper, context)], argument);
  let limited: OmmlElement = name;
  if (operator.lower !== undefined) limited = element("m:limLow", [properties("m:limLowPr"), element("m:e", [limited]), slot("m:lim", operator.lower, context)]);
  if (operator.upper !== undefined) limited = element("m:limUpp", [properties("m:limUppPr"), element("m:e", [limited]), slot("m:lim", operator.upper, context)]);
  return functionElement([limited], argument);
}

/**
 * Encodes a named function; scripts attach to the name.
 * @param fn - Function.
 * @param operand - Implicit argument.
 * @param context - Encoding context.
 * @returns `m:func`.
 */
export function encodeFunction(fn: MathFunction, operand: MathExpression | undefined, context: EncodeContext): OmmlElement {
  const name = run(fn.name, { sty: "p" });
  const scripted = fn.subscript === undefined && fn.superscript === undefined
    ? name
    : scriptElement(element("m:e", [name]), fn.subscript, fn.superscript, context);
  return functionElement([scripted], operandSlot(fn.argument, operand, context));
}

/**
 * Encodes font, box, phantom and operator-name commands.
 * @param styled - Styled argument.
 * @param operand - Implicit argument of `\operatorname`.
 * @param context - Encoding context.
 * @returns OMML nodes.
 */
export function encodeStyled(styled: MathStyled, operand: MathExpression | undefined, context: EncodeContext): OmmlNode[] {
  const font = styleRunProperties[styled.name];
  if (font !== undefined) return context.encodeSequence(styled.content, { ...context, style: { ...context.style, ...font } });
  const upright = { ...context, style: { ...context.style, sty: "p" as const } };
  switch (styled.name) {
    case "operatorname":
    case "operatorname*":
      return [functionElement(context.encodeSequence(styled.content, upright), slotOf("m:e", operand, context))];
    case "boxed": return [element("m:borderBox", [properties("m:borderBoxPr"), slot("m:e", styled.content, context)])];
    case "phantom": return [phantom(styled, context)];
    case "hphantom": return [phantom(styled, context, property("m:zeroAsc", "1"), property("m:zeroDesc", "1"))];
    case "vphantom": return [phantom(styled, context, property("m:zeroWid", "1"))];
    case "pmod": return [run("(", context.style), run("mod", { sty: "p" }), run(" ", context.style), ...context.encodeSequence(styled.content, context), run(")", context.style)];
    case "mod": return [run("mod", { sty: "p" }), run(" ", context.style), ...context.encodeSequence(styled.content, context)];
    default: return context.encodeSequence(styled.content, context);
  }
}

/**
 * Builds an invisible phantom.
 * @param styled - Phantom command.
 * @param context - Encoding context.
 * @param flags - Collapsed dimensions.
 * @returns `m:phant`.
 */
function phantom(styled: MathStyled, context: EncodeContext, ...flags: OmmlElement[]): OmmlElement {
  return element("m:phant", [properties("m:phantPr", property("m:show", "0"), ...flags), slot("m:e", styled.content, context)]);
}

/**
 * Encodes text-mode content as normal-text runs; nested formulas stay math.
 * @param text - Text command.
 * @param context - Encoding context.
 * @returns OMML nodes.
 */
export function encodeText(text: MathText, context: EncodeContext): OmmlNode[] {
  const sty = text.name === "textbf" ? "b" as const : text.name === "textit" ? "i" as const : undefined;
  return text.parts.flatMap(part => part.kind === "run"
    // Word's math zone swallows ordinary spaces, so text spaces are written as no-break spaces.
    ? (part.value === "" ? [] : [run(part.value.replace(/ /gu, "\u00A0"), { nor: true, sty })])
    : context.encodeSequence(part, context));
}
