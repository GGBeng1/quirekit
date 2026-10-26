import type { QuireAiSourceCapability } from "@quirekit/ai-contract";
import { checkTextFigure, readFigureBody } from "./check";

/** Mermaid figures: listed in the figure catalog and rendered before they are written. */
export const mermaidAiCapabilities: readonly QuireAiSourceCapability[] = [{
  kind: "source-block",
  names: ["FencedCode"],
  authoring: [{ fence: "mermaid", description: "Mermaid: sequence diagrams, state diagrams, timelines, Gantt charts, pie charts (pie) and line or bar charts (xychart-beta); simple flowcharts too." }],
  check: { languages: ["mermaid"], run: (block, ports) => checkTextFigure(String(block.attrs.language), readFigureBody(block.text), ports) }
}];

/** PlantUML and Graphviz figures: listed in the figure catalog and rendered before they are written. */
export const textDiagramAiCapabilities: readonly QuireAiSourceCapability[] = [{
  kind: "source-block",
  names: ["FencedCode"],
  authoring: [
    { fence: "plantuml", description: "PlantUML: UML class, component, deployment, activity and use case diagrams; start with @startuml and end with @enduml." },
    { fence: "dot", description: "Graphviz DOT: networks of relations and dependency graphs laid out automatically, written as digraph { a -> b }." }
  ],
  check: { languages: ["plantuml", "puml", "dot", "graphviz"], run: (block, ports) => checkTextFigure(String(block.attrs.language), readFigureBody(block.text), ports) }
}];
