<script setup lang="ts">
import type { QuireKitProseImgProps } from "../types";
withDefaults(defineProps<QuireKitProseImgProps>(), { loading: "lazy", decoding: "async" });
</script>
<template>
  <img class="qk-prose-node" :src="src" :alt="alt" :width="width" :height="height" :loading="loading" :decoding="decoding" />
</template>
