import type { QuireKitControlSize } from "../control";
/** 按顺序排列的分页部件；spacer 占据剩余空间。 */
export type QuireKitPaginationLayoutItem = "first" | "previous" | "pages" | "compact" | "next" | "last" | "summary" | "range" | "pageSize" | "jumper" | "spacer";

/** Pagination 的视觉尺寸。 */
export type QuireKitPaginationSize = QuireKitControlSize;

/** Pagination 页码插槽接收的稳定上下文。 */
export interface QuireKitPaginationPageSlotProps {
  /** 当前页码。 */
  readonly page: number;
  /** 当前页码是否被选中。 */
  readonly selected: boolean;
}

/** Pagination 范围摘要插槽接收的稳定上下文。 */
export interface QuireKitPaginationSummarySlotProps {
  /** 当前页。 */
  readonly page: number;
  /** 总页数。 */
  readonly totalPages: number;
  /** 当前页第一条数据从 1 开始的序号；空集合时为 0。 */
  readonly start: number;
  /** 当前页最后一条数据从 1 开始的序号；空集合时为 0。 */
  readonly end: number;
  /** 数据总数。 */
  readonly count: number;
}

/** Pagination 当前页变化后的公开详情。 */
export interface QuireKitPaginationPageChangeDetails {
  /** 变化后的页码。 */
  readonly page: number;
  /** 当前每页数据量。 */
  readonly pageSize: number;
}

/** Pagination 每页数据量变化后的公开详情。 */
export interface QuireKitPaginationPageSizeChangeDetails {
  /** 变化后的每页数据量。 */
  readonly pageSize: number;
}
