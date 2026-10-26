<script setup lang="ts">
import type { QuireKitProseSlots } from "../../types";
import type { QuireKitTypographyProps } from "../../../../components/typography";
import Abbreviation from "../../../typography/abbreviation.vue";
const props = defineProps<Pick<QuireKitTypographyProps, "title">>();
defineSlots<QuireKitProseSlots>();
</script>
<template>
  <Abbreviation v-bind="props" class="qk-prose-node"><slot /></Abbreviation>
</template>
