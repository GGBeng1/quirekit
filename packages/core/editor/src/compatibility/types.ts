import type { Node as PMNode } from "@quirekit/pm";
import type { QuireEditor } from "../Editor";
import type { Node as NodeExtension } from "../Node";
import type {
  MarkdownToken,
  QuireAnyExtension,
  QuireEditorUtils,
  QuireExtensionConfig,
  QuireMarkConfig,
  QuireNodeConfig,
  RenderContext
} from "../types";

/** Config accepted by any Tiptap-compatible extension family. */
export type AnyConfig = QuireExtensionConfig | QuireNodeConfig | QuireMarkConfig;

/** Resolved extension accepted by the QuireKit extension manager. */
export type AnyExtension = QuireAnyExtension;

/** Resolved schema attribute metadata exposed by compatibility helpers. */
export type ExtensionAttribute = {
  /** Node or mark type name that owns this attribute. */
  type: string;
  /** Attribute name. */
  name: string;
  /** Fully normalized attribute declaration. */
  attribute: Required<Omit<Attribute, "validate">> & Pick<Attribute, "validate">;
};

/** Ordered extension collection supplied to an editor. */
export type Extensions = AnyExtension[];

/** Primitive values excluded while resolving callable config fields. */
export type Primitive = null | undefined | string | number | boolean | symbol | bigint;

/** Removes an explicit `this` parameter while retaining arguments and result. */
export type RemoveThis<Value> = Value extends (...args: infer Args) => infer Result
  ? (...args: Args) => Result
  : Value;

/** Resolves a function result while retaining non-function values. */
export type MaybeReturnType<Value> = Value extends (...args: never[]) => infer Result
  ? Result
  : Value;

/** Resolves the explicit `this` parameter of a callable config field. */
export type MaybeThisParameterType<Value> =
  Exclude<Value, Primitive> extends (...args: never[]) => unknown
    ? ThisParameterType<Exclude<Value, Primitive>>
    : any;

/** JSON-compatible mark descriptor used by typed document contracts. */
export type MarkType<
  Type extends string | { name: string } = any,
  Attributes extends undefined | Record<string, any> = any
> = {
  /** Mark name or schema type. */
  type: Type;
  /** Mark attributes. */
  attrs: Attributes;
};

/** JSON-compatible node descriptor used by typed document contracts. */
export type NodeType<
  Type extends string | { name: string } = any,
  Attributes extends undefined | Record<string, any> = any,
  NodeMark extends MarkType = any,
  Content extends (NodeType | TextType)[] = any
> = {
  /** Node name or schema type. */
  type: Type;
  /** Node attributes. */
  attrs: Attributes;
  /** Optional child content. */
  content?: Content;
  /** Optional node marks. */
  marks?: NodeMark[];
};

/** Typed JSON document root. */
export type DocumentType<
  Attributes extends Record<string, any> | undefined = Record<string, any>,
  Content extends NodeType[] = NodeType[]
> = Omit<NodeType<"doc", Attributes, never, Content>, "marks" | "content"> & {
  /** Required document child content. */
  content: Content;
};

/** Typed JSON text node. */
export type TextType<NodeMark extends MarkType = MarkType> = {
  /** Text node discriminator. */
  type: "text";
  /** Text content. */
  text: string;
  /** Marks applied to the text. */
  marks: NodeMark[];
};

/** Recursive tuple accepted from Tiptap-compatible `renderHTML` callbacks. */
export type DOMOutputSpecArray =
  | [string]
  | [string, Record<string, any>]
  | [string, 0]
  | [string, Record<string, any>, 0]
  | [string, Record<string, any>, DOMOutputSpecArray | 0]
  | [string, DOMOutputSpecArray];

/** One schema attribute declaration. */
export type Attribute = {
  /** Default attribute value. */
  default?: any;
  /** Attribute validation expression or callback. */
  validate?: string | ((value: any) => void);
  /** Whether HTML rendering should include the attribute. */
  rendered?: boolean;
  /** Converts document attributes to rendered HTML attributes. */
  renderHTML?: ((attributes: Record<string, any>) => Record<string, any> | null) | null;
  /** Parses the attribute from an HTML element. */
  parseHTML?: ((element: HTMLElement) => any | null) | null;
  /** Whether splitting a node should retain the attribute. */
  keepOnSplit?: boolean;
  /** Whether the attribute must not receive an inferred default. */
  isRequired?: boolean;
};

/** Attribute declarations keyed by schema attribute name. */
export type Attributes = Record<string, Attribute>;

/** Global attribute contributions applied to schema nodes or marks. */
export type GlobalAttributes = Array<{
  /** Target names or the standard node/mark shorthand. */
  types: string[] | "nodes" | "marks" | "*";
  /** Attribute declarations applied to every resolved target. */
  attributes: Record<string, Attribute | undefined>;
}>;

/** Product keyboard shortcut callback receiving the owning editor. */
export type KeyboardShortcutCommand = (props: { editor: QuireEditor }) => boolean;

/** Reads one property value from a type. */
export type PickValue<Value, Key extends keyof Value> = Value[Key];

/** Removes keys from one key union using the Tiptap-compatible mapped shape. */
export type Diff<Left extends keyof any, Right extends keyof any> = ({
  [Key in Left]: Key;
} & {
  [Key in Right]: never;
} & { [key: string]: never })[Left];

/** Replaces properties from one type with properties from another. */
export type Overwrite<Base, Replacement> =
  Pick<Base, Diff<keyof Base, keyof Replacement>> & Replacement;

/** Browser DOM node instance used by view-facing compatibility contracts. */
export type DOMNode = globalThis.Node;

/** Document range carrying the resolved ProseMirror node. */
export type NodeRange = {
  /** Node intersecting the range. */
  node: PMNode;
  /** Inclusive range start. */
  from: number;
  /** Exclusive range end. */
  to: number;
};

/** Predicate over one ProseMirror node. */
export type Predicate = (node: PMNode) => boolean;

/** Optional ProseMirror-style dispatch callback. */
export type Dispatch = ((args?: any) => any) | undefined;

/** Author-facing Markdown helper subset shared by parsers and renderers. */
export type MarkdownHelpers = {
  /** Parses inline Markdown tokens. */
  parseInline: (tokens: MarkdownToken[]) => any[];
  /** Renders extension node children. */
  renderChildren: (
    node: NodeExtension[] | NodeExtension,
    contextOrSeparator?: RenderContext | string
  ) => string;
  /** Resolves one token as text content. */
  text: (token: MarkdownToken) => any;
};

/** Complete runtime Markdown helper surface. */
export type FullMarkdownHelpers = MarkdownHelpers & {
  /** Parses block-level child tokens. */
  parseChildren: (tokens: MarkdownToken[]) => any[];
  /** Resolves one installed Markdown extension by name. */
  getExtension: (name: string) => any;
  /** Creates one JSON-like Markdown node. */
  createNode: (type: string, attrs?: any, content?: any[]) => any;
  /** Active render context, absent during parsing. */
  currentContext?: RenderContext;
  /** Indents a multiline value for a render context. */
  indent: (text: string, context?: RenderContext) => string;
  /** Resolves the indent string for one nesting level. */
  getIndentString: (level?: number) => string;
};

/** Tiptap-compatible editor position utility surface. */
export type Utils = QuireEditorUtils;

/** Module-augmentable editor storage registry. */
export interface Storage {}
