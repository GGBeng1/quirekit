/** Kinds shared by every editor; features add their own feature-named kinds. */
export const activityKinds = {
  textEdit: "text.edit", textPaste: "text.paste", textCut: "text.cut", textDelete: "text.delete", textDrop: "text.drop",
  blockInsert: "block.insert", blockMove: "block.move", blockRemove: "block.remove", blockConvert: "block.convert",
  undo: "undo", redo: "redo", documentImport: "document.import", documentUpdate: "document.update",
  commentAdd: "comment.add", commentReply: "comment.reply", commentResolve: "comment.resolve", commentReopen: "comment.reopen", commentRemove: "comment.remove",
  sessionJoin: "session.join", sessionLeave: "session.leave", versionCreate: "version.create", versionRestore: "version.restore",
} as const;

const systemPrefixes = ["session", "version"];

/**
 * @param kind - Event kind.
 * @param name - Kind or kind namespace, e.g. `comment`.
 * @returns Whether the kind equals the name or is nested under it.
 */
export function kindMatches(kind: string, name: string): boolean {
  return kind === name || kind.startsWith(`${name}.`);
}

/** @param kind - Event kind. @returns Whether it is a system notice (sessions, versions) rather than an edit. */
export function isSystemKind(kind: string): boolean {
  return systemPrefixes.some(prefix => kindMatches(kind, prefix));
}
