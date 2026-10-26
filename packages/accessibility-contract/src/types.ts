import type { QuireAnyExtension } from "@quirekit/core";
import type { Mark, Node } from "@quirekit/pm";

/** Semantics for a textblock; the engine owns its HTML and input behavior. */
export interface QuireAccessibleTextDescription {
  /** Native paragraph, heading or preformatted text semantics. */
  readonly kind: "paragraph" | "heading" | "code-block";
  /** Heading level from 1 to 6; invalid levels fall back to paragraph semantics. */
  readonly level?: number;
  /** Explicit admission to the existing native text host, subject to ancestor validation. */
  readonly editable?: boolean;
}

/** Structural semantics, retained across explicit reading segments. */
export interface QuireAccessibleContainerDescription {
  /** Native structural relationship; group is a neutral wrapper. */
  readonly kind: "blockquote" | "list" | "list-item" | "group";
  /** Whether a list uses numeric markers. */
  readonly ordered?: boolean;
  /** First ordered-list value, defaulting to one. */
  readonly start?: number;
  /** Whether ordinary text descendants may use the main text host through this wrapper. */
  readonly textNavigation?: boolean;
}

/** Noneditable object or exact one-unit inline break semantics. */
export interface QuireAccessibleLeafDescription {
  /** A description never grants editing access to its object. */
  readonly kind: "description" | "separator" | "break";
  /** Human-readable object description; bounded by the reader's text budget. */
  readonly label?: string;
}

/** Renderer-independent semantic node description. */
export type QuireAccessibleNodeDescription = QuireAccessibleTextDescription
  | QuireAccessibleContainerDescription | QuireAccessibleLeafDescription;

/** Inline semantics owned by a schema mark. */
export interface QuireAccessibleMarkDescription {
  /** Native inline formatting or hyperlink semantics. */
  readonly kind: "strong" | "emphasis" | "underline" | "strike" | "code" | "link";
  /** Link target, admitted again by the engine's URL policy before DOM creation. */
  readonly href?: string;
}

/** A node semantic owner; an ordinary Feature may contribute on behalf of a node. */
export interface QuireAccessibilityNodeCapability {
  /** Contribution discriminator. */
  readonly kind: "node";
  /** Exact installed schema node name. */
  readonly name: string;
  /** @param node - Immutable canonical node; inspect local facts without traversing descendants. @returns Pure semantics, or null for an explicit unsupported fallback. */
  readonly describe: (node: Node) => QuireAccessibleNodeDescription | null;
}

/** A mark semantic owner, independent of visual backend. */
export interface QuireAccessibilityMarkCapability {
  /** Contribution discriminator. */
  readonly kind: "mark";
  /** Exact installed schema mark name. */
  readonly name: string;
  /** @param mark - Immutable canonical mark. @returns Pure inline semantics, or null to retain plain text. */
  readonly describe: (mark: Mark) => QuireAccessibleMarkDescription | null;
}

/** Facts accepted by the optional accessibility engine. */
export type QuireAccessibilityCapability = QuireAccessibilityNodeCapability | QuireAccessibilityMarkCapability;

/** Factory context actually supplied by Core's contribution collector. */
export interface QuireAccessibilityFactoryContext<Options extends object = object, Storage extends object = object> {
  /** Resolved extension name, including a renamed inherited extension. */
  readonly name: string;
  /** Resolved configured options. */
  readonly options: Options;
  /** Extension-owned storage; descriptions must not depend on mutable external state. */
  readonly storage: Storage;
  /** All resolved extensions, independent of registration order. */
  readonly extensions?: readonly QuireAnyExtension[];
  /** @param context - Current factory context. @returns Inherited contributions. */
  readonly parent?: (context: QuireAccessibilityFactoryContext<Options, Storage>) => readonly QuireAccessibilityCapability[];
}

/** @param context - Resolved factory context, also bound as this. @returns Node and mark semantic contributions. */
export type QuireAccessibilityFactory<Options extends object = object, Storage extends object = object> = (
  this: QuireAccessibilityFactoryContext<Options, Storage>,
  context: QuireAccessibilityFactoryContext<Options, Storage>
) => readonly QuireAccessibilityCapability[];

declare module "@quirekit/core" {
  /** Optional accessibility contribution on a feature extension. */
  interface QuireExtensionConfig<Options extends object = object, Storage extends object = object> {
    /** Contributes semantic facts when the optional accessibility engine is enabled. */
    readonly addAccessibility?: QuireAccessibilityFactory<Options, Storage>;
  }
  /** Optional accessibility contribution on a schema node extension. */
  interface QuireNodeConfig<Options extends object = object, Storage extends object = object> {
    /** Contributes this node's semantic facts without owning DOM or input events. */
    readonly addAccessibility?: QuireAccessibilityFactory<Options, Storage>;
  }
  /** Optional accessibility contribution on a schema mark extension. */
  interface QuireMarkConfig<Options extends object = object, Storage extends object = object> {
    /** Contributes this mark's inline semantics without installing the engine. */
    readonly addAccessibility?: QuireAccessibilityFactory<Options, Storage>;
  }
}
