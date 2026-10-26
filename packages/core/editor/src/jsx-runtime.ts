/** Attributes accepted by QuireKit JSX DOM output specs. */
export type Attributes = Record<string, unknown>;

/** DOM output spec child accepted by a JSX element. */
export type DOMOutputSpecElement = 0 | Attributes | DOMOutputSpecArray;

/** Tiptap-compatible tuple form for ProseMirror DOM output specs. */
export type DOMOutputSpecArray =
  | [string]
  | [string, Attributes]
  | [string, 0]
  | [string, Attributes, 0]
  | [string, Attributes, DOMOutputSpecArray | 0]
  | [string, DOMOutputSpecArray]
  | [string, Attributes, ...DOMOutputSpecElement[]];

/** JSX namespace used when `jsxImportSource` points at `@quirekit/core`. */
export namespace JSX {
  /** JSX element output. */
  export type Element = DOMOutputSpecArray | DOMOutputSpecElement;

  /** Intrinsic element map. */
  export interface IntrinsicElements {
    /** Allows HTML tag names and extension-specific tag-like render helpers. */
    [key: string]: unknown;
  }

  /** JSX children prop mapping. */
  export interface ElementChildrenAttribute {
    /** Children property consumed by the runtime. */
    children: unknown;
  }
}

/** Function signature implemented by the JSX renderer. */
export type JSXRenderer = (
  tag: "slot" | string | ((props?: Attributes) => DOMOutputSpecArray | DOMOutputSpecElement),
  props?: Attributes,
  ...children: DOMOutputSpecElement[]
) => DOMOutputSpecArray | DOMOutputSpecElement;

/**
 * Renders a JSX fragment as its children.
 *
 * @param props - Fragment props.
 * @returns Fragment children.
 */
export function Fragment(props: {
  /** Fragment children. */
  readonly children: DOMOutputSpecElement[];
}): DOMOutputSpecElement[] {
  return props.children;
}

/**
 * Converts JSX calls into ProseMirror DOM output specs.
 *
 * @param tag - HTML tag, `slot`, or functional render component.
 * @param attributes - JSX attributes.
 * @param children - JSX children.
 * @returns DOM output spec.
 */
export const h: JSXRenderer = (tag, attributes, ...children) => {
  if (tag === "slot") {
    return 0;
  }

  if (typeof tag === "function") {
    return tag(attributes);
  }

  if (tag === "svg") {
    throw new Error("SVG elements are not supported in the JSX syntax, use the array syntax instead.");
  }

  const { children: attributeChildren, ...rest } = attributes ?? {};
  const resolvedChildren = children.length > 0
    ? children
    : Array.isArray(attributeChildren)
      ? attributeChildren as DOMOutputSpecElement[]
      : attributeChildren === undefined
        ? []
        : [attributeChildren as DOMOutputSpecElement];

  return [tag, rest, ...resolvedChildren];
};

export { h as createElement, h as jsx, h as jsxDEV, h as jsxs };
