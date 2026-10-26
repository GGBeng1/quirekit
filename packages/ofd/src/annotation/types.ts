import type { OFDBox } from "../model";

/** Standard OFD annotation type. */
export type OFDAnnotationType =
  | "Link"
  | "Path"
  | "Highlight"
  | "Stamp"
  | "Watermark";

/** Authoring options for one page-local OFD annotation. */
export interface OFDAnnotationOptions {
  /** Standard annotation type. */
  readonly type: OFDAnnotationType;
  /** Required annotation creator. */
  readonly creator: string;
  /** Required ISO `YYYY-MM-DD` modification date. */
  readonly lastModDate: string;
  /** Required appearance boundary in page coordinates. */
  readonly boundary: OFDBox;
  /** Optional producer-defined annotation subtype. */
  readonly subtype?: string;
  /** Whether the annotation is initially visible. */
  readonly visible?: boolean;
  /** Whether the annotation is included when printing. */
  readonly print?: boolean;
  /** Whether annotation remark content ignores page zoom. */
  readonly noZoom?: boolean;
  /** Whether annotation remark content ignores page rotation. */
  readonly noRotate?: boolean;
  /** Whether users may modify the annotation remark. */
  readonly readOnly?: boolean;
  /** Optional human-readable annotation remark. */
  readonly remark?: string;
  /** Optional producer-defined annotation parameters by stable name. */
  readonly parameters?: Readonly<Record<string, string>>;
}
