/** DrawingML degrees use 60000 units per degree. */
export const drawingAngleUnit = Math.PI / 10800000;

/**
 * Resolves numeric literals and shape-local symbols without executable expressions.
 * @param token - Coordinate, angle, guide or built-in symbol.
 * @param values - Ordered guide environment.
 * @returns Finite numeric value.
 */
export function resolveGeometryValue(token: string, values: ReadonlyMap<string, number>): number {
  if (values.has(token)) return values.get(token)!;
  if (/^-?\d+(?:\.\d+)?$/.test(token)) return Number(token);
  const fraction = /^(w|h|ss)d(\d+)$/.exec(token);
  if (fraction) return values.get(fraction[1]!)! / Number(fraction[2]);
  const angle = /^(\d*)cd(\d+)$/.exec(token);
  if (angle) return (Number(angle[1] || 1) * 21600000) / Number(angle[2]);
  throw new RangeError(`Undefined drawing geometry value: ${token}`);
}

/**
 * Evaluates one standard formula using only its declared operands.
 * @param formula - Trusted declarative preset formula.
 * @param values - Previously evaluated values.
 * @returns Finite result, including a stable zero for singular degeneracies.
 */
export function evaluateGeometryFormula(formula: string, values: ReadonlyMap<string, number>): number {
  const [operator, ...tokens] = formula.trim().split(/\s+/);
  const [a = 0, b = 0, c = 0] = tokens.map(token => resolveGeometryValue(token, values));
  let result: number;
  switch (operator) {
    case "val": result = a; break;
    case "*/": result = c === 0 ? 0 : a * b / c; break;
    case "+-": result = a + b - c; break;
    case "+/": result = c === 0 ? 0 : (a + b) / c; break;
    case "?:": result = a > 0 ? b : c; break;
    case "abs": result = Math.abs(a); break;
    case "sqrt": result = Math.sqrt(Math.max(0, a)); break;
    case "max": result = Math.max(a, b); break;
    case "min": result = Math.min(a, b); break;
    case "mod": result = Math.hypot(a, b, c); break;
    case "pin": result = Math.max(a, Math.min(b, c)); break;
    case "at2": result = Math.atan2(b, a) / drawingAngleUnit; break;
    case "sin": result = a * Math.sin(b * drawingAngleUnit); break;
    case "cos": result = a * Math.cos(b * drawingAngleUnit); break;
    case "tan": result = a * Math.tan(b * drawingAngleUnit); break;
    case "cat2": result = a * Math.cos(Math.atan2(c, b)); break;
    case "sat2": result = a * Math.sin(Math.atan2(c, b)); break;
    default: throw new RangeError(`Unsupported drawing geometry operator: ${operator}`);
  }
  return Number.isFinite(result) ? result : 0;
}
