import { DecorationSet, type Decoration, type DecorationSource, type Node as ProseMirrorNode } from "@quirekit/pm";
import type { HtmlContainerDesc } from "../descriptors";
import { htmlDescriptorContentRange } from "../reconcile/ownership/descriptor-tree";
import { resolveHtmlContainerDecorationSource } from "./decoration-source";
import { createHtmlInlineChildren } from "./inline/children";
import type {
  HtmlDecoratedChild,
  HtmlNodeViewEnvironment
} from "./types";

/**
 * Iterates canonical direct children and keyed widgets in retained DOM order.
 *
 * @param parent - Retained parent whose content boundary receives the products.
 * @param node - Canonical PM node represented by the parent.
 * @param environment - Optional live decoration environment.
 * @returns Direct semantic and keyed-widget products with absolute ranges.
 */
export function createHtmlDecoratedChildren(
  parent: HtmlContainerDesc,
  node: ProseMirrorNode,
  environment: HtmlNodeViewEnvironment | undefined
): HtmlDecoratedChild[] {
  const contentStart = htmlDescriptorContentRange(parent).from;
  const source = environment
    ? resolveHtmlContainerDecorationSource(environment, parent)
    : DecorationSet.empty;
  const localDecorations = source.locals(node);
  const widgets = collectLocalKeyedWidgets(source, node);
  const children: HtmlDecoratedChild[] = [];
  let widgetIndex = 0;

  node.forEach((child, offset) => {
    while (widgets[widgetIndex] && widgets[widgetIndex]!.position <= offset) {
      children.push(createWidgetChild(widgets[widgetIndex]!, contentStart));
      widgetIndex += 1;
    }
    if (!child.isText) {
      children.push(createNodeChild(
        child,
        contentStart + offset,
        localDecorations,
        source,
        offset
      ));
      return;
    }
    let textOffset = offset;
    const textEnd = offset + child.nodeSize;

    while (widgets[widgetIndex] && widgets[widgetIndex]!.position < textEnd) {
      const widget = widgets[widgetIndex]!;

      if (widget.position > textOffset) {
        children.push(...createHtmlInlineChildren(
          child.cut(textOffset - offset, widget.position - offset),
          contentStart + textOffset, contentStart, localDecorations
        ));
      }
      children.push(createWidgetChild(widget, contentStart));
      textOffset = widget.position;
      widgetIndex += 1;
    }
    if (textOffset < textEnd) {
      children.push(...createHtmlInlineChildren(
        child.cut(textOffset - offset, textEnd - offset),
        contentStart + textOffset, contentStart, localDecorations
      ));
    }
  });
  while (widgets[widgetIndex]) {
    children.push(createWidgetChild(widgets[widgetIndex]!, contentStart));
    widgetIndex += 1;
  }
  return children;
}

/** Local keyed widget facts before absolute range projection. */
interface LocalWidget {
  /** Stable widget identity. */
  readonly key: string;
  /** Parent-local collapsed position. */
  readonly position: number;
  /** Mapping and ordering association. */
  readonly side: number;
  /** Canonical widget decoration. */
  readonly decoration: Decoration;
}

/**
 * Collects keyed widgets local to one PM node's direct content.
 *
 * @param source - Decoration source localized to the node.
 * @param node - PM node whose local decorations are inspected.
 * @returns Stable keyed widgets in local DOM order.
 */
function collectLocalKeyedWidgets(
  source: DecorationSource,
  node: ProseMirrorNode
): LocalWidget[] {
  return source.locals(node)
    .flatMap((decoration): LocalWidget[] => {
      const spec = readRecord(decoration.spec);

      return decoration.widget && typeof spec?.key === "string"
        ? [{
            key: spec.key,
            position: decoration.from,
            side: readWidgetSide(decoration),
            decoration
          }]
        : [];
    })
    .sort((left, right) => (
      left.position - right.position || left.side - right.side || left.key.localeCompare(right.key)
    ));
}

/**
 * Creates one non-text direct child with exact PM decoration semantics.
 *
 * @param node - Canonical non-text child.
 * @param from - Absolute outer start.
 * @param localDecorations - Decorations local to the parent node.
 * @param source - Decoration source localized to the parent node.
 * @param offset - Parent-local child offset.
 * @returns Decorated semantic child.
 */
function createNodeChild(
  node: ProseMirrorNode,
  from: number,
  localDecorations: readonly Decoration[],
  source: DecorationSource,
  offset: number
): HtmlDecoratedChild {
  const end = offset + node.nodeSize;

  return {
    kind: "node",
    node,
    range: { from, to: from + node.nodeSize },
    innerDecorations: source.forChild(offset, node),
    outerDecorations: localDecorations.filter((decoration) => (
      !decoration.widget &&
      decoration.from <= offset &&
      decoration.to >= end &&
      (!node.isInline || node.isLeaf || !decoration.inline)
    ))
  };
}

/**
 * Projects one local widget to an absolute collapsed boundary.
 *
 * @param widget - Local keyed widget facts.
 * @param contentStart - Absolute parent content start.
 * @returns Absolute widget child.
 */
function createWidgetChild(widget: LocalWidget, contentStart: number): HtmlDecoratedChild {
  return {
    kind: "widget",
    range: {
      from: contentStart + widget.position,
      to: contentStart + widget.position
    },
    widget: {
      ...widget,
      position: contentStart + widget.position
    }
  };
}

/**
 * Reads the canonical side from widget decoration internals.
 *
 * @param decoration - Keyed widget decoration.
 * @returns Numeric ordering and mapping side.
 */
function readWidgetSide(decoration: Decoration): number {
  const type = readRecord(decoration.type);

  return typeof type?.side === "number" ? type.side : 0;
}

/**
 * Narrows untrusted PM internals to a property record.
 *
 * @param value - Runtime value to inspect.
 * @returns Property record, or null.
 */
function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}
