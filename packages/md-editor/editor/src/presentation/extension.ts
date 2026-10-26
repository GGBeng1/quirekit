import { Extension, readSourcePresentation, sourceRevealResolver, sourceRevealSetting, sourceBlockScopes, sourceInputProxy } from "@quirekit/msfe-core";
import { Decoration, EditorView } from "@quirekit/cm-view";
import { proseStructureField } from "./structure";
import { proseSpacing } from "./spacing";
import { proseEditorGeometry } from "./theme";
import { proseHighlighting, sourceMarkdownHighlighting } from "./highlighting";
import type { MdPresentationOptions, MdPresentationStorage } from "../types";
import { documentBlockInput } from "../input/behavior";
import { markdownRevealOwner } from "./activation/owner";
import { proseActiveBlock } from "./activation/block";
import { containerBlockScope } from "./activation/scope";
import { proseDocumentSelection } from "./selection/layer";
import { mobileSelectionContentClass, proseMobileSelection } from "./mobile/runtime";
import { mobileSelectionActions, tapMobileSelection } from "./mobile/actions";
import { mobileHandleMargin } from "./mobile/geometry";
import { inlineBoundaryNavigation } from "@quirekit/msfe-core";
import { mdInlineBoundaries } from "./inline";
import { editingBoundaries } from "@quirekit/msfe-core";
import { Prec } from "@quirekit/cm-state";

/** Shared public Prose document presentation for MSFE consumers. */
export const ProsePresentation = Extension.create<MdPresentationOptions, MdPresentationStorage>({ name: "quirekitProse",
  /** @returns The stable document presentation as the product default. */
  addOptions() { return { editingMode: "document", inlineBoundaries: mdInlineBoundaries, editingBoundaries: [] }; },
  /** @returns An instance-local preference across source replacement. */
  addStorage() { return { editingMode: this.options.editingMode }; },
  /** @returns Shared document defaults; individual features own their structural input. */
  addBlockInput: () => documentBlockInput,
  /** @returns Native document wrappers and scoped editor geometry. */
  addCodeMirrorExtensions() {
    return [sourceInputProxy({ mediaQuery: "(max-width: 767px) and (any-pointer: coarse)", revealMargin: mobileHandleMargin, onSelectionTap: tapMobileSelection }), mobileSelectionActions,
      sourceRevealSetting.extension(() => this.storage.editingMode === "document" ? "hidden" : "selection"),
      inlineBoundaryNavigation(this.options.inlineBoundaries),
      Prec.high(editingBoundaries(this.options.editingBoundaries)),
      sourceRevealResolver.of(markdownRevealOwner), sourceBlockScopes.of(containerBlockScope), proseStructureField, proseSpacing, proseActiveBlock, proseDocumentSelection, proseMobileSelection, proseEditorGeometry, proseHighlighting, sourceMarkdownHighlighting, EditorView.contentAttributes.of(view => ({
      class: [readSourcePresentation(view.state).mode === "source" ? "" : "qk-prose qk-prose--compact", mobileSelectionContentClass(view)].filter(Boolean).join(" "),
    }))];
  },
  /** @returns Source task markers occupying the same inline slot as the shared Checkbox. */
  addProjections() { return [{ nodes: ["TaskMarker"],
    /** @param input - Confirmed marker and its item's reveal state. @returns A selectable marker retaining document alignment. */
    decorate({ node, active }) { return active ? [Decoration.mark({ class: "md-source-task-marker" }).range(node.from, node.to)] : []; },
  }]; },
  /** @param event - Accepted transaction; presentation requests never enter text history. */
  onTransaction({ transaction }) {
    this.storage.editingMode = sourceRevealSetting.requested(transaction.state) === "hidden" ? "document" : "markdown";
  },
});
