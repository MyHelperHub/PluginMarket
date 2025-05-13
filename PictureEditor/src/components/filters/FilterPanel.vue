<template>
  <div class="filter-panel">
    <div class="filter-panel-header">
      <a-radio-group
        v-model:value="internalFilterTarget"
        button-style="solid"
        size="small"
      >
        <a-radio-button value="object">选中对象</a-radio-button>
        <a-radio-button value="canvas">整个画布</a-radio-button>
      </a-radio-group>
    </div>
    <div class="filter-controls">
      <div class="filter-item">
        <span>亮度</span>
        <a-slider
          :value="getCurrentFilterValue('brightness')"
          @change="$emit('brightness-change', $event)"
          :min="-100"
          :max="100"
          :disabled="internalFilterTarget === 'object' && !selectedObject"
        />
      </div>
      <div class="filter-item">
        <span>对比度</span>
        <a-slider
          :value="getCurrentFilterValue('contrast')"
          @change="$emit('contrast-change', $event)"
          :min="-100"
          :max="100"
          :disabled="internalFilterTarget === 'object' && !selectedObject"
        />
      </div>
      <div class="filter-item">
        <span>饱和度</span>
        <a-slider
          :value="getCurrentFilterValue('saturation')"
          @change="$emit('saturation-change', $event)"
          :min="-100"
          :max="100"
          :disabled="internalFilterTarget === 'object' && !selectedObject"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { fabric } from "fabric";

type FilterKey = "brightness" | "contrast" | "saturation";

const props = defineProps<{
  filterTarget: string;
  filters: Record<FilterKey, number>;
  canvasFilters: Record<FilterKey, number>;
  selectedObject: fabric.Object | null;
}>();
const emit = defineEmits<{
  (e: "update:filterTarget", val: string): void;
  (e: "brightness-change", val: number): void;
  (e: "contrast-change", val: number): void;
  (e: "saturation-change", val: number): void;
}>();

const internalFilterTarget = ref(props.filterTarget);
watch(
  () => props.filterTarget,
  (val) => (internalFilterTarget.value = val)
);
watch(internalFilterTarget, (val) => emit("update:filterTarget", val));

const getCurrentFilterValue = (type: FilterKey) => {
  return internalFilterTarget.value === "object"
    ? props.filters[type]
    : props.canvasFilters[type];
};
</script>

<style scoped>
.filter-panel-header {
  margin-bottom: 12px;
  text-align: center;
}
.filter-item {
  margin-bottom: 10px;
}
.filter-item span {
  display: block;
  margin-bottom: 5px;
}
</style>
