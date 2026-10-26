import type { EditorState } from "@quirekit/pm";
import type { HtmlMountedView } from "./types";

/** Base class that must stay on every mounted HTML view root. */
const htmlRootClassName = "qk-html-editor";

/** Attribute names owned by the mounted HTML runtime. */
const protectedHtmlAttributeNames = new Set([
  "contenteditable",
  "nodeName",
  "data-qk-view",
  "data-qk-view-id"
]);

/** Options used to synchronize PM-style root attributes. */
export interface HtmlRootAttributesSyncOptions {
  /** Mounted HTML view whose props should be inspected. */
  readonly view: HtmlMountedView;
  /** Root element exposed through `view.dom`. */
  readonly root: HTMLElement;
}

/**
 * Synchronizes PM-style `attributes` props onto the HTML view root.
 *
 * @param options - Mounted view and root element.
 */
export function syncHtmlMountedRootAttributes(
  options: HtmlRootAttributesSyncOptions
): void {
  const attrs = collectHtmlRootAttributes(options.view);
  const className = attrs.class;
  const style = attrs.style;

  options.root.className = className
    ? `${htmlRootClassName} ${className}`
    : htmlRootClassName;

  if (style) {
    mergeRootStyleAttribute(options.root, style);
  }

  for (const [name, value] of Object.entries(attrs)) {
    if (
      value === undefined ||
      name === "class" ||
      name === "style" ||
      protectedHtmlAttributeNames.has(name)
    ) {
      continue;
    }

    options.root.setAttribute(name, value);
  }
}

/**
 * Collects the first PM-style attributes prop exposed by the mounted view.
 *
 * @param view - Mounted HTML view to inspect.
 * @returns Resolved root attributes.
 */
function collectHtmlRootAttributes(view: HtmlMountedView): Record<string, string> {
  const attrs = view.someProp("attributes");
  const resolved = typeof attrs === "function"
    ? attrs(view.state as EditorState)
    : attrs;

  return isStringRecord(resolved) ? resolved : {};
}

/**
 * Merges a style prop into the existing root style attribute.
 *
 * @param root - Root element to update.
 * @param style - Style declaration supplied by PM props.
 */
function mergeRootStyleAttribute(root: HTMLElement, style: string): void {
  const previous = root.dataset.qkViewAttributesStyle;
  const current = removePreviousRootStyle(
    root.getAttribute("style"),
    previous
  );

  root.setAttribute("style", current ? `${current};${style}` : style);
  root.dataset.qkViewAttributesStyle = style;
}

/**
 * Removes the previously applied PM-style attribute declarations.
 *
 * @param current - Current style attribute.
 * @param previous - Previously applied PM-style declarations.
 * @returns Style attribute without the previous PM-style suffix.
 */
function removePreviousRootStyle(
  current: string | null,
  previous: string | undefined
): string {
  if (!current || !previous || !current.endsWith(previous)) {
    return current ?? "";
  }

  return current.slice(0, -previous.length).replace(/;$/, "");
}

/**
 * Checks whether a value is a string record.
 *
 * @param value - Value to inspect.
 * @returns Whether the value can be used as DOM attributes.
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}
