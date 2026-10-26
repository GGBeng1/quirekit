import { ViewPlugin } from "@quirekit/cm-view";
import { Extension } from "../../authoring/definition";
import type { AnyExtension } from "../../authoring/types";
import { SourceBlockInteraction } from "./runtime";
import type { SourceBlockControlsOptions } from "./types";

/** @param options - Host-owned UI observers. @returns Source-native block hit testing, drag/drop and menu intent lifecycle. */
export function createSourceBlockControls(options: SourceBlockControlsOptions): AnyExtension {
  return Extension.create({ name: "sourceBlockControls",
    /** @returns One view-local interaction owner, with no framework or UI dependency. */
    addCodeMirrorExtensions() { return ViewPlugin.define(view => new SourceBlockInteraction(view, () => this.editor, options)); },
  });
}
