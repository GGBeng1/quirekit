import { insertSourceBlock, sourceBlockAt, sourceBlankLineAt, insertAtSourceBlankLine, replaceSourceBlock, withSourceOperation } from "@quirekit/msfe-core";
import { blockInsertionCommand } from "./command";
import type { MdBlockInsertionRequest, MdBlockInsertionWriter } from "./types";

/** @param request - Versioned original menu intent. @returns One mapped source writer, or null for an obsolete menu. */
export function createBlockInsertionWriter(request: MdBlockInsertionRequest): MdBlockInsertionWriter | null {
  const { editor, target } = request.controls;
  if (!editor.can(blockInsertionCommand(request, "text"), target)) return null;
  const range = request.side === "at" ? request.controls.line : request.controls.block;
  // Own the blank line's terminating separator (or preceding separator at EOF).
  // Removing that line must invalidate its intent, not silently reuse the next gap.
  const suffix = request.side === "at" && range.to < editor.state.doc.length ? 1 : 0;
  const prefix = request.side === "at" && !suffix && range.from > 0 ? 1 : 0;
  const anchor = editor.captureAnchor({ from: range.from - prefix, to: range.to + suffix },
    request.side === "before" || request.side === "after" ? {} : { inclusiveStart: true, inclusiveEnd: true }), lifetime = editor.documentScope;
  const operation = { kind: "block.insert", facts: { type: request.value.replace(/^insert-/u, "") } };
  let committed = false, released = false;
  return { anchor,
    /** @param source - Feature-owned canonical serialization. @returns One accepted sibling insertion or empty-line replacement. */
    commit(source) {
      const mapped = anchor.getRange(), target = anchor.target();
      if (released || committed || lifetime.disposed || !mapped || !target || editor.state.readOnly || editor.mode === "locked") return false;
      if (request.side === "at") {
        const line = sourceBlankLineAt(editor.state, mapped.from + prefix);
        if (!line || line.from !== mapped.from + prefix || line.to !== mapped.to - suffix) return false;
        committed = editor.run(withSourceOperation(insertAtSourceBlankLine(line, source), operation), target).ok;
      } else {
        const current = sourceBlockAt(editor.state, mapped.from);
        if (!current || current.from !== mapped.from || current.to !== mapped.to || current.name !== request.controls.block.name) return false;
        committed = editor.run(withSourceOperation(request.side === "replace" ? replaceSourceBlock(current, source) : insertSourceBlock(current, request.side, source), operation), target).ok;
      }
      return committed;
    },
    /** Retires source ownership on dismissal, unmount and after successful confirmation. */
    release() { if (!released) { released = true; anchor.release(); } },
  };
}
