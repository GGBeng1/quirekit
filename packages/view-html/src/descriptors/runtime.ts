import type { Mark, Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import {
  HtmlContainerDescriptorRuntime,
  HtmlDescriptorRuntime
} from "./lifecycle";
import type {
  DescriptorRuntimeOptions,
  HtmlDocumentDesc,
  HtmlMarkDesc,
  HtmlMarkDescriptorRuntimeOptions,
  HtmlNodeDesc,
  HtmlTextDesc
} from "./types";

/** Runtime implementation of the retained document descriptor. */
export class HtmlDocumentDescriptorRuntime
  extends HtmlContainerDescriptorRuntime
  implements HtmlDocumentDesc {
  /** @inheritdoc */
  readonly kind = "document" as const;
  /** @inheritdoc */
  node: ProseMirrorNode;

  /**
   * Creates a retained document descriptor runtime.
   *
   * @param options - Document node and shared lifecycle inputs.
   */
  constructor(options: Omit<DescriptorRuntimeOptions, "parent"> & { readonly node: ProseMirrorNode }) {
    super({ ...options, parent: null });
    this.node = options.node;
  }

  /** @inheritdoc */
  updateNode(node: ProseMirrorNode, range: QuireDocumentRange): void {
    if (node.type !== this.node.type) {
      throw new RangeError("HtmlDocumentDesc.updateNode requires the document node type.");
    }
    this.node = node;
    this.range = range;
  }
}

/** Runtime implementation of a retained schema node descriptor. */
export class HtmlNodeDescriptorRuntime
  extends HtmlContainerDescriptorRuntime
  implements HtmlNodeDesc {
  /** @inheritdoc */
  readonly kind = "node" as const;
  /** @inheritdoc */
  node: ProseMirrorNode;

  /**
   * Creates a retained schema node descriptor runtime.
   *
   * @param options - Schema node and shared lifecycle inputs.
   */
  constructor(options: DescriptorRuntimeOptions & { readonly node: ProseMirrorNode }) {
    super(options);
    this.node = options.node;
  }

  /** @inheritdoc */
  updateNode(node: ProseMirrorNode, range: QuireDocumentRange): void {
    if (node.isText || node.type !== this.node.type) {
      throw new RangeError("HtmlNodeDesc.updateNode requires a compatible non-text node type.");
    }
    this.node = node;
    this.range = range;
  }

}

/** Runtime implementation of a direct retained text owner. */
export class HtmlTextDescriptorRuntime
  extends HtmlDescriptorRuntime
  implements HtmlTextDesc {
  /** @inheritdoc */
  readonly kind = "text" as const;
  /** @inheritdoc */
  node: ProseMirrorNode;

  /**
   * Creates a retained text descriptor runtime.
   *
   * @param options - Text node and shared lifecycle inputs.
   */
  constructor(options: DescriptorRuntimeOptions & { readonly node: ProseMirrorNode }) {
    super(options);
    this.node = options.node;
  }

  /** @inheritdoc */
  updateText(
    node: ProseMirrorNode,
    range: QuireDocumentRange,
    patchDOM = true
  ): void {
    if (!node.isText) {
      throw new RangeError("HtmlTextDesc.updateText requires a text node.");
    }
    if (range.to - range.from !== node.nodeSize) {
      throw new RangeError(
        `HtmlTextDesc.updateText range length must match text node size for "${this.id}".`
      );
    }
    this.node = node;
    this.range = range;
    if (patchDOM && this.mount) {
      this.mount.dom.nodeValue = node.text ?? "";
    }
  }
}

/** Runtime implementation of a retained mark wrapper. */
export class HtmlMarkDescriptorRuntime
  extends HtmlContainerDescriptorRuntime
  implements HtmlMarkDesc {
  /** @inheritdoc */
  readonly kind = "mark" as const;
  /** @inheritdoc */
  mark: Mark;
  /** @inheritdoc */
  readonly factory: HtmlMarkDesc["factory"];
  /** @inheritdoc */
  readonly host: HtmlMarkDesc["host"];

  /**
   * Creates a retained mark descriptor runtime.
   *
   * @param options - Mark and shared lifecycle inputs.
   */
  constructor(options: HtmlMarkDescriptorRuntimeOptions) {
    super(options);
    this.mark = options.mark;
    this.factory = options.factory ?? null;
    this.host = options.host ?? null;
  }

  /** @inheritdoc */
  updateMark(mark: Mark, range: QuireDocumentRange): void {
    if (mark.type !== this.mark.type) {
      throw new RangeError("HtmlMarkDesc.updateMark requires a compatible mark type.");
    }
    this.mark = mark;
    this.range = range;
  }

  /** @inheritdoc */
  override destroy(): void {
    if (this.destroyed) {
      return;
    }
    super.destroy();
    this.host?.destroy();
  }
}
