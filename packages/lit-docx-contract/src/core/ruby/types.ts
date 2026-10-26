import type { LitAstMark, LitAstNode } from '../contracts.js'
import type { XmlElement } from '../../ooxml/element.js'

/** Alignment values defined by OOXML ST_RubyAlign. */
export type LitRubyAlignment = 'center' | 'distributeLetter' | 'distributeSpace' | 'left' | 'right' | 'rightVertical'

/** Phonetic-guide properties; numeric measurements are half-points. */
export interface LitRubyProperties {
  /** Annotation alignment relative to the base text. */
  rubyAlign?: LitRubyAlignment | undefined
  /** Annotation size in half-points, or an explicit OOXML universal measure. */
  hps?: number | string | undefined
  /** Distance above the base text in half-points, or a universal measure. */
  hpsRaise?: number | string | undefined
  /** Base text size recorded by the producer. */
  hpsBaseText?: number | string | undefined
  /** Language tag of the phonetic guide. */
  lid?: string | undefined
  /** Whether the producer considers the cached guide stale. */
  dirty?: boolean | undefined
}

/** Serializable source details not represented by the editable fields. */
export interface LitRubyPreservation {
  /** Original rubyPr subtree, including unrecognized fields and lexical values. */
  properties?: XmlElement | undefined
  /** Parsed properties at import, used to replace only changed fields. */
  snapshot: Readonly<Record<string, unknown>>
  /** Original attributes on the ruby container. */
  attributes?: Record<string, string> | undefined
  /** Original attributes on the rt container. */
  annotationAttributes?: Record<string, string> | undefined
  /** Original attributes on the rubyBase container. */
  baseAttributes?: Record<string, string> | undefined
  /** Unrecognized direct children retained in their source form. */
  extraChildren?: XmlElement[] | undefined
  /** Unchanged plain-run annotation source, replayed only without relationship dependencies. */
  annotation?: LitRubyTextSource | undefined
  /** Unchanged plain-run base source, replayed only without relationship dependencies. */
  base?: LitRubyTextSource | undefined
}

/** Original text layer and immutable semantic snapshot. */
export interface LitRubyTextSource {
  /** The original rt or rubyBase subtree. */
  xml: XmlElement
  /** JSON-safe semantic snapshot used to invalidate the raw layer after an edit. */
  signature: string
}

/** Public construction input for a native OOXML phonetic guide. */
export interface DocxRubyInput extends LitRubyProperties {
  /** Required OOXML alignment; imported incomplete guides use LitRubyProperties instead. */
  readonly rubyAlign: LitRubyAlignment
  /** Required annotation size in half-points, or an explicit universal measure. */
  readonly hps: number | string
  /** Required annotation raise in half-points, or an explicit universal measure. */
  readonly hpsRaise: number | string
  /** Required reference base-text size in half-points, or an explicit universal measure. */
  readonly hpsBaseText: number | string
  /** Required phonetic-guide language tag. */
  readonly lid: string
  /** Inline nodes of the base text. */
  readonly base: readonly LitAstNode[]
  /** Inline nodes of the annotation; each may carry independent run marks. */
  readonly annotation: readonly LitAstNode[]
  /** Outer run formatting and an optional link around the complete guide. */
  readonly marks?: readonly LitAstMark[] | undefined
}
