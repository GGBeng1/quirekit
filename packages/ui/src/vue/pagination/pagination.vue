<script setup lang="ts">
import { Pagination } from "@ark-ui/vue/pagination";
import { computed } from "vue";
import type {
  QuireKitPaginationLayoutItem,
  QuireKitPaginationPageChangeDetails,
  QuireKitPaginationPageSizeChangeDetails,
  QuireKitPaginationPageSlotProps,
  QuireKitPaginationSize,
  QuireKitPaginationSummarySlotProps
} from "../../components/pagination";
import PaginationOptions from "./options.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** Vue Pagination 的公开属性。 */
interface Props {
  /** 数据总数。 */
  readonly count: number;
  /** Pagination 的可访问名称；省略时取自语言包。 */
  readonly label?: string;
  /** 未受控使用时的初始页码。 */
  readonly defaultPage?: number;
  /** 未受控使用时的初始每页数据量。 */
  readonly defaultPageSize?: number;
  /** 是否禁用所有分页操作。 */
  readonly disabled?: boolean;
  /** 可选择的每页条数；自动补充当前值。 */
  readonly pageSizeOptions?: readonly number[];
  /** 当前页两侧保留的相邻页数。 */
  readonly siblingCount?: number;
  /** 按数组顺序组合分页部件；空数组不显示部件。 */
  readonly layout?: readonly QuireKitPaginationLayoutItem[];
  /** 控件视觉尺寸。 */
  readonly size?: QuireKitPaginationSize;
}

/** Pagination 的可替换内容位置。 */
interface Slots {
  /** 替换每一个页码的可见内容。 */
  readonly page?: (props: QuireKitPaginationPageSlotProps) => unknown;
  /** 替换省略号。 */
  readonly ellipsis?: () => unknown;
  /** 替换上一页按钮内容。 */
  readonly previous?: () => unknown;
  /** 替换下一页按钮内容。 */
  readonly next?: () => unknown;
  /** 替换总条数摘要；上下文仍包含当前范围。 */
  readonly summary?: (props: QuireKitPaginationSummarySlotProps) => unknown;
  /** 替换独立的当前范围。 */
  readonly range?: (props: QuireKitPaginationSummarySlotProps) => unknown;
}

/** Pagination 发出的公开语义事件。 */
interface Emits {
  /** 当前页变化后触发。 */
  pageChange: [details: QuireKitPaginationPageChangeDetails];
  /** 每页数据量变化后触发。 */
  pageSizeChange: [details: QuireKitPaginationPageSizeChangeDetails];
}

const props = withDefaults(defineProps<Props>(), {
  defaultPage: 1,
  defaultPageSize: 10,
  siblingCount: 1,
  disabled: false,
  pageSizeOptions: () => [10, 20, 50, 100],
  layout: () => ["previous", "pages", "next"],
  size: "sm"
});
const layout = computed(() => [...new Set(props.layout)].filter(part =>
  ["first", "previous", "pages", "compact", "next", "last", "summary", "range", "pageSize", "jumper", "spacer"].includes(part)
));
// 连续翻页部件共享紧凑分组；辅助部件独立留白，保持调用方的视觉和键盘顺序。
const navigationParts = new Set(["first", "previous", "pages", "compact", "next", "last"]);
const layoutGroups = computed(() => {
  const groups: QuireKitPaginationLayoutItem[][] = [];
  for (const part of layout.value) {
    const previous = groups.at(-1);
    if (navigationParts.has(part) && previous && navigationParts.has(previous[0]!)) previous.push(part);
    else groups.push([part]);
  }
  return groups;
});
const page = defineModel<number | undefined>("page");
const pageSize = defineModel<number | undefined>("pageSize");
const emit = defineEmits<Emits>();
defineSlots<Slots>();

const text = useQuireKitMessages("pagination");
const label = computed(() => props.label ?? text.value.label);
const translations = computed(() => ({
  rootLabel: label.value,
  firstTriggerLabel: text.value.first,
  prevTriggerLabel: text.value.previous,
  nextTriggerLabel: text.value.next,
  lastTriggerLabel: text.value.last,
  itemLabel: ({ page: itemPage, totalPages }: { page: number; totalPages: number }) => text.value.page(itemPage, totalPages)
}));
const optionalRootProps = computed(() => ({
  ...(page.value === undefined ? { defaultPage: props.defaultPage } : { page: page.value }),
  ...(pageSize.value === undefined
    ? { defaultPageSize: props.defaultPageSize }
    : { pageSize: pageSize.value })
}));

