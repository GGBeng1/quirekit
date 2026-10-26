<script setup lang="ts">
import {
  QuireButton,
  QuireCard,
  QuireDialogContent,
  QuireDialogRoot,
  QuireDialogTrigger,
  QuireField,
  QuireInput,
  QuireSelect,
  QuireTypography
} from "@quirekit/ui/vue";
import { computed, onUnmounted, ref, watch, type HTMLAttributes } from "vue";
import type {
  ClassicEditorCustomWebFontSourceRecord,
  ClassicEditorFontLibrary,
  ClassicEditorLocale,
  ClassicEditorStylesheetFontSourceRecord
} from "@classic/types";
import type { ClassicFontHubMessageResolver } from "../types";

/** Inputs for the user-connected font-source task. */
interface Props {
  /** Library that validates, enables, and persists a source. */
  readonly library?: ClassicEditorFontLibrary | undefined;
  /** Active product locale. */
  readonly locale: ClassicEditorLocale;
  /** Product message resolver. */
  readonly message: ClassicFontHubMessageResolver;
  /** Theme and overlay ownership attributes forwarded to portalled content. */
  readonly popupProps: HTMLAttributes;
  /** Optional owner-document portal target. */
  readonly portalTarget?: HTMLElement | undefined;
}

/** Completion events emitted by the connection task. */
interface Emits {
  /** Reports that a validated source was enabled. */
  enabled: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const open = ref(false);
const mode = ref("css");
const url = ref("");
const name = ref("");
const inspecting = ref(false);
const inspected = ref<
  ClassicEditorStylesheetFontSourceRecord | ClassicEditorCustomWebFontSourceRecord
>();
const errorText = ref("");
let revision = 0;

const en = computed(() => props.locale === "en");
const sourceName = computed(() => {
  const record = inspected.value;
  if (!record) return "";
  return "css" in record
    ? record.name
    : record.descriptor.name.translations?.[props.locale] ?? record.descriptor.name.default;
});

watch([url, name, mode], () => {
  revision++;
  inspected.value = undefined;
  errorText.value = "";
}, { flush: "sync" });

watch(open, (visible) => {
  if (visible) return;
  revision++;
  mode.value = "css";
  url.value = "";
  name.value = "";
  inspected.value = undefined;
  errorText.value = "";
});

onUnmounted(() => {
  revision++;
});

/** Reads source metadata without enabling or downloading its font binaries. */
async function inspectSource(): Promise<void> {
  if (inspecting.value || !url.value.trim()) return;
  const current = ++revision;
  inspecting.value = true;
  inspected.value = undefined;
  errorText.value = "";
  try {
    const record = mode.value === "css"
      ? await props.library?.inspectStylesheetSource?.(url.value.trim(), name.value.trim())
      : await props.library?.inspectCustomSource?.(url.value.trim());
    if (!record) {
      throw new Error(
        en.value ? "Source connection is unavailable." : "当前宿主不支持此接入方式。"
      );
    }
    if (current === revision) inspected.value = record;
  } catch (error) {
    if (current === revision) {
      errorText.value = `${props.message("sourceTestFailed")}：${String(
        error instanceof Error ? error.message : error
      )}`;
    }
  } finally {
    inspecting.value = false;
  }
}

/** Enables the validated source and closes the focused task. */
function enableSource(): void {
  const record = inspected.value;
  if (!record) return;
  errorText.value = "";
  try {
    if ("css" in record) {
      if (!props.library?.enableStylesheetSource) {
        throw new Error("Source connection is unavailable.");
      }
      props.library.enableStylesheetSource(record);
    } else {
      if (!props.library?.enableCustomSource) {
        throw new Error("Source connection is unavailable.");
      }
      props.library.enableCustomSource(record);
    }
    emit("enabled");
    open.value = false;
  } catch (error) {
    errorText.value = String(error instanceof Error ? error.message : error);
  }
}
</script>

<template>
  <QuireDialogRoot v-model:open="open">
    <QuireDialogTrigger as-child>
      <QuireButton size="sm" variant="outline">
        {{ message("addFontSource") }}
      </QuireButton>
    </QuireDialogTrigger>
    <QuireDialogContent
      v-bind="{
        ...popupProps,
        ...(portalTarget ? { portalTarget } : {}),
        ...(errorText ? { errorText } : {})
      }"
      as="form"
      size="small"
      :title="message('addFontSource')"
      :description="
        en
          ? 'Connect a static stylesheet or a compatible JSON font service.'
          : '连接静态样式表或兼容的 JSON 字体服务。'
      "
      :busy="inspecting"
      @submit.prevent="enableSource"
    >
      <div class="qk-font-hub__source-settings">
        <QuireField
          v-slot="{ controlProps }"
          width="100%"
          :label="en ? 'Source format' : '接入方式'"
        >
          <QuireSelect
            v-bind="controlProps"
            v-model="mode"
            size="sm"
            width="100%"
            :label="en ? 'Source format' : '接入方式'"
            :content-props="popupProps"
            :items="[
              { value: 'css', label: en ? 'Static CSS stylesheet' : '静态 CSS 字体服务' },
              { value: 'json', label: en ? 'JSON protocol (advanced)' : 'JSON 协议（高级）' }
            ]"
          />
        </QuireField>
        <QuireField
          v-if="mode === 'css'"
          v-slot="{ controlProps }"
          width="100%"
          :label="en ? 'Name (optional)' : '名称（可选）'"
        >
          <QuireInput
            v-bind="controlProps"
            v-model="name"
            size="sm"
            width="100%"
            :maxlength="100"
            :placeholder="en ? 'Company fonts' : '例如：公司字体库'"
          />
        </QuireField>
        <QuireField
          v-slot="{ controlProps }"
          width="100%"
          :label="
            mode === 'css'
              ? en
                ? 'Font stylesheet URL'
                : '字体 CSS 地址'
              : message('descriptorUrl')
          "
          :description="
            mode === 'css'
              ? en
                ? 'The stylesheet may use relative font URLs. CSS and font files must allow access from this site.'
                : '样式表可以使用相对字体路径；CSS 与字体文件需允许当前站点访问。'
              : message('fontDescriptorHelp')
          "
        >
          <QuireInput
            v-bind="controlProps"
            v-model="url"
            width="100%"
            size="sm"
            clearable
            required
            :placeholder="
              mode === 'css'
                ? 'http://localhost:8080/fonts.css'
                : 'https://fonts.example.com/source.json'
            "
          />
        </QuireField>
        <QuireCard
          v-if="inspected"
          variant="outline"
          density="compact"
          :description="message('sourceValidated')"
        >
          <template #title>
            <QuireTypography variant="control">{{ sourceName }}</QuireTypography>
          </template>
        </QuireCard>
      </div>
      <template #footer>
        <QuireButton type="button" variant="text" @click="open = false">
          {{ message("cancel") }}
        </QuireButton>
        <QuireButton
          type="button"
          size="sm"
          variant="outline"
          :busy="inspecting"
          :disabled="!url.trim()"
          @click="inspectSource"
        >
          {{ inspecting ? message("testingFontSource") : message("testFontSource") }}
        </QuireButton>
        <QuireButton
          type="submit"
          size="sm"
          color="primary"
          variant="solid"
          :disabled="!inspected || inspecting"
        >
          {{ message("enableFontSource") }}
        </QuireButton>
      </template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
