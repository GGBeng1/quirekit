import { MarkdownStream } from "@quirekit/incremark";
import { createMdEditorExtensions } from "../../editor";
import type { MdEditorExtensionOptions } from "../../types";

/** Compatibility session sharing the public streaming runtime with the editor product preset. */
export class MdProseStream extends MarkdownStream {
  /** @param options - Product grammar and trusted reading contributions, fixed for this session. */
  constructor(options: MdEditorExtensionOptions = {}) {
    super({ preset: false, extensions: createMdEditorExtensions(options) });
  }
}
