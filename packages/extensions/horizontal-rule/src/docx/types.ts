import {
  defineDocxCodecServiceKey
} from "@quirekit/lit-docx-contract";

/** Document geometry exposed by a host to the horizontal-rule codec. */
export interface HorizontalRuleDocxGeometryService {
  /** Available section body width in twentieths of a point. */
  readonly sectionBodyWidthDxa?: number | undefined;
}

/** Typed host-service key consumed by the horizontal-rule codec. */
export const horizontalRuleDocxGeometryServiceKey =
  defineDocxCodecServiceKey<HorizontalRuleDocxGeometryService>(
    "quirekit.horizontal-rule.geometry"
  );
