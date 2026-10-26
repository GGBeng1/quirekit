/**
 * Reads one native input without counting browser caret placeholders as content.
 * @param container - Root input or nested line container.
 * @returns Literal text with explicit line boundaries and intentional whitespace.
 */
export function readSimplePlainInput(container: Node): string {
  const chunks: string[] = [];
  const children = Array.from(container.childNodes);
  const lineContainer = container.nodeName === "DIV" || container.nodeName === "P";
  let previousBlock = false;
  for (let index = 0; index < children.length; index++) {
    const child = children[index]!;
    const block = child.nodeType === 1 && (child.nodeName === "DIV" || child.nodeName === "P");
    // Native line containers delimit logical lines. A final BR only positions
    // the caret; explicit pasted breaks have a following (possibly empty) text node.
    if (index && (block || previousBlock)) chunks.push("\n");
    if (child.nodeType === 3) chunks.push(child.nodeValue ?? "");
    else if (child.nodeName === "BR") {
      if (!lineContainer || index < children.length - 1) chunks.push("\n");
    } else chunks.push(readSimplePlainInput(child));
    previousBlock = block;
  }
  return chunks.join("");
}
