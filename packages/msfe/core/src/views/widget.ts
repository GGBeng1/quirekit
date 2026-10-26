import { WidgetType, type EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "../editor/types";
import { ViewLifetime } from "./lifetime";
import type { MsfeComponentHost, ViewRecord } from "./types";

const lifetimes = new WeakMap<HTMLElement, ViewLifetime>();

/** Bridges retained CodeMirror widgets to one renderer lifecycle. */
export class SourceViewWidget extends WidgetType {
  private readonly version: number;
  /** @param record - Stable mapped syntax. @param editor - Canonical API. @param host - Framework host. @param report - Error sink. */
  constructor(private readonly record: ViewRecord, private readonly editor: () => MsfeEditor,
    private readonly host: MsfeComponentHost | undefined, private readonly report: (error: unknown) => void) {
    super(); this.version = record.version;
  }
  /** @param other - Previous widget description. @returns Whether semantic rendering is unchanged. */
  eq(other: SourceViewWidget): boolean { return this.record.id === other.record.id && this.version === other.version; }
  /** @param view - Current input owner. @returns Inline, non-editable component boundary. */
  toDOM(view: EditorView): HTMLElement {
    const dom = view.dom.ownerDocument.createElement("span");
    dom.className = "msfe-node-view";
    dom.contentEditable = "false";
    dom.dataset.msfeView = this.record.id;
    dom.dataset.msfeKind = this.record.name;
    lifetimes.set(dom, new ViewLifetime(dom, this.record, this.editor, this.host, this.report));
    return dom;
  }
  /** @param dom - Retained wrapper. @returns Whether the same component can consume new inputs. */
  updateDOM(dom: HTMLElement): boolean {
    const lifetime = lifetimes.get(dom);
    if (lifetime?.record.id !== this.record.id) return false;
    lifetime.update(); return true;
  }
  /** @returns Widget controls own their DOM events; editable text remains outside. */
  ignoreEvent(): boolean { return true; }
  /** @param dom - Wrapper removed by CodeMirror. */
  destroy(dom: HTMLElement): void { lifetimes.get(dom)?.destroy(); lifetimes.delete(dom); }
}
