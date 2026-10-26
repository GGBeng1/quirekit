import type { MsfeEditor } from "../editor/types";
import { bindingProps } from "./binding";
import type { MsfeComponentHost, MsfeNodeViewHandle, MsfeNodeViewProps, ViewRecord } from "./types";
import { TaskScope } from "../tasks/scope";
import { forgetNodeView, measureNodeView } from "./geometry/runtime";

/** Owns one retained DOM mount, resource generation and renderer subscription. */
export class ViewLifetime {
  private active = true;
  private readonly scope: TaskScope;
  private request: TaskScope | undefined;
  private readonly observer: ResizeObserver | undefined;
  private readonly handle: MsfeNodeViewHandle;
  private props: MsfeNodeViewProps;

  /** @param dom - Runtime-owned wrapper. @param record - Syntax identity. @param editor - Canonical authority.
   * @param host - Optional framework store. @param report - Error sink. */
  constructor(readonly dom: HTMLElement, readonly record: ViewRecord, private readonly editor: () => MsfeEditor,
    host: MsfeComponentHost | undefined, private readonly report: (error: unknown) => void) {
    this.scope = editor().documentScope.fork(error => { this.failed(); this.report(error); });
    this.props = bindingProps(record, editor, () => this.active && !this.scope.disposed);
    this.handle = record.spec.renderer({ dom, props: this.props, host });
    const Observer = dom.ownerDocument.defaultView?.ResizeObserver;
    this.observer = Observer ? new Observer(() => {
      if (!this.active) return;
      if (this.props.status !== "loading") measureNodeView(record, dom);
      record.view.requestMeasure();
    }) : undefined;
    this.observer?.observe(dom);
    this.scope.own(() => this.destroy());
    this.load();
  }

  /** Refreshes semantic inputs while retaining the same framework component and DOM. */
  update(): void {
    const previous = this.props;
    this.props = bindingProps(this.record, this.editor, () => this.active && !this.scope.disposed);
    if (previous.attrs === this.props.attrs) {
      this.props = { ...this.props, resource: previous.resource, status: previous.status };
      this.handle.update(this.props);
      return;
    }
    this.request?.dispose();
    this.handle.update(this.props);
    this.load();
  }

  /** Starts one resource generation; stale results release without touching a newer component. */
  private load(): void {
    const load = this.record.spec.load;
    if (!load || !this.active || this.scope.disposed) return;
    forgetNodeView(this.record, this.dom);
    this.props = { ...this.props, status: "loading" };
    this.handle.update(this.props);
    const attrs = this.props.attrs;
    // A failed resource (such as a missing image file) only marks this view; it is not an editor fault.
    this.request = this.scope.fork(() => this.failed());
    this.request.acquire(signal => load(attrs, signal), resource => {
      try {
        this.props = { ...this.props, resource, status: "ready" };
        this.handle.update(this.props);
        measureNodeView(this.record, this.dom);
        this.record.view.requestMeasure();
      } catch (error) { this.failed(); this.report(error); }
    });
  }

  /** Shows the renderer's error state for this mount. */
  private failed(): void {
    if (!this.active || this.scope.disposed) return;
    this.props = { ...this.props, status: "error" }; this.handle.update(this.props);
    measureNodeView(this.record, this.dom); this.record.view.requestMeasure();
  }

  /** Unsubscribes framework and browser resources exactly once. */
  destroy(): void {
    if (!this.active) return;
    this.active = false;
    forgetNodeView(this.record, this.dom);
    this.observer?.disconnect();
    this.scope.dispose();
    this.handle.destroy();
  }
}
