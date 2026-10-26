import type { DataViewOptions } from "@quirekit/extension-data-view";
import type { TextDiagramOptions } from "@quirekit/extension-text-diagram";
import type { FlowchartOptions } from "@quirekit/extension-flowchart";
import type { MindMapOptions } from "@quirekit/extension-mind-map";
import type { LinkOptions } from "@quirekit/extension-link";
import type { TextStyleKitOptions } from "@quirekit/extension-text-style";
import type { BlockInteractionOptions, CharacterCountOptions, FormattingOptions } from "@quirekit/extensions";
import type { SearchExtensionOptions } from "@quirekit/extension-search";
import type { StarterKitOptions } from "@quirekit/starter-kit";
import type { WhiteboardOptions } from "@quirekit/extension-whiteboard";
import type { BlockRichContentOptions } from "../rich-content/types";

/** Configuration for the continuous Block Editor document profile. */
export interface BlockEditorPresetOptions {
  /** Columns, reusable recipes, web cards and portable media; optional host storage and metadata. */
  readonly richContent?: Partial<BlockRichContentOptions> | false;
  /** Footnotes, definition lists, dates and Unicode emoji authoring. */
  readonly bodyContent?: false;
  /** Inline and standalone formulas with shared visual authoring. */
  readonly math?: false;
  /** Paragraph alignment, indentation and spacing from the open Word paragraph model. */
  readonly paragraphFormat?: false;
  /** Editable highlighter, named callout and disclosure containers. */
  readonly containers?: false;
  /** Persistent image blocks with shared display controls. */
  readonly image?: false;
  /** Transient find/replace; false omits search controls and commands. */
  readonly search?: Partial<SearchExtensionOptions> | false;
  /** Character formatting clipboard and clearing; false omits the feature. */
  readonly formatting?: Partial<FormattingOptions> | false;
  /** Stable structural block actions; false omits the block menu. */
  readonly blockInteraction?: Partial<BlockInteractionOptions> | false;
  /** Portable table and board objects; false omits the feature. */
  readonly dataView?: Partial<DataViewOptions> | false;
  /** Shared local Mermaid, PlantUML and DOT source authoring; false omits the feature. */
  readonly textDiagram?: Partial<TextDiagramOptions> | false;
  /** Editable mind map objects; false explicitly omits the feature. */
  readonly mindMap?: Partial<MindMapOptions> | false;
  /** Editable flowchart objects; false explicitly omits the feature. */
  readonly flowchart?: Partial<FlowchartOptions> | false;
  /** Source-backed whiteboard blocks; false explicitly omits the feature. */
  readonly whiteboard?: Partial<WhiteboardOptions> | false;
  /** StarterKit configuration, or false when supplying a replacement schema. */
  readonly starterKit?: Partial<StarterKitOptions> | false;
  /** Existing text-style commands and marks, or false to omit the bundle. */
  readonly textStyle?: Partial<TextStyleKitOptions> | false;
  /** Link semantics and recognition, or false to omit the mark. */
  readonly link?: Partial<LinkOptions> | false;
  /** On-demand statistics; limits are disabled unless explicitly configured. */
  readonly characterCount?: Partial<CharacterCountOptions> | false;
}
