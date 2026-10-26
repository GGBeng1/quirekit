import {keydownHandler} from "@quirekit/pm-keymap"
import {TextSelection, NodeSelection, Plugin, type Command, type EditorState, type EditorView} from "@quirekit/pm-state"
import {Fragment, Slice, type ResolvedPos} from "@quirekit/pm-model"
import {Decoration, DecorationSet} from "@quirekit/pm-decoration"

import {GapCursor} from "./gapcursor"

/// Create a gap cursor plugin. When enabled, this will capture clicks
/// near and arrow-key-motion past places that don't have a normally
/// selectable position nearby, and create a gap cursor selection for
/// them. The cursor is drawn as an element with class
/// `ProseMirror-gapcursor`. You can either include
/// `style/gapcursor.css` from the package's directory or add your own
/// styles to make it visible.
export function gapCursor(): Plugin {
  return new Plugin({
    props: {
      decorations: drawGapCursor,

      createSelectionBetween(_view: unknown, $anchor: ResolvedPos, $head: ResolvedPos) {
        return $anchor.pos == $head.pos && GapCursor.valid($head) ? new GapCursor($head) : null
      },

      handleClick,
      handleKeyDown,
      handleDOMEvents: {beforeinput: beforeinput as any}
    }
  })
}

export {GapCursor}

const handleKeyDown = keydownHandler({
  "ArrowLeft": arrow("horiz", -1),
  "ArrowRight": arrow("horiz", 1),
  "ArrowUp": arrow("vert", -1),
  "ArrowDown": arrow("vert", 1)
})

function arrow(axis: "vert" | "horiz", dir: number): Command {
  const dirStr = axis == "vert" ? (dir > 0 ? "down" : "up") : (dir > 0 ? "right" : "left")
  return function(state, dispatch, view) {
    let sel = state.selection
    let $start = dir > 0 ? sel.$to : sel.$from, mustMove = sel.empty
    if (sel instanceof TextSelection) {
      if (!view!.endOfTextblock(dirStr) || $start.depth == 0) return false
      mustMove = false
      $start = state.doc.resolve(dir > 0 ? $start.after() : $start.before())
    }
    let $found = GapCursor.findGapCursorFrom($start, dir, mustMove)
    if (!$found) return false
    if (dispatch) dispatch(state.tr.setSelection(new GapCursor($found)))
    return true
  }
}

interface GapCursorClickableView extends EditorView {
  posAtCoords(coords: {left: number, top: number}): {pos: number, inside: number} | null
}

function handleClick(view: GapCursorClickableView, pos: number, event: MouseEvent) {
  if (!view || !view.editable) return false
  let $pos = view.state.doc.resolve(pos)
  if (!GapCursor.valid($pos)) return false
  let clickPos = view.posAtCoords({left: event.clientX, top: event.clientY})
  if (clickPos && clickPos.inside > -1 && NodeSelection.isSelectable(view.state.doc.nodeAt(clickPos.inside)!)) return false
  view.dispatch(view.state.tr.setSelection(new GapCursor($pos)))
  return true
}

// This is a hack that, when a composition starts while a gap cursor
// is active, quickly creates an inline context for the composition to
// happen in, to avoid it being aborted by the DOM selection being
// moved into a valid position.
function beforeinput(view: EditorView, event: InputEvent) {
  if (event.inputType != "insertCompositionText" || !(view.state.selection instanceof GapCursor)) return false

  let {$from} = view.state.selection
  let insert = $from.parent.contentMatchAt($from.index()).findWrapping(view.state.schema.nodes.text)
  if (!insert) return false

  let frag = Fragment.empty
  for (let i = insert.length - 1; i >= 0; i--) frag = Fragment.from(insert[i].createAndFill(null, frag))
  let tr = view.state.tr.replace($from.pos, $from.pos, new Slice(frag, 0, 0))
  tr.setSelection(TextSelection.near(tr.doc.resolve($from.pos + 1)))
  view.dispatch(tr)
  return false
}

function drawGapCursor(state: EditorState) {
  if (!(state.selection instanceof GapCursor)) return null
  let node = document.createElement("div")
  node.className = "ProseMirror-gapcursor"
  return DecorationSet.create(state.doc, [Decoration.widget(state.selection.head, node, {key: "gapcursor"})])
}