/**
 * 同步并公开当前页。
 *
 * @param details - Ark 报告的页码与 pageSize。
 */
function handlePageChange(details: QuireKitPaginationPageChangeDetails): void {
  page.value = details.page;
  emit("pageChange", details);
}

/**
 * 同步并公开每页数据量。
 *
 * @param details - Ark 报告的新 pageSize。
 */
function handlePageSizeChange(details: QuireKitPaginationPageSizeChangeDetails): void {
  pageSize.value = details.pageSize;
  emit("pageSizeChange", details);
}
</script>

<template>
  <Pagination.Root
    v-bind="optionalRootProps"
    :count="count"
    :data-disabled="disabled ? '' : undefined"
    :sibling-count="siblingCount"
    :translations="translations"
    :class="['qk-pagination', `qk-pagination--${size}`]"
    @page-change="handlePageChange"
    @page-size-change="handlePageSizeChange"
  >
    <Pagination.Context v-slot="pagination">
      <template v-for="group in layoutGroups" :key="group.join('-')">
        <span v-if="group[0] === 'spacer'" class="qk-pagination__spacer" aria-hidden="true" />
        <div v-else class="qk-pagination__controls">
          <template v-for="part in group" :key="part">
            <template v-if="part === 'summary' || part === 'range'">
              <slot :name="part" :page="pagination.page" :total-pages="pagination.totalPages"
                :start="pagination.count === 0 ? 0 : pagination.pageRange.start + 1"
                :end="pagination.pageRange.end" :count="pagination.count">
                <span v-if="part === 'summary'" class="qk-pagination__summary">{{ text.summary(pagination.count) }}</span>
                <span v-else class="qk-pagination__summary">{{ text.range(pagination.count === 0 ? 0 : pagination.pageRange.start + 1, pagination.pageRange.end) }}</span>
              </slot>
            </template>
            <Pagination.FirstTrigger v-else-if="part === 'first'" class="qk-pagination__trigger qk-pagination__edge-trigger" :disabled="disabled || pagination.page <= 1">
              <QuireIcon name="chevronFirst" :size="size === 'xl' ? 20 : 16" />
            </Pagination.FirstTrigger>
            <Pagination.PrevTrigger v-else-if="part === 'previous'" class="qk-pagination__trigger" :disabled="disabled || pagination.page <= 1">
              <slot name="previous"><QuireIcon name="chevronLeft" :size="size === 'xl' ? 20 : 16" /></slot>
            </Pagination.PrevTrigger>
            <div v-else-if="part === 'pages'" class="qk-pagination__controls">
              <template v-for="(item, index) in pagination.pages" :key="item.type === 'page' ? item.value : `ellipsis-${index}`">
                <Pagination.Item v-if="item.type === 'page'" :type="item.type" :value="item.value" class="qk-pagination__item" :disabled="disabled">
                  <slot name="page" :page="item.value" :selected="item.value === pagination.page">{{ item.value }}</slot>
                </Pagination.Item>
                <Pagination.Ellipsis v-else :index="index" class="qk-pagination__ellipsis">
                  <slot name="ellipsis">…</slot>
                </Pagination.Ellipsis>
              </template>
            </div>
            <span v-else-if="part === 'compact'" class="qk-pagination__compact-label">{{ pagination.page }} / {{ pagination.totalPages }}</span>
            <Pagination.NextTrigger v-else-if="part === 'next'" class="qk-pagination__trigger" :disabled="disabled || pagination.page >= pagination.totalPages">
              <slot name="next"><QuireIcon name="chevronRight" :size="size === 'xl' ? 20 : 16" /></slot>
            </Pagination.NextTrigger>
            <Pagination.LastTrigger v-else-if="part === 'last'" class="qk-pagination__trigger qk-pagination__edge-trigger" :disabled="disabled || pagination.page >= pagination.totalPages">
              <QuireIcon name="chevronLast" :size="size === 'xl' ? 20 : 16" />
            </Pagination.LastTrigger>
            <PaginationOptions v-else-if="part === 'pageSize' || part === 'jumper'" :part="part"
              :page="pagination.page" :page-size="pagination.pageSize" :total-pages="pagination.totalPages"
              :label="label" :size="size" :disabled="disabled" :page-size-options="pageSizeOptions"
              @page-change="pagination.setPage" @page-size-change="pagination.setPage(1); pagination.setPageSize($event)" />
          </template>
        </div>
      </template>
    </Pagination.Context>
  </Pagination.Root>
</template>
