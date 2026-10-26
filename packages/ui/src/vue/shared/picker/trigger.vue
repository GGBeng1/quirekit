<script setup lang="ts">
import { Drawer } from '@ark-ui/vue/drawer';
import { Popover } from '@ark-ui/vue/popover';
import { usePickerBottom } from './context';
const bottom = usePickerBottom();
</script>
<template><component :is="bottom ? Drawer.Trigger : Popover.Trigger" as-child><slot /></component></template>
