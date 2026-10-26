/** One source relationship whose internal target is an absolute OPC name. */
export interface ChartSourceRelationship {
  /** Exact source-local relationship identity. */
  readonly id: string
  /** Opaque relationship type URI. */
  readonly type: string
  /** Absolute part name or unchanged external URI. */
  readonly target: string
  /** External links are recorded without acquisition. */
  readonly external: boolean
}

/** Exact bytes and relationship authority of a reachable chart dependency. */
export interface ChartSourcePart {
  /** Canonical absolute OPC part name. */
  readonly name: string
  /** Original effective content type. */
  readonly contentType: string
  /** Portable original bytes; never a parsed/reconstructed workbook. */
  readonly base64: string
  /** Complete relationship list in original order. */
  readonly relationships: readonly ChartSourceRelationship[]
  /** Original relationship document when present. */
  readonly relationshipsXml?: string
}

/** One immutable drawing referring to shared source parts. */
export interface ChartSourceEntry {
  /** Registry-local immutable source identity. */
  readonly id: string
  /** Story part owning this drawing's relationships. */
  readonly sourcePart: string
  /** Original preserve-order drawing XML, excluding separately captured inherited namespaces. */
  readonly drawingXml: string
  /** Namespace declarations inherited at this source drawing. */
  readonly namespaces: Readonly<Record<string, string>>
  /** Relationships actually referenced by this drawing. */
  readonly relationships: readonly ChartSourceRelationship[]
}

/** JSON-safe source graph carried independently from chart nodes. */
export interface ChartSourceRegistry {
  /** Source graph protocol version. */
  readonly version: 1
  /** Drawing entries retained for document history. */
  readonly entries: readonly ChartSourceEntry[]
  /** Shared immutable dependency bytes, deduplicated by absolute name. */
  readonly parts: readonly ChartSourcePart[]
}

/** Caller-configurable bounds checked before accepting a source graph. */
export interface ChartSourceLimits {
  /** Maximum aggregate decoded dependency bytes. */
  readonly maxBytes: number
  /** Maximum distinct dependency parts. */
  readonly maxParts: number
}

/** Derived display fields that never replace original drawing authority. */
export interface ChartSourceDisplay {
  /** Width in CSS pixels projected from the original extent. */
  readonly width: number
  /** Height in CSS pixels projected from the original extent. */
  readonly height: number
  /** Original alternative description or display name. */
  readonly alt: string
}
