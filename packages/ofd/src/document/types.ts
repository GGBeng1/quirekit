import type { OFDPage } from "./page";
import type { OFDAction } from "../action";

/** OFD standard profile emitted by the standalone writer. */
export type OFDProfile = "gb-t-33190-2016";

/** Document usage declared in `DocInfo`. */
export type OFDDocumentUsage =
  | "Normal"
  | "Book"
  | "NewsPaper"
  | "Magzine";

/** Metadata written to the OFD package entry point. */
export interface OFDDocumentMetadata {
  /** Stable document identifier. */
  readonly documentId?: string;
  /** Human-readable title. */
  readonly title?: string;
  /** Human-readable author. */
  readonly author?: string;
  /** Human-readable subject. */
  readonly subject?: string;
  /** Search keywords. */
  readonly keywords?: readonly string[];
  /** Creating application. */
  readonly creator?: string;
  /** Creating application version. */
  readonly creatorVersion?: string;
  /** Creation date in strict `YYYY-MM-DD` form. */
  readonly creationDate?: string;
  /** Modification date in strict `YYYY-MM-DD` form. */
  readonly modificationDate?: string;
  /**
   * Declared GB/T 33190-2016 document usage.
   *
   * OFDRW 2.3.9 uses different E-prefixed lexical values, so this standard
   * profile intentionally preserves the standard spellings instead.
   */
  readonly usage?: OFDDocumentUsage;
}

/** Options used to create one standalone OFD document. */
export interface OFDDocumentOptions {
  /** Optional document metadata. */
  readonly metadata?: OFDDocumentMetadata;
  /** Standard profile; GB/T 33190-2016 is used when omitted. */
  readonly profile?: OFDProfile;
}

/** Options controlling final OFD package serialization. */
export interface OFDSaveOptions {
  /** Whether to re-open and verify the generated package; defaults to true. */
  readonly verify?: boolean;
}

/** Physical page area in millimetres. */
export interface OFDPageOptions {
  /** Page width in millimetres. */
  readonly width: number;
  /** Page height in millimetres. */
  readonly height: number;
}

/** Standard template presentation order. */
export type OFDTemplateZOrder = "Background" | "Foreground";

/** Dimensions and common-data properties for one reusable template page. */
export interface OFDTemplatePageOptions extends OFDPageOptions {
  /** Optional human-readable template name. */
  readonly name?: string;
  /** Default presentation order when a page does not override it. */
  readonly zOrder?: OFDTemplateZOrder;
}

/** Per-page override applied when an ordinary page references a template. */
export interface OFDTemplateReferenceOptions {
  /** Optional presentation order overriding the template default. */
  readonly zOrder?: OFDTemplateZOrder;
}

/** A destination within an owned page. */
export interface OFDDestination {
  /** Target page. */
  readonly page: OFDPage;
  /** Destination interpretation. */
  readonly type?: "XYZ" | "Fit" | "FitH" | "FitV" | "FitR";
  /** Optional left coordinate. */
  readonly left?: number;
  /** Optional right coordinate. */
  readonly right?: number;
  /** Optional top coordinate. */
  readonly top?: number;
  /** Optional bottom coordinate. */
  readonly bottom?: number;
  /** Optional zoom scale from 0.1 through 64. */
  readonly zoom?: number;
}

/** Options for one named document bookmark. */
export interface OFDBookmarkOptions {
  /** Bookmark name. */
  readonly name: string;
  /** Bookmark destination. */
  readonly destination: OFDDestination;
}

/** One outline node in the document navigation tree. */
export interface OFDOutlineOptions {
  /** Visible outline title. */
  readonly title: string;
  /** Optional destination activated by the outline. */
  readonly destination?: OFDDestination;
  /** Additional actions executed in order when this outline is activated. */
  readonly actions?: readonly OFDAction[];
  /** Whether children are expanded initially. */
  readonly expanded?: boolean;
  /** Nested outline nodes. */
  readonly children?: readonly OFDOutlineOptions[];
}

/** Document-level permissions emitted by the writer. */
export interface OFDPermissions {
  /** Whether document editing is permitted. */
  readonly edit?: boolean;
  /** Whether annotations are permitted. */
  readonly annotate?: boolean;
  /** Whether content export is permitted. */
  readonly export?: boolean;
  /** Whether digital signatures are permitted. */
  readonly signature?: boolean;
  /** Whether watermarks may be added. */
  readonly watermark?: boolean;
  /** Whether screen capture is permitted. */
  readonly printScreen?: boolean;
  /** Whether printing is permitted. */
  readonly print?: boolean;
  /** Optional maximum print copies. */
  readonly printCopies?: number;
}

/** Shared initial reader-presentation settings. */
export interface OFDViewerPreferencesBase {
  /** Initial page layout. */
  readonly pageLayout?: "OnePage" | "OneColumn" | "TwoPageL" | "TwoPageR";
  /** Initial page mode. */
  readonly pageMode?: "None" | "FullScreen" | "UseOutlines" | "UseThumbs" | "UseCustomTags" | "UseLayers" | "UseAttatchs" | "UseBookmarks";
  /** Initial tab display. */
  readonly tabDisplay?: "DocTitle" | "FileName";
  /** Whether title bars are hidden. */
  readonly hideToolbar?: boolean;
  /** Whether menu bars are hidden. */
  readonly hideMenubar?: boolean;
  /** Whether the reader window is hidden. */
  readonly hideWindowUI?: boolean;
  /** Whether the reader window fits the document. */
  readonly fitWindow?: boolean;
  /** Whether the reader window is centered. */
  readonly centerWindow?: boolean;
}

/** Preferred initial reader presentation with one mutually exclusive zoom choice. */
export type OFDViewerPreferences = OFDViewerPreferencesBase & (
  | {
      /** Initial automatic zoom mode. */
      readonly zoomMode?: "Default" | "FitHeight" | "FitWidth" | "FitRect";
      /** Explicit zoom is unavailable when an automatic mode is selected. */
      readonly zoomScale?: never;
    }
  | {
      /** Automatic zoom is unavailable when an explicit scale is selected. */
      readonly zoomMode?: never;
      /** Initial explicit zoom scale. */
      readonly zoomScale?: number;
    }
);

/** Validation issue discovered before package serialization. */
export interface OFDValidationIssue {
  /** Stable issue code. */
  readonly code:
    | "document-empty"
    | "foreign-resource"
    | "foreign-page"
    | "foreign-template"
    | "invalid-annotation"
    | "invalid-action"
    | "invalid-color"
    | "invalid-date"
    | "invalid-document-id"
    | "invalid-document-metadata"
    | "invalid-destination"
    | "invalid-geometry"
    | "invalid-number"
    | "invalid-path"
    | "invalid-text-placement"
    | "resource-invalid";
  /** Human-readable explanation. */
  readonly message: string;
  /** Optional page index. */
  readonly pageIndex?: number;
  /** Optional object index. */
  readonly objectIndex?: number;
}

/** Error thrown when the writer cannot emit a valid OFD package. */
export class OFDValidationError extends Error {
  /** Complete validation issues. */
  readonly issues: readonly OFDValidationIssue[];

  /**
   * Creates a validation error.
   *
   * @param issues - Complete validation issues.
   */
  constructor(issues: readonly OFDValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("\n"));
    this.name = "OFDValidationError";
    this.issues = Object.freeze([...issues]);
  }
}
