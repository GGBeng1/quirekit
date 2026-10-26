<script setup lang="ts">
import { QuireIcon, QuireInput } from "@quirekit/ui/vue";
const search = defineModel<string>({required: true});
</script>
<template>
  <div class="dv-search"><QuireInput v-model="search" type="search" aria-label="搜索记录" placeholder="搜索记录…" :maxlength="256" clearable size="sm" width="100%"><template #leading><QuireIcon name="search" /></template></QuireInput></div>
</template>
