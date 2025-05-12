<template>
  <div class="object-property-panel">
    <!-- 形状模式 -->
    <div v-if="isShape">
      <div class="object-property">
        <span>填充颜色</span>
        <div class="color-picker">
          <a-radio-group
            v-model:value="localFillType"
            button-style="solid"
            size="small"
          >
            <a-radio-button value="transparent">透明</a-radio-button>
            <a-radio-button value="custom">自定义</a-radio-button>
          </a-radio-group>
          <a-input
            v-if="localFillType === 'custom'"
            type="color"
            v-model:value="localProps.fill"
            style="width: 100%; margin-top: 5px"
          />
        </div>
      </div>
      <div class="object-property">
        <span>边框颜色</span>
        <a-input
          type="color"
          v-model:value="localProps.stroke"
          style="width: 100%"
        />
      </div>
      <div class="object-property">
        <span>边框宽度</span>
        <a-slider
          v-model:value="localProps.strokeWidth"
          :min="0"
          :max="20"
          :step="1"
        />
      </div>
    </div>
    <!-- 文本模式 -->
    <div v-else-if="isText">
      <div class="object-property">
        <span>文本颜色</span>
        <a-input
          type="color"
          v-model:value="localProps.fill"
          style="width: 100%"
        />
      </div>
      <div class="object-property">
        <span>字体</span>
        <a-select v-model:value="localProps.fontFamily">
          <a-select-option value="Arial">Arial</a-select-option>
          <a-select-option value="Times New Roman"
            >Times New Roman</a-select-option
          >
          <a-select-option value="Microsoft YaHei">微软雅黑</a-select-option>
          <a-select-option value="SimSun">宋体</a-select-option>
          <a-select-option value="SimHei">黑体</a-select-option>
        </a-select>
      </div>
      <div class="object-property">
        <span>字号</span>
        <a-slider
          v-model:value="localProps.fontSize"
          :min="8"
          :max="80"
          :step="1"
        />
      </div>
      <div class="object-property">
        <span>样式</span>
        <div class="text-style-buttons">
          <a-button
            :type="localProps.fontWeight === 'bold' ? 'primary' : 'default'"
            @click="toggleWeight"
          >
            <template #icon><span style="font-weight: bold">B</span></template>
          </a-button>
          <a-button
            :type="localProps.fontStyle === 'italic' ? 'primary' : 'default'"
            @click="toggleStyle"
          >
            <template #icon><span style="font-style: italic">I</span></template>
          </a-button>
        </div>
      </div>
      <div class="object-property">
        <span>对齐方式</span>
        <div class="text-align-buttons">
          <a-button-group>
            <a-button
              :type="localProps.textAlign === 'left' ? 'primary' : 'default'"
              @click="updateAlign('left')"
              >L</a-button
            >
            <a-button
              :type="localProps.textAlign === 'center' ? 'primary' : 'default'"
              @click="updateAlign('center')"
              >C</a-button
            >
            <a-button
              :type="localProps.textAlign === 'right' ? 'primary' : 'default'"
              @click="updateAlign('right')"
              >R</a-button
            >
          </a-button-group>
        </div>
      </div>
      <div class="object-property">
        <span>字间距</span>
        <a-slider
          v-model:value="localProps.charSpacing"
          :min="-100"
          :max="300"
          :step="10"
        />
      </div>
    </div>
    <div v-else class="empty-panel">请选择矩形、圆形或文本来编辑其属性</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, ref, computed } from 'vue';
import type { fabric } from 'fabric';

// 定义属性和类型
type FillType = 'transparent' | 'custom';
interface ObjectProperties {
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  charSpacing: number;
}
const props = defineProps<{
  selectedObject: fabric.Object | null;
  objectProperties: ObjectProperties;
  fillType: FillType;
}>();
const emit = defineEmits<{
  (e: 'update:objectProperties', val: ObjectProperties): void;
  (e: 'update:fillType', val: FillType): void;
}>();

// 本地响应式副本
const localProps = reactive<ObjectProperties>({ ...props.objectProperties });
const localFillType = ref<FillType>(props.fillType);

// 同步 prop->local
watch(() => props.objectProperties, val => Object.assign(localProps, val));
watch(() => props.fillType, val => { localFillType.value = val });

// 同步 local->prop
watch(localProps, val => emit('update:objectProperties', { ...val }), { deep: true });
watch(localFillType, val => emit('update:fillType', val));

// 判断类型
const isShape = computed(() =>
  props.selectedObject?.type === 'rect' || props.selectedObject?.type === 'circle'
);
const isText = computed(() =>
  props.selectedObject?.type === 'i-text' || props.selectedObject?.type === 'text'
);

// 操作本地值
function toggleWeight() {
  localProps.fontWeight = localProps.fontWeight === 'bold' ? 'normal' : 'bold';
}
function toggleStyle() {
  localProps.fontStyle = localProps.fontStyle === 'italic' ? 'normal' : 'italic';
}
function updateAlign(val: string) {
  localProps.textAlign = val;
}
</script>

<style scoped>
.object-property {
  margin-bottom: 15px;
}
.object-property span {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}
.text-style-buttons,
.text-align-buttons {
  display: flex;
  gap: 8px;
  margin-top: 5px;
}
.empty-panel {
  text-align: center;
  padding: 15px;
  color: #999;
}
.color-picker {
  margin-top: 5px;
}
</style>
