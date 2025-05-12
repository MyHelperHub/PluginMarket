<template>
  <div class="transform-panel">
    <a-button-group style="margin-bottom: 10px">
      <a-button @click="$emit('rotate', -90)" :disabled="!selectedObject">
        <template #icon><RotateLeftOutlined /></template>
      </a-button>
      <a-button @click="$emit('rotate', 90)" :disabled="!selectedObject">
        <template #icon><RotateRightOutlined /></template>
      </a-button>
    </a-button-group>
    <a-button-group>
      <a-button @click="$emit('zoom', -1)" :disabled="!selectedObject">
        <template #icon><ZoomOutOutlined /></template>
      </a-button>
      <a-button @click="$emit('zoom', 1)" :disabled="!selectedObject">
        <template #icon><ZoomInOutlined /></template>
      </a-button>
    </a-button-group>
  </div>
</template>

<script setup lang="ts">
import type { fabric } from "fabric";
import {
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomOutOutlined,
  ZoomInOutlined,
} from "@ant-design/icons-vue";

const props = defineProps<{
  selectedObject: fabric.Object | null;
}>();
const emit = defineEmits<{
  (e: "rotate", value: number): void;
  (e: "zoom", value: number): void;
}>();
</script>

<style scoped>
.transform-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
