import type { Node } from "@quirekit/pm";

/** Legacy host fallback for nodes without an addAccessibility owner. */
export interface QuireAccessibleBlockDescription {
  /** Textblocks may contribute a heading; nontext containers remain descriptions. */
  readonly kind: "paragraph" | "heading" | "description";
  /** Heading level from 1 to 6 when kind is heading. */
  readonly level?: number;
  /** Human-readable description for a nontext block. */
  readonly label?: string;
}

/** Localizable labels for the optional reading surface and native input. */
export interface QuireAccessibilityLabels {
  /** Accessible name of the existing native text host. */
  readonly input: string;
  /** Entry button and reading region name. */
  readonly reading: string;
  /** Button returning focus to the text host. */
  readonly returnToEditor: string;
  /** Previous reading segment. */
  readonly previous: string;
  /** Next reading segment. */
  readonly next: string;
  /** Button entering one supported paragraph. */
  readonly edit: string;
  /** Placeholder for empty paragraphs. */
  readonly empty: string;
  /** Visible continuation marker for a paragraph split by the reading budget. */
  readonly continuation: string;
  /** Notice for unsupported context or complex editing. */
  readonly unavailable: string;
  /** @param name - Schema node name. @returns Fallback description for an unsupported block. */
  readonly unsupported: (name: string) => string;
  /** @param index - One-based reading segment. @param last - Whether this is the last segment. @returns Segment boundary label. */
  readonly segment: (index: number, last: boolean) => string;
}

/** Installation policy, independent from PM plugin configuration. */
export interface QuireAccessibilityOptions {
  /** Initial enabled state; installation is always explicit. */
  readonly enabled: boolean;
  /** Maximum UTF-16 units in the active paragraph context. */
  readonly textBudget: number;
  /** Maximum UTF-16 units in one explicit reading segment. */
  readonly readingBudget: number;
  /** Maximum leaf items in one segment; structural traversal also has a depth and step bound. */
  readonly readingBlocks: number;
  /** Localizable UI and announcements. */
  readonly labels: QuireAccessibilityLabels;
  /** @param node - Canonical node without a registered owner. @returns Legacy fallback; prefer addAccessibility for new features. */
  readonly describeBlock: (node: Node) => QuireAccessibleBlockDescription | null;
}

/** Cumulative work counts for one mounted accessibility session. */
export interface QuireAccessibilityDiagnostics {
  /** Stable mounted view id. */
  readonly viewId: string;
  /** Current enabled policy. */
  readonly enabled: boolean;
  /** Whether native composition is delaying context release. */
  readonly composing: boolean;
  /** Context compiles caused by changed document or selection. */
  readonly contextCompiles: number;
  /** Total projected native text units. */
  readonly contextCharacters: number;
  /** Reading segment compiles; selection-only changes do not increment this. */
  readonly readingCompiles: number;
  /** Reading item DOM replacements. */
  readonly readingDomUpdates: number;
}

/** Runtime control shared by an editor's mounted Canvas/SVG sessions. */
export interface QuireAccessibilityController {
  /** Current requested enabled state. */
  readonly enabled: boolean;
  /** @param enabled - New runtime policy, without PM plugin reconfiguration. */
  setEnabled(enabled: boolean): void;
  /** @param viewId - Mounted view id; omission chooses the editor's current view. @returns Whether reading focus was accepted. */
  focusReading(viewId?: string): boolean;
  /** @param viewId - Mounted view id; omission chooses the editor's current view. @returns Whether editing focus was accepted. */
  focusEditing(viewId?: string): boolean;
  /** @returns Immutable snapshots of mounted session work counts. */
  getDiagnostics(): readonly QuireAccessibilityDiagnostics[];
}
