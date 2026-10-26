<script setup lang="ts">
import CodeBlock from "../code-block.vue";
import type { QuireKitCodeBlockProps } from "../types";

withDefaults(defineProps<Pick<QuireKitCodeBlockProps, "scheme">>(), { scheme: "auto" });
</script>

<template>
  <section class="scoped-host">
    <CodeBlock code="scoped source" :copy="false" :scheme="scheme" class="scoped-code" />
  </section>
</template>

<style scoped>
.scoped-code { margin-left: 17px; }
</style>
