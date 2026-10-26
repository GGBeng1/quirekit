<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { QuireButton, QuireDialogContent, QuireDialogRoot, QuireDialogTrigger, QuireIcon, QuireKbd } from "@quirekit/ui/vue";
import { flowShortcutColumns } from "./catalog";

const { t } = useFlowMessages();

defineProps<{
  /** Prevents opening while the native input method owns the workspace. */ disabled: boolean;
}>();
</script>

<template>
  <QuireDialogRoot lazy-mount unmount-on-exit>
    <QuireDialogTrigger as-child>
      <QuireButton variant="ghost" size="sm" :disabled="disabled" class="qk-flow-shortcuts-trigger">
        <span class="qk-flow-shortcuts-trigger__label"><QuireIcon name="keyboard" :size="16" /><span>{{ t('快捷键') }}</span></span>
      </QuireButton>
    </QuireDialogTrigger>
    <QuireDialogContent :title="t('快捷键与操作')" :description="t('点击画布后使用编辑快捷键；输入文字时，按键由文本框处理。')" size="large">
      <div class="qk-flow-shortcuts">
        <div v-for="(column, index) in flowShortcutColumns" :key="index" class="qk-flow-shortcuts__column">
          <section v-for="group in column" :key="group.title" :aria-label="t(group.title)">
            <h3>{{ t(group.title) }}</h3>
            <dl>
              <div v-for="item in group.items" :key="item.label" class="qk-flow-shortcuts__row">
                <dt>{{ t(item.label) }}</dt>
                <dd>
                  <template v-for="(keys, alternative) in item.keys" :key="keys.join('-')">
                    <span v-if="alternative" class="qk-flow-shortcuts__or">{{ t('或') }}</span>
                    <QuireKbd :keys="keys.map(key => t(key))" />
                  </template>
                  <span v-if="item.gesture" class="qk-flow-shortcuts__gesture">{{ t(item.gesture) }}</span>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <template #status><span>{{ t('⌘ 为 Mac 的 Command 键；Windows / Linux 使用 Ctrl。只读或锁定时，修改操作不可用。') }}</span></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>

<style scoped>
.qk-flow-shortcuts-trigger { flex: none; }
.qk-flow-shortcuts-trigger__label { display: inline-flex; align-items: center; gap: var(--qk-space-inline); }
.qk-flow-shortcuts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--qk-space-surface); }
.qk-flow-shortcuts__column { display: grid; align-content: start; gap: var(--qk-space-surface); min-width: 0; }
.qk-flow-shortcuts h3 { margin: 0 0 var(--qk-space-inline); color: var(--qk-color-text-primary); font-size: 13px; font-weight: 600; }
.qk-flow-shortcuts dl { margin: 0; }
.qk-flow-shortcuts__row { display: flex; align-items: center; justify-content: space-between; gap: var(--qk-space-inline); min-height: 34px; padding-block: 4px; font-size: 12px; }
.qk-flow-shortcuts dt { color: var(--qk-color-text-secondary); flex: none; }
.qk-flow-shortcuts dd { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 4px; margin: 0; min-width: 0; }
.qk-flow-shortcuts__or, .qk-flow-shortcuts__gesture { color: var(--qk-color-text-tertiary); }
@media (max-width: 700px) { .qk-flow-shortcuts { grid-template-columns: minmax(0, 1fr); } }
</style>
