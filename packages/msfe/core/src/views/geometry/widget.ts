import { WidgetType, type EditorView } from "@quirekit/cm-view";

/** A zero-width layout strut keeps a measured replacement's height in CM's pre-viewport height map. */
export class NodeHeightWidget extends WidgetType {
  /** @param height - Measured wrapper height in CSS pixels. @param alignment - The wrapper's native inline alignment. */
  constructor(private readonly height: number, private readonly alignment: string) { super(); }
  /** @returns Height known before viewport projection mounts the real component. */
  get estimatedHeight(): number { return this.height; }
  /** @param other - Prior reservation. @returns Whether its geometry is unchanged. */
  eq(other: NodeHeightWidget): boolean { return this.height === other.height && this.alignment === other.alignment; }
  /** @param view - Native DOM owner. @returns Non-interactive geometry with no visible or copyable characters. */
  toDOM(view: EditorView): HTMLElement {
    const dom = view.dom.ownerDocument.createElement("span");
    dom.className = "msfe-node-height"; dom.setAttribute("aria-hidden", "true"); dom.contentEditable = "false";
    Object.assign(dom.style, { display: "inline-block", width: "0", height: `${this.height}px`, verticalAlign: this.alignment, pointerEvents: "none" });
    return dom;
  }
}
