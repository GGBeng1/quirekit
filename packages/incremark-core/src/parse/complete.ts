import type { EditorState } from "@quirekit/cm-state";
import { MarkdownStream } from "./session";
import type { MarkdownOptions } from "../types";

/**
 * Completes the canonical grammar for deterministic static rendering, without mounting a view.
 * @param content - Exact source; the returned state uses CM logical newlines.
 * @param options - Pure syntax and semantic extensions.
 * @returns Accepted source snapshot, reusable by the Vue renderer or native consumers.
 */
export function parseMarkdown(content: string, options: MarkdownOptions = {}): EditorState {
  const stream = new MarkdownStream(options);
  stream.update(content);
  if (!stream.advance(Number.MAX_SAFE_INTEGER)) throw new Error("incremark-incomplete-static-parse");
  return stream.state;
}
