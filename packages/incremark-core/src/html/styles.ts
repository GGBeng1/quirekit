const colors = new Set("transparent currentcolor black silver gray white maroon red purple fuchsia green lime olive yellow navy blue teal aqua orange rebeccapurple".split(" "));
const enums: Readonly<Record<string, readonly string[]>> = {
  display: ["block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid"],
  "flex-direction": ["row", "column", "row-reverse", "column-reverse"],
  "flex-wrap": ["wrap", "nowrap", "wrap-reverse"],
  "justify-content": ["start", "end", "center", "flex-start", "flex-end", "space-between", "space-around", "space-evenly"],
  "align-items": ["start", "end", "center", "flex-start", "flex-end", "stretch", "baseline"],
  "text-align": ["start", "end", "left", "right", "center", "justify"],
  "font-style": ["normal", "italic", "oblique"],
  "text-decoration": ["none", "underline", "line-through", "overline"],
  "white-space": ["normal", "pre-wrap", "pre-line"],
  "overflow-wrap": ["normal", "break-word", "anywhere"],
  "word-break": ["normal", "break-all", "keep-all"],
  "border-collapse": ["collapse", "separate"],
  "vertical-align": ["baseline", "top", "middle", "bottom", "text-top", "text-bottom"],
  cursor: ["auto", "default", "pointer", "text"],
};

/** @param value - One canonical token. @returns Whether it is an explicitly supported resource-free color. */
function color(value: string): boolean { return colors.has(value) || /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/u.test(value); }

/** @param value - One canonical token. @param percent - Whether this property accepts percentages.
 * @returns Whether the nonnegative length fits the fixed 2048px / 128em / 100% bounds. */
function length(value: string, percent = true): boolean {
  if (value === "0") return true;
  const match = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em|%)$/u.exec(value);
  if (!match || match[2] === "%" && !percent) return false;
  return Number(match[1]) <= (match[2] === "px" ? 2048 : match[2] === "%" ? 100 : 128);
}

/** @param value - Canonical whitespace-separated tokens. @param max - Maximum arity.
 * @param accept - Fixed token predicate. @returns Whether every token satisfies the property grammar. */
function list(value: string, max: number, accept: (token: string) => boolean): boolean {
  const tokens = value.split(" "); return tokens.length <= max && tokens.every(accept);
}

/** @param value - Canonical border shorthand. @returns Whether it contains only a length, line style and plain color. */
function border(value: string): boolean {
  if (value === "none") return true;
  const tokens = value.split(" ");
  return tokens.length === 3 && length(tokens[0]!, false) && ["solid", "dashed", "dotted", "double"].includes(tokens[1]!) && color(tokens[2]!);
}

/** @param name - Exact allowlisted property candidate. @param value - Lowercase, normalized value.
 * @returns Whether this declaration belongs to the finite supported CSS subset. */
function accepted(name: string, value: string): boolean {
  if (Object.hasOwn(enums, name)) return enums[name]!.includes(value);
  if (["color", "background", "background-color", "border-color"].includes(name)) return color(value);
  if (/^(?:padding|margin)(?:-(?:top|right|bottom|left))?$/u.test(name)) {
    return list(value, name.includes("-") ? 1 : 4, token => length(token));
  }
  if (["gap", "row-gap", "column-gap", "border-radius", "border-width", "border-spacing"].includes(name)) {
    const max = ["border-radius", "border-width"].includes(name) ? 4 : name === "gap" || name === "border-spacing" ? 2 : 1;
    return list(value, max, token => length(token, name === "border-radius"));
  }
  if (/^border(?:-(?:top|right|bottom|left))?$/u.test(name)) return border(value);
  if (/^(?:(?:min|max)-)?(?:width|height)$/u.test(name) || name === "flex-basis") return value === "auto" || length(value);
  if (name === "font-weight") return /^(?:normal|bold|[1-9]00)$/u.test(value);
  if (name === "font-size") {
    const match = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em)$/u.exec(value);
    return !!match && Number(match[1]) >= (match[2] === "px" ? 8 : 0.5) && Number(match[1]) <= (match[2] === "px" ? 72 : 4);
  }
  if (name === "line-height") return /^(?:[12](?:\.\d+)?|3(?:\.0+)?)$/u.test(value);
  if (name === "flex-grow" || name === "flex-shrink") return /^(?:\d|1[0-2])$/u.test(value);
  if (name === "flex") {
    const tokens = value.split(" ");
    return /^(?:\d|1[0-2])$/u.test(value) || tokens.length === 3 && accepted("flex-grow", tokens[0]!)
      && accepted("flex-shrink", tokens[1]!) && accepted("flex-basis", tokens[2]!);
  }
  if (name === "grid-template-columns") return list(value, 12, token => length(token) || /^(?:[1-9]|1[0-2])fr$/u.test(token));
  return false;
}

/**
 * Restrict inline declarations to a finite CSS subset; this is not a general CSS parser.
 * @param source - Entity-decoded style attribute from the already-sanitized HTML tree.
 * @returns Validated CSS properties, or undefined when none survive or a budget is exceeded.
 */
export function safeInlineStyles(source: unknown): Record<string, string> | undefined {
  if (typeof source !== "string" || source.length > 4096) return undefined;
  const declarations = source.split(";").filter(value => value.trim());
  if (declarations.length > 64) return undefined;
  const result: Record<string, string> = {};
  // Reject syntax requiring a CSS tokenizer rather than attempting to unescape it.
  // Only verified property/value pairs cross into a framework's style setter or SSR.
  for (const declaration of declarations) {
    const match = /^\s*([a-z-]+)\s*:\s*([a-z\d#.%\s-]+)\s*$/iu.exec(declaration);
    if (!match) continue;
    const name = match[1]!.toLowerCase(), value = match[2]!.trim().toLowerCase().replace(/\s+/gu, " ");
    if (accepted(name, value)) result[name === "background" ? "background-color" : name] = value;
  }
  return Object.keys(result).length ? result : undefined;
}
