import { EditorSelection } from "@quirekit/cm-state";
import { componentView, readSourcePresentation, type MsfeEditor, type ProjectionLayer } from "@quirekit/msfe-core";
import { nativeProperties } from "./renderer";
import { DOCUMENT_PROPERTIES_LIMIT } from "./read";
import { documentPropertiesEnabled, propertiesDocument, setDocumentPropertiesCollapsed, setDocumentPropertiesEnabled } from "./state";
import { planDocumentProperty } from "./write";
import type { DocumentPropertiesData, DocumentPropertiesOptions, DocumentPropertiesProps, DocumentPropertiesStorage } from "./types";

/** @param name - Installed source type. @param storage - View preferences. @param options - Host renderer. @param owner - Late editor owner. @returns One bounded block projection. */
export function propertiesLayer(name: string, storage: DocumentPropertiesStorage, options: DocumentPropertiesOptions, owner: () => MsfeEditor): ProjectionLayer {
  return { key: "document-properties", placement: "block", incremental: true, states: [storage.enabled, storage.collapsed, propertiesDocument],
    /** @param input - Confirmed source and declared state dependencies. @returns Optional property table in canonical header coordinates. */
    build(input) {
      if (!input.getState(storage.enabled)) return [];
      const generation = input.getState(propertiesDocument);
      return input.query(name).matches.map(match => {
        const data = match.attrs as unknown as DocumentPropertiesData;
        /** @returns Whether this control still belongs to the same visible document. */
        const current = () => !owner().scope.disposed && propertiesDocument.read(owner().state) === generation && documentPropertiesEnabled(owner().state);
        const props: DocumentPropertiesProps = { data, readOnly: input.readOnly, locale: options.locale, collapsed: input.getState(storage.collapsed),
          /** @param collapsed - Manual presentation preference. @returns Acceptance only for the same active document. */
          setCollapsed(collapsed) { return current() ? setDocumentPropertiesCollapsed(owner(), collapsed) : { ok: false, reason: "stale-target" }; },
          /** @param change - Explicit field edit. @returns Canonical source transaction result. */
          change(change) {
            const editor = owner(), presentation = readSourcePresentation(editor.state);
            if (!current() || presentation.mode === "source") return { ok: false, reason: "stale-target" };
            if (editor.state.readOnly || presentation.mode === "locked") return { ok: false, reason: "readonly" };
            if (presentation.composing) return { ok: false, reason: "composing" };
            return editor.run(state => {
              const changes = planDocumentProperty(state.sliceDoc(0, Math.min(state.doc.length, DOCUMENT_PROPERTIES_LIMIT)), data, change);
              return changes ? { changes, userEvent: "input.properties" } : null;
            });
          },
          /** Restores native YAML at the same source position. */
          editSource() {
            if (!current()) return;
            const editor = owner();
            if (setDocumentPropertiesEnabled(editor, false).ok) { editor.setSelection(EditorSelection.single(match.from)); editor.scrollTo(match.from); editor.focus(); }
          },
        };
        return { type: "replace" as const, key: "header", from: match.from, to: match.to, interaction: "atomic" as const,
          // Only the root header qualifies. Moving it invalidates the source match;
          // lifetime and exact-prefix guards also reject retained obsolete controls.
          view: componentView(options.render ?? nativeProperties, props, value => value) };
      });
    },
  };
}
