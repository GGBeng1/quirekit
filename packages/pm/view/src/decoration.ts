import {
  Decoration,
  DecorationGroup,
  DecorationSet,
  InlineType,
  NodeType,
  WidgetType,
  type DecorationAttrs,
  type DecorationSource,
  type WidgetConstructor as BaseWidgetConstructor
} from "@quirekit/pm-decoration"
import type {DOMNode} from "./dom"
import type {EditorView} from "./index"

export {
  Decoration,
  DecorationGroup,
  DecorationSet,
  InlineType,
  NodeType,
  WidgetType
}
export type {DecorationAttrs, DecorationSource}

export type WidgetConstructor = BaseWidgetConstructor<EditorView, DOMNode>

// Get the decorations associated with the current props of a DOM view.
export function viewDecorations(view: EditorView): DecorationSource {
  let found: DecorationSource[] = []
  view.someProp("decorations", f => {
    let result = f(view.state)
    if (result && result != DecorationSet.empty) found.push(result)
  })
  if (view.cursorWrapper)
    found.push(DecorationSet.create(view.state.doc, [view.cursorWrapper.deco]))
  return DecorationGroup.from(found)
}
