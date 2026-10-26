import { Facet } from "@quirekit/cm-state";

/** Snapshot-local reading capability; disabling the diagram extension keeps Mermaid fences as ordinary code. */
export const markdownMermaidEnabled = Facet.define<boolean, boolean>({ combine: values => values.some(Boolean) });

/** Snapshot-local capability for PlantUML and Graphviz previews. */
export const markdownTextDiagramsEnabled = Facet.define<boolean, boolean>({ combine: values => values.some(Boolean) });
