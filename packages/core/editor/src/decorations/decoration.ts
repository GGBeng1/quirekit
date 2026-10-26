import {
  Decoration as PMDecoration,
  type DecorationAttrs,
  type EditorView
} from "@quirekit/pm";
import type { QuireDecorationSpec, WidgetDecorationOptions } from "./types";

/** Supported public decoration families. */
export type DecorationKind = "inline" | "node" | "widget";

/** Base class for decorations returned by `addDecorations()`. */
export abstract class Decoration {
  /** Concrete decoration family. */
  abstract readonly kind: DecorationKind;

  /** Document position used to assign changed-range ownership. */
  abstract get anchor(): number;

  /**
   * Lowers this declarative decoration into a ProseMirror decoration.
   *
   * @param extensionName - Optional producing extension identity.
   * @returns ProseMirror decoration consumed by mounted views.
   */
  abstract toPMDecoration(extensionName?: string): PMDecoration;

  /**
   * Creates an inline decoration.
   *
   * @param from - Inclusive text range start.
   * @param to - Exclusive text range end.
   * @param attrs - DOM or renderer-neutral decoration attributes.
   * @param spec - Decoration metadata.
   * @returns Declarative inline decoration.
   */
  static Inline(
    from: number,
    to: number,
    attrs: DecorationAttrs = {},
    spec?: Readonly<Record<string, any>> & QuireDecorationSpec
  ): InlineDecoration {
    return new InlineDecoration(from, to, attrs, spec);
  }

  /**
   * Creates a node decoration.
   *
   * @param pos - Position before the decorated node.
   * @param to - Position after the decorated node.
   * @param attrs - DOM or renderer-neutral decoration attributes.
   * @param spec - Decoration metadata.
   * @returns Declarative node decoration.
   */
  static Node(
    pos: number,
    to: number,
    attrs: DecorationAttrs = {},
    spec?: Readonly<Record<string, any>> & QuireDecorationSpec
  ): NodeDecoration {
    return new NodeDecoration(pos, to, attrs, spec);
  }

  /**
   * Creates a DOM widget decoration.
   *
   * @param pos - Document position where the widget is anchored.
   * @param render - Lazy DOM materializer.
   * @param options - Stable widget key and ProseMirror widget options.
   * @returns Declarative widget decoration.
   */
  static Widget(
    pos: number,
    render: (
      view: EditorView,
      getPos: () => number | undefined
    ) => HTMLElement,
    options: { readonly key: string } & WidgetDecorationOptions &
      Readonly<Record<string, any>>
  ): WidgetDecoration {
    const { key, ...spec } = options;

    return new WidgetDecoration(pos, render, key, spec);
  }
}

/** Declarative inline range decoration. */
export class InlineDecoration extends Decoration {
  /** Inline decoration discriminator. */
  readonly kind = "inline" as const;

  /**
   * Creates a declarative inline decoration.
   *
   * @param from - Inclusive text range start.
   * @param to - Exclusive text range end.
   * @param attrs - Decoration attributes.
   * @param spec - Decoration metadata.
   */
  constructor(
    readonly from: number,
    readonly to: number,
    readonly attrs: DecorationAttrs = {},
    readonly spec?: Readonly<Record<string, any>> & QuireDecorationSpec
  ) {
    super();
  }

  /** @returns Inclusive text range start. */
  get anchor(): number {
    return this.from;
  }

  /**
   * @param extensionName - Optional producing extension identity.
   * @returns ProseMirror inline decoration.
   */
  toPMDecoration(extensionName?: string): PMDecoration {
    return PMDecoration.inline(
      this.from,
      this.to,
      this.attrs,
      addExtensionName(this.spec, extensionName)
    );
  }
}

/** Declarative node range decoration. */
export class NodeDecoration extends Decoration {
  /** Node decoration discriminator. */
  readonly kind = "node" as const;

  /**
   * Creates a declarative node decoration.
   *
   * @param from - Position before the node.
   * @param to - Position after the node.
   * @param attrs - Decoration attributes.
   * @param spec - Decoration metadata.
   */
  constructor(
    readonly from: number,
    readonly to: number,
    readonly attrs: DecorationAttrs = {},
    readonly spec?: Readonly<Record<string, any>> & QuireDecorationSpec
  ) {
    super();
  }

  /** @returns Position before the decorated node. */
  get anchor(): number {
    return this.from;
  }

  /**
   * @param extensionName - Optional producing extension identity.
   * @returns ProseMirror node decoration.
   */
  toPMDecoration(extensionName?: string): PMDecoration {
    return PMDecoration.node(
      this.from,
      this.to,
      this.attrs,
      addExtensionName(this.spec, extensionName)
    );
  }
}

/** Declarative DOM widget decoration. */
export class WidgetDecoration extends Decoration {
  /** Widget decoration discriminator. */
  readonly kind = "widget" as const;

  /**
   * Creates a declarative widget decoration.
   *
   * @param pos - Document position where the widget is anchored.
   * @param render - Lazy DOM materializer.
   * @param key - Stable widget identity.
   * @param spec - Widget behavior and metadata.
   */
  constructor(
    readonly pos: number,
    readonly render: (
      view: EditorView,
      getPos: () => number | undefined
    ) => HTMLElement,
    readonly key: string,
    readonly spec?: WidgetDecorationOptions & Readonly<Record<string, any>>
  ) {
    super();
  }

  /** @returns Widget document position. */
  get anchor(): number {
    return this.pos;
  }

  /**
   * @param extensionName - Optional producing extension identity.
   * @returns ProseMirror widget decoration.
   */
  toPMDecoration(extensionName?: string): PMDecoration {
    return PMDecoration.widget(this.pos, this.render, {
      ...this.spec,
      key: this.key,
      ...(extensionName === undefined ? {} : { extensionName })
    });
  }
}

/**
 * Adds extension ownership without changing an undefined authored spec.
 *
 * @param spec - Authored decoration metadata.
 * @param extensionName - Optional producing extension identity.
 * @returns Metadata passed to ProseMirror.
 */
function addExtensionName(
  spec: (Readonly<Record<string, any>> & QuireDecorationSpec) | undefined,
  extensionName: string | undefined
): (Readonly<Record<string, any>> & QuireDecorationSpec) | undefined {
  if (extensionName === undefined) {
    return spec;
  }

  return { ...spec, extensionName };
}
