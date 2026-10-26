import { WidgetType } from "@quirekit/pm";
import type { QuireLayoutDomOverlay } from "../layout";
import type {
  QuireDecorationSourceView,
  QuireDecorationWidget
} from "./types";

/**
 * Converts decoration widgets into DOM overlay descriptors.
 *
 * @param widgets - Widget decoration descriptors from the lane.
 * @param view - Mounted view passed to PM widget `toDOM` callbacks.
 * @returns DOM overlays for widget decorations.
 */
export function createQuireDecorationWidgetDomOverlays(
  widgets: readonly QuireDecorationWidget[],
  view: QuireDecorationSourceView | undefined
): readonly QuireLayoutDomOverlay[] {
  return widgets.flatMap((widget) => {
    const overlay = createQuireDecorationWidgetDomOverlay(widget, view);

    return overlay ? [overlay] : [];
  });
}

/**
 * Converts one decoration widget into a DOM overlay descriptor.
 *
 * @param widget - Widget decoration descriptor.
 * @param view - Mounted view passed to PM widget `toDOM` callbacks.
 * @returns DOM overlay descriptor or null when no widget DOM can be resolved.
 */
function createQuireDecorationWidgetDomOverlay(
  widget: QuireDecorationWidget,
  view: QuireDecorationSourceView | undefined
): QuireLayoutDomOverlay | null {
  if (!(widget.decoration.type instanceof WidgetType)) {
    return null;
  }

  const node = resolveWidgetDomNode(widget, view);

  if (node === null) {
    return null;
  }

  return {
    id: `${widget.id}:dom-overlay`,
    key: typeof widget.decoration.spec?.key === "string"
      ? widget.decoration.spec.key
      : undefined,
    range: widget.range,
    rect: widget.rect,
    node,
    destroy: (mountedNode) => {
      widget.decoration.type.destroy(mountedNode);
    },
    ariaLabel: typeof widget.decoration.spec?.ariaLabel === "string"
      ? widget.decoration.spec.ariaLabel
      : undefined
  };
}

/**
 * Resolves the DOM node produced by a widget decoration.
 *
 * @param widget - Widget decoration descriptor.
 * @param view - Mounted view passed to PM widget `toDOM` callbacks.
 * @returns DOM node-like value or null.
 */
function resolveWidgetDomNode(
  widget: QuireDecorationWidget,
  view: QuireDecorationSourceView | undefined
): unknown | null {
  const type = widget.decoration.type;

  if (!(type instanceof WidgetType)) {
    return null;
  }

  return typeof type.toDOM === "function"
    ? type.toDOM(view, () => widget.decoration.from)
    : type.toDOM;
}
