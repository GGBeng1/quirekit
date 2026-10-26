import type { ClassicEditorRenderContext } from "@classic/types";
import { selectClassicSearchMatch } from "./query";
import type { ClassicSearchSession } from "./session";
import type { ClassicSearchMode } from "./types";

/** Page-level search action bound to a shortcut. */
type ClassicSearchShortcutAction = "find" | "replace" | "next" | "previous";

/**
 * Maps one key press to a search action using platform conventions.
 *
 * macOS follows Cmd+F / Cmd+G / Cmd+Shift+G / Cmd+Shift+H; Ctrl+H stays with the
 * editor keymap there because text fields use it to delete backward. Other
 * platforms use Ctrl+F / Ctrl+G / Ctrl+Shift+G / Ctrl+H and F3 / Shift+F3; inside the
 * document Shift+F3 stays with Word's Change Case.
 *
 * @param event - Key press.
 * @param mac - Whether the platform is macOS or iOS.
 * @returns Search action, or null for unrelated keys.
 */
function resolveShortcut(event: KeyboardEvent, mac: boolean): ClassicSearchShortcutAction | null {
  if (event.altKey) return null;
  const key = event.key.toLowerCase();
  if (!mac && key === "f3" && !event.ctrlKey && !event.metaKey) {
    return event.shiftKey ? "previous" : "next";
  }
  const primary = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!primary) return null;
  if (key === "f" && !event.shiftKey) return "find";
  if (key === "g") return event.shiftKey ? "previous" : "next";
  if (key === "h" && event.shiftKey === mac) return "replace";
  return null;
}

/**
 * Takes over the browser find shortcuts for one Classic root.
 *
 * The editor keymap only sees keys while the editor has focus; this capture
 * listener also covers focus in the ribbon, the search card, or the page body,
 * so neither the native find bar nor browser history opens over the canvas.
 * Focus inside another root or unrelated page content keeps the browser behaviour.
 *
 * @param readContext - Reads the latest mounted product context.
 * @param session - Root-local search session.
 * @returns Listener cleanup.
 */
export function installClassicSearchShortcut(
  readContext: () => ClassicEditorRenderContext,
  session: ClassicSearchSession
): () => void {
  const ownerDocument = readContext().ownerDocument;
  const mac = /Mac|iPhone|iPad/u.test(ownerDocument.defaultView?.navigator.platform ?? "");

  /**
   * Opens the card in a mode.
   *
   * @param mode - Requested mode.
   * @returns Whether a host accepted the request.
   */
  const open = (mode: ClassicSearchMode): boolean =>
    session.open(readContext().editor, mode, ownerDocument);

  /**
   * Moves to an adjacent match, opening the card first so highlights stay dismissible.
   *
   * @param direction - Navigation direction.
   * @returns Whether the shortcut was handled.
   */
  const navigate = (direction: "next" | "previous"): boolean => {
    if (!session.state.open && !open("find")) return false;
    if (session.state.findText.length > 0) {
      selectClassicSearchMatch(readContext().editor, session.state, { kind: direction });
    }
    return true;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const action = resolveShortcut(event, mac);
    if (action === null) return;
    const context = readContext();
    const target = event.target;
    const owned = target === ownerDocument.body
      || target === ownerDocument.documentElement
      || (target instanceof Node && context.root.contains(target));
    if (!owned) return;
    if (event.key === "F3" && event.shiftKey && target instanceof Node && context.editor.view.dom.contains(target)) return;
    const handled = action === "next" || action === "previous" ? navigate(action) : open(action);
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
  };
  ownerDocument.addEventListener("keydown", handleKeydown, true);
  return () => ownerDocument.removeEventListener("keydown", handleKeydown, true);
}
