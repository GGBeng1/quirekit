import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  DescriptorRuntimeOptions,
  HtmlContainerDesc,
  HtmlDescriptor,
  HtmlDescriptorDirtyState,
  HtmlDescriptorKind,
  HtmlDescriptorMount
} from "./types";

/** Shared retained lifecycle for concrete descriptor variants. */
export abstract class HtmlDescriptorRuntime {
  /** Descriptor discriminator supplied by a concrete runtime. */
  abstract readonly kind: HtmlDescriptorKind;
  /** Stable descriptor identity. */
  readonly id: string;
  /** Retained parent, or null for a root. */
  parent: HtmlContainerDesc | null;
  /** Current detachable browser product. */
  mount: HtmlDescriptorMount | null;
  /** Canonical source identity. */
  readonly source: HtmlContainerDesc["source"];
  /** Current mapped document range. */
  range: QuireDocumentRange;
  /** Current geometry epoch. */
  geometryEpoch = 0;
  /** Whether this descriptor has released ownership. */
  destroyed = false;
  /** Current reconciliation state. */
  private reconciliationState: HtmlDescriptorDirtyState = "clean";

  /** @inheritdoc */
  get dirtyState(): HtmlDescriptorDirtyState {
    return this.reconciliationState;
  }

  /**
   * Creates shared descriptor lifecycle state.
   *
   * @param options - Identity, ownership, range, source, and initial mount.
   */
  constructor(options: DescriptorRuntimeOptions) {
    this.id = options.id;
    this.parent = options.parent;
    this.mount = options.mount;
    this.source = options.source;
    this.range = options.range;
  }

  /** @inheritdoc */
  attachMount(mount: HtmlDescriptorMount): void {
    if (this.destroyed) {
      throw new RangeError(`Cannot mount destroyed HTML descriptor "${this.id}".`);
    }
    this.mount = mount;
  }

  /** @inheritdoc */
  detachMount(): HtmlDescriptorMount | null {
    const mount = this.mount;

    if (!mount) {
      return null;
    }
    removeMountedNode(mount.dom);
    this.mount = null;
    return mount;
  }

  /** @inheritdoc */
  setDirtyState(state: HtmlDescriptorDirtyState): void {
    if (this.destroyed && state !== "invalid") {
      throw new RangeError(`Cannot dirty destroyed HTML descriptor "${this.id}".`);
    }
    this.reconciliationState = state;
  }

  /** @inheritdoc */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    for (const child of this.childrenForDestroy()) {
      child.destroy();
    }
    this.detachMount();
    this.parent = null;
    this.destroyed = true;
  }

  /**
   * Returns retained children that must release ownership with this descriptor.
   *
   * @returns Retained descendants owned by this lifecycle.
   */
  protected childrenForDestroy(): readonly HtmlDescriptor[] {
    return [];
  }
}

/** Shared child ownership for concrete container descriptors. */
export abstract class HtmlContainerDescriptorRuntime extends HtmlDescriptorRuntime {
  /** Mutable child storage used only by descriptor construction/reconciliation. */
  readonly mutableChildren: HtmlDescriptor[] = [];

  /**
   * Readonly retained children exposed to consumers.
   *
   * @returns Retained children in document order.
   */
  get children(): readonly HtmlDescriptor[] {
    return this.mutableChildren;
  }

  /** @inheritdoc */
  adoptChildren(children: readonly HtmlDescriptor[]): void {
    if (this.destroyed) {
      throw new RangeError(`Cannot adopt children into destroyed HTML descriptor "${this.id}".`);
    }
    this.mutableChildren.length = 0;
    for (const child of children) {
      child.parent = this as unknown as HtmlContainerDesc;
      this.mutableChildren.push(child);
    }
  }

  /** @inheritdoc */
  protected override childrenForDestroy(): readonly HtmlDescriptor[] {
    return this.mutableChildren;
  }
}

/**
 * Removes a mounted node from its parent in browser and fake-DOM environments.
 *
 * @param node - Mounted DOM node to detach.
 */
function removeMountedNode(node: globalThis.Node): void {
  const removable = node as globalThis.Node & { remove?: () => void };

  removable.remove?.();
}
