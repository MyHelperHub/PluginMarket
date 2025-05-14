<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useEditorStore } from "../stores/editor";
import { fabric } from "fabric";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(["update:visible", "crop-complete"]);

// 创建内部变量跟踪模态框显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

const editorStore = useEditorStore();
const cropRectRef = ref<fabric.Rect | null>(null);
const originalImage = ref<fabric.Image | null>(null);
const aspectRatio = ref<number | null>(null);
const aspectOptions = [
  { label: "自由", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

// 监听可见性变化
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      initCropper();
    } else {
      removeCropper();
    }
  }
);

// 初始化裁剪器
const initCropper = () => {
  const canvas = editorStore.canvas;
  if (!canvas) return;

  // 存储当前选中的图像
  const activeObj = canvas.getActiveObject();
  if (!activeObj || !("_element" in activeObj)) {
    emit("update:visible", false);
    return;
  }

  // 类型转换时使用 unknown 作为中间步骤
  originalImage.value = activeObj as unknown as fabric.Image;

  // 禁用其他交互
  canvas.discardActiveObject();
  canvas.forEachObject((obj) => {
    obj.selectable = false;
    obj.evented = false;
  });
  canvas.selection = false;

  // 创建裁剪矩形
  const imgWidth = originalImage.value.width || 100;
  const imgHeight = originalImage.value.height || 100;
  const imgLeft = originalImage.value.left || 0;
  const imgTop = originalImage.value.top || 0;
  const imgScaleX = originalImage.value.scaleX || 1;
  const imgScaleY = originalImage.value.scaleY || 1;

  const cropRect = new fabric.Rect({
    left: imgLeft,
    top: imgTop,
    width: imgWidth * imgScaleX * 0.8,
    height: imgHeight * imgScaleY * 0.8,
    fill: "rgba(0,0,0,0.3)",
    stroke: "#fff",
    strokeDashArray: [5, 5],
    strokeWidth: 2,
    cornerColor: "white",
    cornerStrokeColor: "black",
    cornerSize: 10,
    transparentCorners: false,
    hasRotatingPoint: false,
  });

  cropRectRef.value = cropRect;
  canvas.add(cropRect);
  canvas.setActiveObject(cropRect);
  canvas.renderAll();
};

// 移除裁剪器
const removeCropper = () => {
  const canvas = editorStore.canvas;
  if (!canvas || !cropRectRef.value) return;

  canvas.remove(cropRectRef.value);

  // 重新启用交互
  canvas.forEachObject((obj) => {
    obj.selectable = true;
    obj.evented = true;
  });
  canvas.selection = true;

  if (originalImage.value) {
    canvas.setActiveObject(originalImage.value);
  }

  canvas.renderAll();
};

// 完成裁剪
const completeCrop = () => {
  const canvas = editorStore.canvas;
  if (!canvas || !cropRectRef.value || !originalImage.value) {
    emit("update:visible", false);
    return;
  }

  // 获取裁剪矩形相对于图像的位置
  const cropRect = cropRectRef.value;
  const image = originalImage.value;

  // 不需要这些变量，删除它们
  const imgScaleX = image.scaleX || 1;
  const imgScaleY = image.scaleY || 1;

  // 计算相对位置，添加安全检查
  const relativeLeft = ((cropRect.left || 0) - (image.left || 0)) / imgScaleX;
  const relativeTop = ((cropRect.top || 0) - (image.top || 0)) / imgScaleY;
  const relativeWidth = (cropRect.width || 0) / imgScaleX;
  const relativeHeight = (cropRect.height || 0) / imgScaleY;

  // 裁剪图像
  image.clipPath = new fabric.Rect({
    left: relativeLeft,
    top: relativeTop,
    width: relativeWidth,
    height: relativeHeight,
    absolutePositioned: true,
  });

  // 更新图像位置和大小
  image.set({
    left: cropRect.left,
    top: cropRect.top,
    width: relativeWidth,
    height: relativeHeight,
    scaleX: 1,
    scaleY: 1,
  });

  // 清理并保存历史
  canvas.remove(cropRect);
  canvas.setActiveObject(image);
  editorStore.saveHistory();

  emit("update:visible", false);
  emit("crop-complete");
};

// 取消裁剪
const cancelCrop = () => {
  emit("update:visible", false);
};

// 监听宽高比变化
watch(aspectRatio, (newRatio) => {
  if (!cropRectRef.value || !newRatio) return;

  const cropRect = cropRectRef.value;
  const canvas = editorStore.canvas;

  // 保持中心点不变，调整高度以匹配宽高比
  const center = cropRect.getCenterPoint();
  const width = cropRect.width || 0;
  const newHeight = width / newRatio;

  cropRect.set({
    height: newHeight,
    left: center.x - width / 2,
    top: center.y - newHeight / 2,
  });

  canvas?.renderAll();
});
</script>

<template>
  <a-modal
    :open="modalVisible"
    @update:open="modalVisible = $event"
    title="裁剪图片"
    :footer="null"
    :maskClosable="false"
    :keyboard="false"
    class="cropper-modal"
  >
    <div class="cropper-controls">
      <a-radio-group v-model:value="aspectRatio" button-style="solid">
        <a-radio-button
          v-for="option in aspectOptions"
          :key="String(option.value)"
          :value="option.value"
        >
          {{ option.label }}
        </a-radio-button>
      </a-radio-group>
    </div>

    <div class="cropper-actions">
      <a-button @click="cancelCrop">取消</a-button>
      <a-button type="primary" @click="completeCrop">确认裁剪</a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.cropper-controls {
  margin-bottom: 16px;
  text-align: center;
}

.cropper-actions {
  margin-top: 16px;
  text-align: right;
}

.cropper-actions button {
  margin-left: 8px;
}
</style>
