import type { LayerMarker, RectangleMarker } from "@quirekit/cm-view";
import type { ResolvedParticipant } from "../types";

/** Measured passive DOM marker; all layout reading belongs to the layer's preceding read phase. */
export class PresenceMarker implements LayerMarker {
  /** @param document - Owning DOM realm. @param peer - Bounded display data. @param rect - CM document-relative CSS rectangle.
   * @param kind - Caret, hidden-source boundary or text selection. @param flip - Keep a name label within the right viewport edge. */
  constructor(private readonly document: Document, private readonly peer: ResolvedParticipant, private readonly rect: RectangleMarker,
    private readonly kind: "caret" | "boundary" | "selection", private readonly flip = false) {}

  /** @param other - Previous measured marker. @returns Whether pixels and text are unchanged. */
  eq(other: LayerMarker): boolean {
    return other instanceof PresenceMarker && this.peer.id === other.peer.id && this.peer.user.name === other.peer.user.name
      && this.peer.user.color === other.peer.user.color && this.kind === other.kind && this.flip === other.flip && this.rect.eq(other.rect);
  }

  /** @returns A passive node; collaborator content is always written as plain text. */
  draw(): HTMLElement {
    const dom = this.document.createElement("div");
    dom.className = this.kind === "selection" ? "msfe-presence-selection" : "msfe-presence-caret";
    dom.dataset.presenceId = this.peer.id; dom.dataset.presenceKind = this.kind;
    if (this.kind !== "selection") {
      const label = dom.appendChild(this.document.createElement("span")); label.className = "msfe-presence-label";
    }
    this.paint(dom); return dom;
  }

  /** @param dom - Existing marker. @param old - Its preceding measurement. @returns Whether this node can be reused. */
  update(dom: HTMLElement, old: LayerMarker): boolean {
    if (!(old instanceof PresenceMarker) || this.peer.id !== old.peer.id || this.kind !== old.kind) return false;
    this.paint(dom); return true;
  }

  /** @param dom - Node updated only during the CM write phase. */
  private paint(dom: HTMLElement): void {
    const { left, top, width, height } = this.rect;
    Object.assign(dom.style, { left: `${left}px`, top: `${top}px`, width: `${width ?? 0}px`, height: `${height}px` });
    dom.style.setProperty("--msfe-peer-color", this.peer.user.color);
    if (this.kind === "selection") dom.style.backgroundColor = `${this.peer.user.color}26`;
    else {
      const label = dom.firstElementChild as HTMLElement;
      label.textContent = `${this.peer.user.name}${this.kind === "boundary" ? " ◇" : ""}`;
      label.style.transform = this.flip ? "translateX(-100%)" : "none";
    }
  }
}
