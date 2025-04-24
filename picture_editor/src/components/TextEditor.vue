<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useEditorStore } from "../stores/editor";
import { fabric } from "fabric";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(["update:visible"]);

// 创建内部变量跟踪模态框显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value)
});

const editorStore = useEditorStore();
const textContent = ref("双击编辑文本");
const fontSize = ref(24);
const fontFamily = ref("Arial");
const fontWeight = ref("normal");
const fontStyle = ref("normal");
const textAlign = ref("left");
const textColor = ref("#000000");
const textBgColor = ref("");
const stroke = ref(false);
const strokeWidth = ref(1);
const strokeColor = ref("#000000");

const textObject = ref<fabric.IText | null>(null);

const fontFamilies = [
  { label: "Arial", value: "Arial" },
  { label: "微软雅黑", value: "Microsoft YaHei" },
  { label: "宋体", value: "SimSun" },
  { label: "黑体", value: "SimHei" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
];

// 监听可见性变化
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      addTextToCanvas();
    }
  }
);

// 添加文本到画布
const addTextToCanvas = () => {
  const canvas = editorStore.canvas;
  if (!canvas) return;

  // 创建文本对象
  const canvasCenter = canvas.getCenter();
  const text = new fabric.IText(textContent.value, {
    left: canvasCenter.left,
    top: canvasCenter.top,
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    fontWeight: fontWeight.value as any,
    fontStyle: fontStyle.value as any,
    textAlign: textAlign.value as any,
    fill: textColor.value,
    backgroundColor: textBgColor.value || undefined,
    stroke: stroke.value ? strokeColor.value : undefined,
    strokeWidth: stroke.value ? strokeWidth.value : 0,
    charSpacing: 0,
    lineHeight: 1.2,
    padding: 5,
    cornerSize: 10,
    transparentCorners: false,
    cornerColor: "white",
    cornerStrokeColor: "black",
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  textObject.value = text;

  // 激活文本编辑模式
  text.enterEditing();

  // 保存到历史记录
  editorStore.saveHistory();
};

// 应用样式到当前文本
const applyTextStyle = () => {
  if (!textObject.value || !editorStore.canvas) return;

  textObject.value.set({
    text: textContent.value,
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    fontWeight: fontWeight.value as any,
    fontStyle: fontStyle.value as any,
    textAlign: textAlign.value as any,
    fill: textColor.value,
    backgroundColor: textBgColor.value || undefined,
    stroke: stroke.value ? strokeColor.value : undefined,
    strokeWidth: stroke.value ? strokeWidth.value : 0,
  });

  editorStore.canvas.renderAll();
  editorStore.saveHistory();
};

// 确认添加文本
const confirmText = () => {
  if (textObject.value) {
    textObject.value.exitEditing();
  }
  editorStore.saveHistory();
  emit("update:visible", false);
};

// 取消添加文本
const cancelText = () => {
  if (textObject.value && editorStore.canvas) {
    editorStore.canvas.remove(textObject.value);
    editorStore.canvas.renderAll();
  }
  emit("update:visible", false);
};

// 监听样式变化
watch(
  [
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
    textColor,
    textBgColor,
    stroke,
    strokeWidth,
    strokeColor,
  ],
  () => {
    applyTextStyle();
  },
  { deep: true }
);

// 监听内容变化
watch(textContent, (newValue) => {
  if (textObject.value) {
    textObject.value.text = newValue;
    editorStore.canvas?.renderAll();
  }
});
</script>

<template>
  <a-modal
    :open="modalVisible"
    @update:open="modalVisible = $event"
    title="添加文本"
    :footer="null"
    :maskClosable="false"
    width="450px"
    class="text-editor-modal"
  >
    <div class="text-editor">
      <a-form layout="vertical">
        <a-form-item label="文本内容">
          <a-textarea v-model:value="textContent" :rows="2" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="字体">
              <a-select v-model:value="fontFamily">
                <a-select-option
                  v-for="font in fontFamilies"
                  :key="font.value"
                  :value="font.value"
                >
                  {{ font.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="字号">
              <a-input-number v-model:value="fontSize" :min="10" :max="100" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="颜色">
              <a-input
                v-model:value="textColor"
                type="color"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="背景色">
              <a-input
                v-model:value="textBgColor"
                type="color"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="样式">
          <a-space>
            <a-button
              :type="fontWeight === 'bold' ? 'primary' : 'default'"
              @click="fontWeight = fontWeight === 'bold' ? 'normal' : 'bold'"
            >
              <template #icon
                ><span style="font-weight: bold">B</span></template
              >
            </a-button>

            <a-button
              :type="fontStyle === 'italic' ? 'primary' : 'default'"
              @click="fontStyle = fontStyle === 'italic' ? 'normal' : 'italic'"
            >
              <template #icon
                ><span style="font-style: italic">I</span></template
              >
            </a-button>

            <a-button
              :type="textAlign === 'left' ? 'primary' : 'default'"
              @click="textAlign = 'left'"
            >
              <template #icon>L</template>
            </a-button>

            <a-button
              :type="textAlign === 'center' ? 'primary' : 'default'"
              @click="textAlign = 'center'"
            >
              <template #icon>C</template>
            </a-button>

            <a-button
              :type="textAlign === 'right' ? 'primary' : 'default'"
              @click="textAlign = 'right'"
            >
              <template #icon>R</template>
            </a-button>
          </a-space>
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="stroke">启用描边</a-checkbox>
        </a-form-item>

        <a-form-item v-if="stroke">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="描边颜色">
                <a-input v-model:value="strokeColor" type="color" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="描边宽度">
                <a-slider v-model:value="strokeWidth" :min="1" :max="5" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form-item>
      </a-form>

      <div class="text-actions">
        <a-button @click="cancelText">取消</a-button>
        <a-button type="primary" @click="confirmText">添加</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.text-editor {
  max-height: 70vh;
  overflow-y: auto;
}

.text-actions {
  margin-top: 16px;
  text-align: right;
}

.text-actions button {
  margin-left: 8px;
}
</style>
