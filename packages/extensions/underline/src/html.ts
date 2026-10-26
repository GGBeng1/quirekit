import { isUnderlineStyle } from "./validation";
/** @param node - Imported HTML element. @returns Exact data attrs or interoperable CSS projection. */
export function parseUnderlineHtml(node: HTMLElement): Record<string, unknown> {
  const token = node.getAttribute("data-qk-underline");
  const css = node.style.textDecorationStyle;
  return { underlineType: isUnderlineStyle(token) ? token : css === "wavy" ? "wave"
    : css === "dashed" ? "dash" : css === "dotted" || css === "double" ? css : "single",
    color: node.getAttribute("data-qk-underline-color") ?? null };
}
/** @param attrs - Underline mark fields. @returns CSS plus exact round-trip attributes. */
export function renderUnderlineHtml(attrs: Readonly<Record<string, unknown>>): Record<string, string> {
  const token = String(attrs.underlineType ?? "single");
  if (token === "single" && typeof attrs.color !== "string") return {};
  const style = /wav/iu.test(token) ? "wavy" : token === "double" ? "double"
    : /dotted/iu.test(token) ? "dotted" : /dash/iu.test(token) ? "dashed" : "solid";
  const color = typeof attrs.color === "string" ? attrs.color : "currentColor";
  return { "data-qk-underline": token,
    ...(typeof attrs.color === "string" ? { "data-qk-underline-color": attrs.color } : {}),
    style: `text-decoration-line:${token === "none" ? "none" : "underline"};text-decoration-style:${style};text-decoration-color:${color};text-decoration-thickness:${/heavy|thick/iu.test(token) ? "2px" : "auto"}` };
}
