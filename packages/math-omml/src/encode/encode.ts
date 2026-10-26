import type { MathDocument, MathExpression, MathSequence } from "@quirekit/math";
import { encodeAccent, encodeFence, encodeFraction, encodeRadical, encodeScripts } from "./structures";
import { encodeMatrix } from "./matrix";
import { encodeFunction, encodeOperator, encodeStyled, encodeText } from "./named";
import { spaceCharacters } from "./tables";
import type { OmmlNode, MathOmmlEncoding } from "../types";
import type { EncodeContext } from "./context";
import { element, run } from "../xml/build";

/**
 * Encodes a formula in the OMML form Word's own LaTeX input produces, so Word edits it natively.
 * @param document - Parsed formula.
 * @param display - Whether to write a display formula (`m:oMathPara`).
 * @returns OMML element and the source constructs Word cannot represent.
 */
export function encodeMathOmml(document: MathDocument, display: boolean): MathOmmlEncoding {
  const losses = new Set<string>();
  const math = element("m:oMath", encodeSequence(document.root, { style: {}, losses, encodeSequence, encodeChildren }));
  return { element: display ? element("m:oMathPara", [math]) : math, losses: [...losses] };
}

/**
 * Encodes one sequence.
 * @param sequence - Formula slot.
 * @param context - Run style and loss collector.
 * @returns OMML children.
 */
function encodeSequence(sequence: MathSequence | undefined, context: EncodeContext): OmmlNode[] {
  return sequence === undefined ? [] : encodeChildren(sequence.children, context);
}

/**
 * Encodes sibling expressions, merging adjacent characters into runs.
 * @param children - Sibling expressions.
 * @param context - Run style and loss collector.
 * @returns OMML children.
 */
function encodeChildren(children: readonly MathExpression[], context: EncodeContext): OmmlNode[] {
  const out: OmmlNode[] = [];
  let text = "";
  const flush = (): void => {
    if (text !== "") out.push(run(text, context.style));
    text = "";
  };
  for (let index = 0; index < children.length; index++) {
    const child = children[index]!;
    // Plain content accumulates into the current run.
    if (child.kind === "symbol") { text += child.value === "′" ? "'" : child.value; continue; }
    if (child.kind === "space") {
      const space = spaceCharacters(child.width);
      if (space === undefined) context.losses.add("negative-space"); else text += space;
      continue;
    }
    if (child.kind === "delimiter") {
      if (child.size !== "middle") context.losses.add("delimiter-size");
      text += child.value;
      continue;
    }
    if (child.kind === "switch") { context.losses.add("style-switch"); continue; }
    if (child.kind === "marker") { context.losses.add("equation-marker"); continue; }
    flush();
    if (child.kind === "sequence") { out.push(...encodeChildren(child.children, context)); continue; }
    // Like Word's LaTeX input, an operator or function without a grouped operand takes the next atom.
    const takesOperand = (child.kind === "operator" && child.body === undefined)
      || (child.kind === "function" && child.argument === undefined)
      || (child.kind === "styled" && child.name.startsWith("operatorname"));
    const next = children[index + 1];
    const operand = takesOperand && next !== undefined && isOperand(next) ? next : undefined;
    if (operand !== undefined) index++;
    out.push(...encodeStructure(child, operand, context));
  }
  flush();
  return out;
}

/**
 * Reports whether an expression can be the implicit operand of an operator or function.
 * @param expression - Following sibling.
 * @returns Whether it is a mathematical atom.
 */
function isOperand(expression: MathExpression): boolean {
  return expression.kind !== "space" && expression.kind !== "switch" && expression.kind !== "marker" && expression.kind !== "delimiter";
}

/**
 * Encodes one structural expression.
 * @param expression - Structure.
 * @param operand - Implicit operand taken from the following sibling.
 * @param context - Run style and loss collector.
 * @returns OMML nodes.
 */
function encodeStructure(expression: MathExpression, operand: MathExpression | undefined, context: EncodeContext): OmmlNode[] {
  switch (expression.kind) {
    case "fraction": return [encodeFraction(expression, context)];
    case "radical": return [encodeRadical(expression, context)];
    case "scripts": return [encodeScripts(expression, context)];
    case "fence": return [encodeFence(expression, context)];
    case "accent": return [encodeAccent(expression, context)];
    case "matrix": return encodeMatrix(expression, context);
    case "operator": return [encodeOperator(expression, operand, context)];
    case "function": return [encodeFunction(expression, operand, context)];
    case "styled": return encodeStyled(expression, operand, context);
    case "text": return encodeText(expression, context);
    default: return encodeChildren([expression], context);
  }
}
