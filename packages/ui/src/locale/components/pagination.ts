/** Interface text of Pagination, supplied by the active language pack. */
export interface Messages {
  /** Default accessible name of the pagination. */
  readonly label: string;
  /** Accessible name of the first-page action. */
  readonly first: string;
  /** Accessible name of the previous-page action. */
  readonly previous: string;
  /** Accessible name of the next-page action. */
  readonly next: string;
  /** Accessible name of the last-page action. */
  readonly last: string;
  /** Accessible name of one page button. */
  readonly page: (page: number, totalPages: number) => string;
  /** Total item summary. */
  readonly summary: (count: number) => string;
  /** One-based item range of the current page. */
  readonly range: (start: number, end: number) => string;
  /** Page-size option text. */
  readonly perPage: (pageSize: number) => string;
  /** Accessible name of the page-size selector, given the pagination label. */
  readonly pageSize: (label: string) => string;
  /** Accessible name of the jump input, given the pagination label. */
  readonly jumpInput: (label: string) => string;
  /** Text before the jump input; empty to omit. */
  readonly jumpPrefix: string;
  /** Text after the jump input; empty to omit. */
  readonly jumpSuffix: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "分页", first: "第一页", previous: "上一页", next: "下一页", last: "最后一页",
  page: (page, totalPages) => `第 ${page} 页，共 ${totalPages} 页`,
  summary: count => `共 ${count} 条`, range: (start, end) => `${start}–${end} 条`,
  perPage: pageSize => `${pageSize} 条/页`, pageSize: label => `${label}每页条数`, jumpInput: label => `${label}跳转页码`,
  jumpPrefix: "跳至", jumpSuffix: "页"
};

/** English. */
export const en: Messages = {
  label: "Pagination", first: "First page", previous: "Previous page", next: "Next page", last: "Last page",
  page: (page, totalPages) => `Page ${page} of ${totalPages}`,
  summary: count => `${count} ${count === 1 ? "item" : "items"}`, range: (start, end) => `${start}–${end}`,
  perPage: pageSize => `${pageSize} / page`, pageSize: label => `${label} page size`, jumpInput: label => `${label} page number`,
  jumpPrefix: "Go to", jumpSuffix: ""
};
