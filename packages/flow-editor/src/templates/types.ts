/** Stable built-in template identities. */
export type FlowchartTemplateId = "uml-order" | "uml-services" | "er-commerce" | "er-membership" | "blank" | "approval" | "pipeline" | "sketch" | "order" | "leave" | "expense" | "incident" | "release" | "cleaning" | "backup" | "application" | "services" | "timeline" | "improvement" | "team"
  | "organization" | "fishbone" | "radial" | "cycle" | "milestones" | "honeycomb"
  | "system-architecture" | "sequence" | "sequence-async" | "swimlane-horizontal" | "swimlane-vertical";
/** User-facing catalog families; blank belongs to every filter. */
export type FlowchartTemplateCategory = "uml" | "er" | "workflow" | "data" | "architecture" | "planning" | "organization" | "analysis" | "relationship" | "sequence" | "swimlane";
/** Searchable metadata, independent of graph instances and generated previews. */
export interface FlowchartTemplate {
  /** Stable recipe identity. */ readonly id: FlowchartTemplateId;
  /** Short localized name. */ readonly label: string;
  /** Family, absent only for a blank document. */ readonly category?: FlowchartTemplateCategory;
  /** Scope and intended use. */ readonly description: string;
}
