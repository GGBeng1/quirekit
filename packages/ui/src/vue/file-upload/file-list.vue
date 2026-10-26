<script setup lang="ts">
import { FileUpload, useFileUploadContext } from '@ark-ui/vue/file-upload';
import type { QuireKitFileUploadItemSlotProps, QuireKitFileUploadListProps, QuireKitFileUploadRejectionSlotProps } from '../../components/file-upload';
import QuireIcon from '../icon/icon.vue';
import QuireIconButton from '../button/icon-button.vue';
import QuireFileIcon from '../file-icon/file-icon.vue';
import HorizontalStrip from '../shared/horizontal-scroll/strip.vue';
import { getQuireKitFileUploadErrorMessage } from '../../components/file-upload';
import { useQuireKitMessages } from '../locale-provider/context';

withDefaults(defineProps<QuireKitFileUploadListProps>(), { layout: 'list', showRejections: true });
const emit = defineEmits<{ /** 文件移除意图，便于宿主恢复焦点；集合仍通过 FileUpload 同步。 */ remove: [file: File] }>();
defineSlots<{
  /** 替换单个已接受文件。 */ item?: (props: QuireKitFileUploadItemSlotProps) => unknown;
  /** 替换单个拒绝文件反馈。 */ rejection?: (props: QuireKitFileUploadRejectionSlotProps) => unknown;
  /** 没有已接受文件时的内容。 */ empty?: () => unknown;
}>();
const fileUpload = useFileUploadContext();
const text = useQuireKitMessages('fileUpload');
/** @param errors - Rejection codes. @returns Readable feedback in the resolved language. */
const getFileErrorMessage = (errors: readonly string[]): string => getQuireKitFileUploadErrorMessage(errors, text.value);

/** Delete through the existing upload owner, never mutate a host's File array.
 * @param file - Accepted or rejected local file.
 * @param type - Owning collection.
 */
function remove(file: File, type: 'accepted' | 'rejected'): void {
  if (fileUpload.value.disabled || fileUpload.value.readOnly) return;
  fileUpload.value.deleteFile(file, type);
  emit('remove', file);
}
</script>

<template>
  <div class="qk-file-upload__collection" :data-layout="layout">
    <HorizontalStrip v-if="fileUpload.acceptedFiles.length" :enabled="layout === 'strip'">
    <FileUpload.ItemGroup class="qk-file-upload__list" type="accepted">
      <FileUpload.Item v-for="(file, index) in fileUpload.acceptedFiles" :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="qk-file-upload__item" :data-media="file.type.startsWith('image/') ? 'image' : 'file'" :file="file" type="accepted">
        <slot name="item" :file="file" :index="index" :size-text="fileUpload.getFileSize(file)" :remove="() => remove(file, 'accepted')">
          <div class="qk-file-upload__preview" aria-hidden="true">
            <QuireFileIcon :name="file.name" :media-type="file.type" :size="28" />
            <FileUpload.ItemPreview class="qk-file-upload__preview-image-wrap" type="image/*">
              <FileUpload.ItemPreviewImage class="qk-file-upload__preview-image" />
            </FileUpload.ItemPreview>
          </div>
          <div class="qk-file-upload__item-content">
            <FileUpload.ItemName class="qk-file-upload__item-name" :title="file.name" />
            <FileUpload.ItemSizeText class="qk-file-upload__item-size" />
          </div>
          <QuireIconButton class="qk-file-upload__delete" :label="text.remove(file.name)" size="xs"
            :shape="layout === 'strip' && file.type.startsWith('image/') ? 'circle' : 'rounded'"
            :variant="layout === 'strip' && file.type.startsWith('image/') ? 'solid' : 'ghost'"
            :disabled="fileUpload.disabled || fileUpload.readOnly" @click="remove(file, 'accepted')">
            <QuireIcon name="close" :size="16" />
          </QuireIconButton>
        </slot>
      </FileUpload.Item>
    </FileUpload.ItemGroup>
    </HorizontalStrip>
    <slot v-else name="empty" />
    <FileUpload.ItemGroup v-if="showRejections && fileUpload.rejectedFiles.length" class="qk-file-upload__rejections" type="rejected">
      <FileUpload.Item v-for="(rejection, index) in fileUpload.rejectedFiles" :key="`${rejection.file.name}-${rejection.file.size}-${index}`"
        class="qk-file-upload__rejection" :file="rejection.file" type="rejected">
        <slot name="rejection" :rejection="rejection" :index="index" :message="getFileErrorMessage(rejection.errors)" :remove="() => remove(rejection.file, 'rejected')">
          <QuireIcon class="qk-file-upload__rejection-icon" name="triangleAlert" :size="20" />
          <div class="qk-file-upload__item-content">
            <FileUpload.ItemName class="qk-file-upload__item-name" />
            <span class="qk-file-upload__rejection-message">{{ getFileErrorMessage(rejection.errors) }}</span>
          </div>
          <QuireIconButton class="qk-file-upload__delete" :label="text.remove(rejection.file.name)" size="xs"
            :disabled="fileUpload.disabled || fileUpload.readOnly" @click="remove(rejection.file, 'rejected')">
            <QuireIcon name="close" :size="16" />
          </QuireIconButton>
        </slot>
      </FileUpload.Item>
    </FileUpload.ItemGroup>
  </div>
</template>
