import type {
  Fragment,
  Node as PMNode,
  ResolvedPos
} from "@quirekit/pm";
import type { QuireEditor } from "./Editor";
import type { QuireContent, QuireRange } from "./types";

/** Tiptap-compatible document navigation wrapper around a resolved position. */
export class NodePos {
  private readonly resolvedPos: ResolvedPos;

  private readonly isBlock: boolean;

  private readonly editor: QuireEditor;

  private currentNode: PMNode | null;

  private parentOverride: NodePos | null = null;

  /** Explicit depth used for block children discovered from a fragment walk. */
  actualDepth: number | null = null;

  /**
   * Creates a node position wrapper.
   *
   * @param pos - Resolved ProseMirror position.
   * @param editor - Editor that owns the document.
   * @param isBlock - Whether this wrapper represents a full block node.
   * @param node - Optional node override when the resolved position points
   * inside the represented node.
   */
  constructor(
    pos: ResolvedPos,
    editor: QuireEditor,
    isBlock = false,
    node: PMNode | null = null
  ) {
    this.resolvedPos = pos;
    this.editor = editor;
    this.isBlock = isBlock;
    this.currentNode = node;
  }

  /** Node type name. */
  private get name(): string {
    return this.node.type.name;
  }

  /** ProseMirror node represented by this position. */
  get node(): PMNode {
    return this.currentNode ?? this.resolvedPos.node();
  }

  /** DOM element at this position when the active view exposes `domAtPos`. */
  get element(): HTMLElement {
    const view = this.editor.view as unknown as {
      domAtPos?: (pos: number) => { node: globalThis.Node };
    };
    const result = view.domAtPos?.(this.pos);

    if (!result?.node) {
      throw new Error("[quirekit error]: NodePos.element requires a DOM-capable view.");
    }

    return result.node as HTMLElement;
  }

  /** Depth of this position in the document tree. */
  get depth(): number {
    return this.actualDepth ?? this.resolvedPos.depth;
  }

  /** Absolute document position. */
  get pos(): number {
    return this.resolvedPos.pos;
  }

  /** Node content fragment. */
  get content(): Fragment {
    return this.node.content;
  }

  /**
   * Replaces this node's content.
   *
   * @param content - Content accepted by `insertContentAt`.
   */
  set content(content: QuireContent) {
    let from = this.from;
    let to = this.to;

    if (this.isBlock) {
      if (this.content.size === 0) {
        console.error(
          `You can't set content on a block node. Tried to set content on ${this.name} at ${this.pos}.`
        );

        return;
      }

      from = this.from + 1;
      to = this.to - 1;
    }

    this.editor.commands.insertContentAt({ from, to }, content);
  }

  /** Node attributes. */
  get attributes(): Record<string, unknown> {
    return this.node.attrs;
  }

  /** Text content below this node. */
  get textContent(): string {
    return this.node.textContent;
  }

  /** ProseMirror node size. */
  get size(): number {
    return this.node.nodeSize;
  }

  /** Start position of this node or containing block. */
  get from(): number {
    return this.isBlock
      ? this.pos
      : this.resolvedPos.start(this.resolvedPos.depth);
  }

  /** Document range covered by this node position. */
  get range(): QuireRange {
    return {
      from: this.from,
      to: this.to
    };
  }

  /** End position of this node or containing block. */
  get to(): number {
    return this.isBlock
      ? this.pos + this.size
      : this.resolvedPos.end(this.resolvedPos.depth) + (this.node.isText ? 0 : 1);
  }

  /** Parent node position, or null at the document root. */
  get parent(): NodePos | null {
    if (this.parentOverride) {
      return this.parentOverride;
    }

    if (this.depth === 0) {
      return null;
    }

    const parentPos = this.resolvedPos.start(this.resolvedPos.depth - 1);
    const $pos = this.resolvedPos.doc.resolve(parentPos);

    return new NodePos($pos, this.editor);
  }

