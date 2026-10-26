/** @param root - Font-prepared static SVG. Splits standard combined decorations into nested single-decoration runs understood by the public encoder. */
export function preparePdfDecorations(root: SVGSVGElement): void {
  for (const element of root.querySelectorAll("text,tspan")) {
    const values = (element.getAttribute("text-decoration") ?? "none").trim().split(/\s+/);
    if (values.some(value => !["none", "underline", "line-through", "overline"].includes(value))) throw new Error("PDF SVG 含不支持的绘制内容");
    const decorations = [...new Set(values.filter(value => value !== "none"))]; if (decorations.length < 2) continue;
    element.setAttribute("text-decoration", decorations[0]!);
    let parent = element;
    for (const decoration of decorations.slice(1)) {
      const span = root.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "tspan"); span.setAttribute("text-decoration", decoration);
      while (parent.firstChild) span.append(parent.firstChild); parent.append(span); parent = span;
    }
  }
}
