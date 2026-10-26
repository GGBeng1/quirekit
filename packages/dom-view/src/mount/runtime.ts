import type {
  QuireEditorProps, QuireMountedEditorView, QuireMountedEditorViewOptions,
  QuireMountedEditorViewProps, QuireMountedEditorViewUpdateOptions
} from "@quirekit/core";
import type { EditorState, Transaction } from "@quirekit/pm";
import { EditorView, type EditorProps as NativeEditorProps } from "@quirekit/pm-view";
import { DomViewSurface } from "../view/surface";
import { createDomProps } from "./props";
import { createDomRenderers } from "./renderers";
import type { DomViewOptions, DomViewProps, DomViewRenderers } from "./types";

/** Core-owned state mounted through ProseMirror's native contenteditable runtime. */
export class DomEditorView extends DomViewSurface implements QuireMountedEditorView {
  /** Distinct from the retained HTML runtime. */
  readonly mode = "dom" as const;
  /** Native DOM view; use Core commands for document mutations. */
  readonly nativeView: EditorView;
  /** Stable Core surface identity. */
  readonly id: string;
  /** Primary, editable sibling, or read-only sibling status. */
  readonly status: QuireMountedEditorViewOptions["status"];
  /** Owned native DOM root; no hidden textarea or overlay canvas. */
  readonly elements: { readonly root: HTMLElement };
  private readonly mount: QuireMountedEditorViewOptions;
  private readonly renderers: DomViewRenderers;
  private localProps: DomViewProps;
  private appliedEditorProps: QuireEditorProps;
  private appliedEditable: boolean;
  private propsChanged = false;
  private mounting = true;
  private disposing = false;

  /**
   * Creates one native observer/input/plugin lifecycle in an owned child root.
   * @param mount - Shared editor state, container and surface identity.
   * @param options - Native direct prop overrides.
   */
  constructor(mount: QuireMountedEditorViewOptions, options: DomViewOptions = {}) {
    super();
    this.mount = mount;
    this.id = mount.id;
    this.status = mount.status;
    this.localProps = { ...options.props };
    this.appliedEditorProps = mount.editor.editorProps;
    this.appliedEditable = mount.editor.isEditable;
    this.renderers = createDomRenderers(mount.editor);
    const root = (mount.ownerDocument ?? mount.element.ownerDocument).createElement("div");
    this.elements = { root };
    mount.element.appendChild(root);
    try {
      this.nativeView = new EditorView({ mount: root }, this.createProps());
    } catch (error) {
      root.remove();
      throw error;
    }
    this.mounting = false;
    // A plugin constructor may have dispatched through Core before mount returned.
    // Catch up once, without taking a second ownership of the plugin lifecycle.
    this.update({ editor: mount.editor, reason: "transaction" });
  }

  /** @returns Effective direct props and the current native PM state. */
  get props(): QuireMountedEditorViewProps {
    // Core deliberately exposes a smaller PM view contract. Native callbacks
    // are executed by PM against its real EditorView, never against a fake DOM.
    return this.nativeView.props as unknown as QuireMountedEditorViewProps;
  }

  /**
   * Routes PM input through Core, then synchronizes the final accepted state.
   * @param transaction - Input/plugin transaction from this surface.
   */
  dispatch(transaction: Transaction): void {
    if (this.disposing || (!this.mounting && this.isDestroyed)
      || this.mount.editor.isDestroyed || this.status === "lock") return;
    this.mount.editor.dispatchTransaction(transaction);
    // Unfocused sibling refreshes may be deferred by Core. The dispatching DOM
    // observer must nevertheless see the accepted state before control returns.
    if (!this.mounting) this.update({ editor: this.mount.editor, reason: "transaction" });
  }

  /**
   * Reads native direct/plugin props in ProseMirror's own resolution order.
   * @param propName - Prop name to resolve.
   * @param f - Optional visitor; a truthy result stops resolution.
   * @returns Resolved prop or visitor result.
   */
  someProp<Name extends keyof QuireEditorProps, Result>(
    propName: Name, f: (value: NonNullable<QuireEditorProps[Name]>) => Result
  ): Result | undefined;
  /**
   * @param propName - Prop name.
   * @returns First truthy prop value.
   */
  someProp<Name extends keyof QuireEditorProps>(propName: Name): NonNullable<QuireEditorProps[Name]> | undefined;
  /**
   * @param propName - Prop name.
   * @param f - Optional visitor.
   * @returns Native resolution result.
   */
  someProp(propName: keyof QuireEditorProps, f?: (value: any) => any): any {
    const name = propName as keyof NativeEditorProps;
    return f ? this.nativeView.someProp(name, f) : this.nativeView.someProp(name);
  }

  /** @param props - Native view-local props to merge. */
  setProps(props: DomViewProps): void;
  /** @param props - Renderer-neutral props from Core consumers. */
  setProps(props: Partial<QuireEditorProps>): void;
  /** @param props - Direct props; state and dispatch remain adapter-owned. */
  setProps(props: DomViewProps | Partial<QuireEditorProps>): void {
    this.localProps = { ...this.localProps, ...props } as DomViewProps;
    this.propsChanged = true;
    this.update({ editor: this.mount.editor, reason: "transaction" });
  }

  /** @param state - Core's accepted state; arbitrary replacement is disallowed. */
  updateState(state: EditorState): void {
    if (state !== this.mount.editor.state.pm) {
      throw new RangeError("Native DOM view cannot replace shared Core state; dispatch a transaction instead.");
    }
    if (!this.isDestroyed && !this.disposing) this.nativeView.updateState(state);
  }

  /** @param _options - Core refresh notification; state is read from its canonical owner. */
  update(_options: QuireMountedEditorViewUpdateOptions): void {
    if (this.isDestroyed || this.disposing) return;
    const { editor } = this.mount;
    if (this.propsChanged || this.appliedEditorProps !== editor.editorProps || this.appliedEditable !== editor.isEditable) {
      this.propsChanged = false;
      this.appliedEditorProps = editor.editorProps;
      this.appliedEditable = editor.isEditable;
      this.nativeView.update(this.createProps());
    } else if (this.nativeView.state !== editor.state.pm) {
      this.nativeView.updateState(editor.state.pm);
    }
  }

  /** Releases the native lifecycle exactly once and removes only the owned root. */
  destroy(): void {
    if (this.isDestroyed || this.disposing) return;
    this.disposing = true;
    this.nativeView.destroy();
    this.elements.root.remove();
  }

  /** @returns Core-authoritative native props for this mount. */
  private createProps() {
    return createDomProps(this.mount, this.localProps, this.renderers, transaction => this.dispatch(transaction));
  }
}