  /** Sibling before this node position. */
  get before(): NodePos | null {
    let $pos = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));

    if ($pos.depth !== this.depth) {
      $pos = this.resolvedPos.doc.resolve(this.from - 3);
    }

    return new NodePos($pos, this.editor);
  }

  /** Sibling after this node position. */
  get after(): NodePos | null {
    let $pos = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));

    if ($pos.depth !== this.depth) {
      $pos = this.resolvedPos.doc.resolve(this.to + 3);
    }

    return new NodePos($pos, this.editor);
  }

  /** Direct child node positions. */
  get children(): NodePos[] {
    const children: NodePos[] = [];
    const contentStart = this.depth === 0 ? 0 : this.from + 1;

    this.node.content.forEach((node, offset) => {
      const isBlock = node.isBlock;
      const isInline = node.isInline;
      const targetPos = contentStart + offset;

      if (targetPos < 0 || targetPos > this.resolvedPos.doc.nodeSize - 2) {
        return;
      }

      const $pos = this.resolvedPos.doc.resolve(targetPos);

      if (!isBlock && !isInline && $pos.depth <= this.depth) {
        return;
      }

      const childNodePos = new NodePos(
        $pos,
        this.editor,
        isBlock,
        isBlock || isInline ? node : null
      );

      if (isBlock) {
        childNodePos.actualDepth = this.depth + 1;
      }

      childNodePos.parentOverride = this;

      children.push(childNodePos);
    });

    return children;
  }

  /** First child node position. */
  get firstChild(): NodePos | null {
    return this.children[0] ?? null;
  }

  /** Last child node position. */
  get lastChild(): NodePos | null {
    return this.children.at(-1) ?? null;
  }

  /**
   * Finds the closest ancestor that matches a node type and attributes.
   *
   * @param selector - Node type name to match.
   * @param attributes - Optional attribute subset.
   * @returns Matching ancestor node position, or null.
   */
  closest(
    selector: string,
    attributes: Record<string, unknown> = {}
  ): NodePos | null {
    let currentNode = this.parent;

    while (currentNode) {
      if (
        currentNode.node.type.name === selector &&
        attributesMatch(currentNode.node.attrs, attributes)
      ) {
        return currentNode;
      }

      currentNode = currentNode.parent;
    }

    return null;
  }

  /**
   * Finds the first descendant matching a node type and attributes.
   *
   * @param selector - Node type name to match.
   * @param attributes - Optional attribute subset.
   * @returns Matching descendant, or null.
   */
  querySelector(
    selector: string,
    attributes: Record<string, unknown> = {}
  ): NodePos | null {
    return this.querySelectorAll(selector, attributes, true)[0] ?? null;
  }

  /**
   * Finds descendants matching a node type and attributes.
   *
   * @param selector - Node type name to match.
   * @param attributes - Optional attribute subset.
   * @param firstItemOnly - Whether to stop after the first match.
   * @returns Matching descendant node positions.
   */
  querySelectorAll(
    selector: string,
    attributes: Record<string, unknown> = {},
    firstItemOnly = false
  ): NodePos[] {
    let nodes: NodePos[] = [];

    for (const childPos of this.children) {
      if (firstItemOnly && nodes.length > 0) {
        return nodes;
      }

      if (
        childPos.node.type.name === selector &&
        attributesMatch(childPos.node.attrs, attributes)
      ) {
        nodes.push(childPos);
      }

      if (firstItemOnly && nodes.length > 0) {
        return nodes;
      }

      nodes = nodes.concat(childPos.querySelectorAll(selector, attributes, firstItemOnly));
    }

    return nodes;
  }

  /**
   * Merges attributes into this node.
   *
   * @param attributes - Attributes to merge.
   */
  setAttribute(attributes: Record<string, unknown>): void {
    const transaction = this.editor.state.pm.tr.setNodeMarkup(this.from, undefined, {
      ...this.node.attrs,
      ...attributes
    });

    this.editor.view.dispatch(transaction);
  }
}

/**
 * Checks whether node attributes include all requested attributes.
 *
 * @param nodeAttributes - Attributes present on a node.
 * @param attributes - Requested attribute subset.
 * @returns Whether every requested attribute matches.
 */
function attributesMatch(
  nodeAttributes: Record<string, unknown>,
  attributes: Record<string, unknown>
): boolean {
  return Object.entries(attributes).every(([key, value]) => nodeAttributes[key] === value);
}
