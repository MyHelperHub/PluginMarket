<template>
  <div class="toolbar">
    <a-button-group>
      <a-tooltip title="撤销">
        <a-button @click="$emit('undo')">
          <template #icon><UndoOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="重做">
        <a-button @click="$emit('redo')">
          <template #icon><RedoOutlined /></template>
        </a-button>
      </a-tooltip>
    </a-button-group>
    <a-divider type="vertical" />
    <a-tooltip title="打开图片">
      <a-button @click="$emit('upload-image')">
        <template #icon><PictureOutlined /></template>
      </a-button>
    </a-tooltip>
    <a-divider type="vertical" />
    <a-button-group>
      <a-tooltip
        :title="editorStore.selectedObject ? '缩小选中图层' : '缩小画布'"
      >
        <a-button @click="$emit('zoom-object', -1)">
          <template #icon><ZoomOutOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip :title="`缩放: ${Math.round(zoomLevel * 100)}%`">
        <a-button>{{ Math.round(zoomLevel * 100) }}%</a-button>
      </a-tooltip>
      <a-tooltip
        :title="editorStore.selectedObject ? '放大选中图层' : '放大画布'"
      >
        <a-button @click="$emit('zoom-object', 1)">
          <template #icon><ZoomInOutlined /></template>
        </a-button>
      </a-tooltip>
    </a-button-group>
    <a-divider type="vertical" />
    <a-button-group>
      <a-tooltip title="裁剪">
        <a-button @click="$emit('set-tool', 'crop')">
          <template #icon><ScissorOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="向左旋转">
        <a-button @click="$emit('rotate-image', -90)">
          <template #icon><RotateLeftOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="向右旋转">
        <a-button @click="$emit('rotate-image', 90)">
          <template #icon><RotateRightOutlined /></template>
        </a-button>
      </a-tooltip>
    </a-button-group>
    <a-divider type="vertical" />
    <a-button-group>
      <a-tooltip title="滤镜面板">
        <a-button
          :type="filterPanel ? 'primary' : 'default'"
          @click="$emit('update:filterPanel', !filterPanel)"
        >
          <template #icon><FilterOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="变换面板">
        <a-button
          :type="transformPanel ? 'primary' : 'default'"
          @click="$emit('update:transformPanel', !transformPanel)"
        >
          <template #icon><SettingOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="形状属性">
        <a-button
          :type="objectPanel ? 'primary' : 'default'"
          @click="$emit('update:objectPanel', !objectPanel)"
        >
          <template #icon><BorderOutlined /></template>
        </a-button>
      </a-tooltip>
    </a-button-group>
    <a-divider type="vertical" />
    <a-button-group>
      <a-tooltip title="添加矩形">
        <a-button @click="$emit('add-shape', 'rect')">
          <template #icon><BorderOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="添加圆形">
        <a-button @click="$emit('add-shape', 'circle')">
          <template #icon><HighlightOutlined /></template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="添加文本">
        <a-button @click="$emit('add-shape', 'text')">
          <template #icon><FontSizeOutlined /></template>
        </a-button>
      </a-tooltip>
    </a-button-group>
    <a-divider type="vertical" />
    <a-tooltip title="图层管理">
      <a-button
        :type="layerPanel ? 'primary' : 'default'"
        @click="$emit('update:layerPanel', !layerPanel)"
      >
        <template #icon><OrderedListOutlined /></template>
      </a-button>
    </a-tooltip>
    <a-divider type="vertical" />
    <a-tooltip title="导出">
      <a-button type="primary" @click="$emit('open-export-modal')">
        <template #icon><SaveOutlined /></template>
      </a-button>
    </a-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useEditorStore } from "../../stores/editor";
import {
  UndoOutlined,
  RedoOutlined,
  PictureOutlined,
  ScissorOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  FontSizeOutlined,
  FilterOutlined,
  SaveOutlined,
  SettingOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  OrderedListOutlined,
  BorderOutlined,
  HighlightOutlined,
} from "@ant-design/icons-vue";

const props = defineProps<{
  filterPanel: boolean;
  transformPanel: boolean;
  objectPanel: boolean;
  layerPanel: boolean;
  zoomLevel: number;
}>();
const emit = defineEmits([
  "update:filterPanel",
  "update:transformPanel",
  "update:objectPanel",
  "update:layerPanel",
  "undo",
  "redo",
  "upload-image",
  "zoom-object",
  "set-tool",
  "rotate-image",
  "add-shape",
  "open-export-modal",
]);

// 获取编辑器 store
const editorStore = useEditorStore();
// 缩放百分比计算
const zoomLevel = computed(() => props.zoomLevel);
</script>

<style scoped>
.toolbar {
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.toolbar a-divider {
  margin: 0 8px;
}
</style>
