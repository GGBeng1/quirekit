import {
  resolveDisplayListStyles,
  resolveQuireDocumentFont,
  resolveQuireDocumentFontFamily
} from "@quirekit/view-engine";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { HtmlMountedViewRuntimeOptions } from "../types";

/**
 * Establishes document-level inherited styles on the retained semantic root.
 *
 * Schema nodes and marks may override these inherited defaults through their
 * own DOM styles. Keeping the default on the root prevents host application
 * styles from leaking into document content without stamping every text node.
 *
 * @param root - Retained semantic document root owned by the HTML runtime.
 * @param runtime - Optional mounted runtime style configuration.
 * @param documentNode - Canonical document supplying inherited font roles.
 * @returns Whether any inherited surface style changed.
 */
export function syncHtmlRetainedDocumentSurfaceStyle(
  root: HTMLElement,
  runtime: HtmlMountedViewRuntimeOptions | undefined,
  documentNode: ProseMirrorNode
): boolean {
  const styles = resolveDisplayListStyles(
    runtime?.displayListStyles,
    runtime?.surfaceConfig
  );
  const hostFont = runtime?.displayListStyles?.font;
  const bodyFont = hostFont ?? resolveQuireDocumentFont(
    documentNode,
    styles.font,
    "body"
  );
  const headingFamily = hostFont === undefined
    ? resolveQuireDocumentFontFamily(documentNode, styles.font, "heading")
    : null;
  const padding = runtime?.viewportPadding;
  return [
    syncStyleProperty(root.style, "color", styles.textFillStyle),
    syncStyleProperty(root.style, "font", bodyFont),
    // Host UI wrapping must not reduce document/table intrinsic widths to glyphs.
    syncStyleProperty(root.style, "wordBreak", "normal"),
    syncStyleProperty(root.style, "overflowWrap", "normal"),
    syncStyleProperty(
      root.style,
      "--qk-document-heading-font-family",
      headingFamily ?? "inherit"
    ),
    syncStyleProperty(root.style, "boxSizing", "border-box"),
    syncStyleProperty(
      root.style,
      "padding",
      padding
        ? `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`
        : "0"
    )
  ].some(Boolean);
}

/**
 * Writes one inline style only when its value changes.
 *
 * @param style - Browser or test-double style declaration.
 * @param property - JavaScript property or custom-property name.
 * @param value - Next style value.
 * @returns Whether a write occurred.
 */
function syncStyleProperty(
  style: CSSStyleDeclaration,
  property: string,
  value: string
): boolean {
  const record = style as unknown as Record<string, string | undefined>;
  const current = property.startsWith("--") && typeof style.getPropertyValue === "function"
    ? style.getPropertyValue(property)
    : record[property];
  if (current === value) {
    return false;
  }
  if (property.startsWith("--") && typeof style.setProperty === "function") {
    style.setProperty(property, value);
  } else {
    record[property] = value;
  }
  return true;
}
