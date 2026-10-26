import type { MindMapLayout } from "../model/types";
import type { MindMapNodeStyle } from "../formatting/types";

/** Stable shared content-template identity. */
export type MindMapTemplateId = "blank" | "classic" | "minimal" | "coral" | "ocean" | "business"
  | "weekly" | "project" | "meeting" | "product" | "event" | "goals"
  | "study" | "reading" | "travel" | "review" | "decision" | "swot" | "marketing" | "research";

/** Stable catalog grouping; not a document field. */
export type MindMapTemplateCategory = "style" | "work" | "life" | "analysis";

/** Renderer-independent catalog entry. */
export interface MindMapTemplate {
  /** Stable factory identity. */ readonly id: MindMapTemplateId;
  /** Human-readable catalog title. */ readonly title: string;
  /** Brief purpose rather than renderer details. */ readonly description: string;
  /** Purpose group shared by host galleries. */ readonly category: MindMapTemplateCategory;
}

/** A leaf or a titled branch with arbitrary nested content. */
export type MindMapTemplateTopic = string | readonly [string, readonly MindMapTemplateTopic[]];

/** Original document palette, independent of host UI tokens. */
export interface MindMapTemplatePalette {
  /** Central topic fill. */ readonly root: string;
  /** Branch ink and connector colors, cycled in source order. */ readonly accents: readonly string[];
  /** Matching light branch fills. */ readonly tints: readonly string[];
}

/** Complete styling intent projected to admitted v3 node fields. */
export interface MindMapTemplateDesign {
  /** Literal document colors. */ readonly palette: MindMapTemplatePalette;
  /** Branch and leaf outline. */ readonly shape: NonNullable<MindMapNodeStyle["shape"]>;
  /** Optional contrasting center outline. */ readonly rootShape?: MindMapNodeStyle["shape"];
  /** Outgoing branch geometry. */ readonly line: NonNullable<MindMapNodeStyle["lineStyle"]>;
  /** Leaf visual hierarchy. */ readonly leaves: "plain" | "card" | "filled";
}

/** Internal source recipe, independent of browser dimensions and host theme. */
export interface MindMapTemplateRecipe extends MindMapTemplate {
  /** Root topic content. */ readonly root: string;
  /** Complete original content, including nested subtopics. */ readonly branches: readonly MindMapTemplateTopic[];
  /** Initial source layout. */ readonly layout?: MindMapLayout;
  /** Explicit persisted appearance. */ readonly design: MindMapTemplateDesign;
}
