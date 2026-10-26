import type {
  DocxCompilerInput,
  DocxContributionRegistry
} from "../contributions/index.js";
import type {
  DocxCompilerSnapshot,
  DocxPackagePartPlan,
  DocxRelationshipPlan,
  DocxResourcePlan
} from "../products/index.js";

/** Resource with a centrally allocated deterministic identity. */
export interface DocxAllocatedResource {
  /** Compiler-assigned identity. */
  readonly id: string;
  /** Compiler-assigned absolute OPC part name. */
  readonly partName: string;
  /** Original semantic resource request. */
  readonly plan: DocxResourcePlan;
}

/** Relationship with a part-local OOXML relationship id. */
export interface DocxAllocatedRelationship {
  /** Compiler-assigned relationship id such as `rId1`. */
  readonly id: string;
  /** Original semantic relationship request. */
  readonly plan: DocxRelationshipPlan;
}

/** Resolved package plan produced after all compiler phases. */
export interface DocxCompiledPackagePlan {
  /** Resources with deterministic compiler identities. */
  readonly resources: readonly DocxAllocatedResource[];
  /** Relationships with deterministic part-local ids. */
  readonly relationships: readonly DocxAllocatedRelationship[];
  /** Validated package parts in contribution order. */
  readonly parts: readonly DocxPackagePartPlan[];
}

/** Complete result of one contribution compiler run. */
export interface DocxCompilerResult<
  ModelNode = unknown,
  ModelMark = unknown,
  ModelDocument = unknown
> {
  /** Generic input supplied to the compiler. */
  readonly input: DocxCompilerInput<ModelDocument>;
  /** Registry used for exact ownership and ordering. */
  readonly registry: DocxContributionRegistry<
    ModelNode,
    ModelMark,
    ModelDocument
  >;
  /** Immutable snapshot after every fixed compiler phase. */
  readonly snapshots: readonly DocxCompilerSnapshot[];
  /** Final compiler snapshot including validation diagnostics. */
  readonly finalSnapshot: DocxCompilerSnapshot;
  /** Centrally allocated and validated package plan. */
  readonly packagePlan: DocxCompiledPackagePlan;
}
