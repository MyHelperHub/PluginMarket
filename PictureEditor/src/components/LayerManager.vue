<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useEditorStore } from "../stores/editor";
import { fabric } from "fabric";
import Layer from "./Layer.vue";

const editorStore = useEditorStore();

// 添加一个更新触发计数器，用于强制刷新图层列表
const updateTrigger = ref(0);

// 监听画布对象数量变化，强制更新图层列表
watch(
  () => editorStore.canvas?.getObjects().length,
  () => {
    updateTrigger.value++;
  }
);

// 监听画布对象变化，确保图层列表更新
watch(
  () => editorStore.canvas,
  (newCanvas, oldCanvas) => {
    if (newCanvas) {
      // 监听对象添加事件
      newCanvas.on("object:added", () => {
        updateTrigger.value++;
      });

      // 监听对象修改事件
      newCanvas.on("object:modified", () => {
        updateTrigger.value++;
      });

      // 监听对象删除事件
      newCanvas.on("object:removed", () => {
        updateTrigger.value++;
      });
    }

    // 清理旧画布的事件监听
    if (oldCanvas) {
      oldCanvas.off("object:added");
      oldCanvas.off("object:modified");
      oldCanvas.off("object:removed");
    }
  },
  { immediate: true }
);

// 图层列表
const layers = computed(() => {
  // 这个变量用于触发图层更新，不需要实际使用它的值
  updateTrigger.value; // 只是为了触发计算属性重新计算

  const canvas = editorStore.canvas;
  if (!canvas) return [];

  // 获取所有对象，过滤掉辅助对象
  const allObjects = canvas.getObjects();

  const filteredObjects = allObjects.filter((obj) => {
    // 检查是否为辅助对象
    const isHelper = obj.data && obj.data.isHelper === true;
    // 只过滤掉明确标记为辅助对象的元素
    return !isHelper;
  });

  // 反转过滤后的对象数组，使顶层对象显示在列表顶部
  return filteredObjects
    .slice()
    .reverse()
    .map((obj, index) => {
      // 为对象生成名称和图标
      let name = "";

      if (obj.type === "image") {
        name = `图片 ${index + 1}`;
      } else if (obj.type === "i-text" || obj.type === "text") {
        name = `文本: ${(obj as fabric.Text).text?.substring(0, 10) || ""}...`;
      } else if (obj.type === "rect") {
        name = `矩形 ${index + 1}`;
      } else if (obj.type === "circle") {
        name = `圆形 ${index + 1}`;
      } else {
        name = `图层 ${index + 1}`;
      }

      // 允许自定义名称
      if (obj.data && obj.data.name) {
        name = obj.data.name;
      }

      // 确保每个对象都有唯一ID
      if (!obj.data) {
        obj.data = {};
      }
      if (!obj.data.id) {
        obj.data.id = `layer_${Date.now()}_${index}`;
      }

      return {
        id: index,
        objectID: obj.data.id,
        name,
        object: obj,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        opacity: obj.opacity || 1,
      };
    });
});

// 当前选中的图层
const selectedLayer = ref<number | null>(null);
const editingLayerName = ref<string>("");
const editingLayerIndex = ref<number | null>(null);

// 监听画布选择变化
watch(
  () => editorStore.selectedObject,
  (newObj) => {
    if (!newObj) {
      selectedLayer.value = null;
      return;
    }

    // 查找该对象在列表中的索引
    const index = layers.value.findIndex((layer) => layer.object === newObj);
    if (index !== -1) {
      selectedLayer.value = index;
    }
  }
);

// 选择图层
const selectLayer = (index: number) => {
  const layer = layers.value[index];
  if (!layer || !layer.visible || layer.locked) return;

  selectedLayer.value = index;
  editorStore.canvas?.setActiveObject(layer.object);
  editorStore.canvas?.renderAll();
};

// 通过ID选择图层
const selectLayerByID = (objectID: string) => {
  // 查找对应ID的图层索引
  const index = layers.value.findIndex((layer) => layer.objectID === objectID);
  if (index !== -1) {
    selectLayer(index);
  } else {
    // 通过store来选择对象
    editorStore.selectObjectByID(objectID);
  }
};

// 切换图层可见性
const toggleVisibility = (index: number) => {
  const layer = layers.value[index];
  if (!layer) return;

  // 更新对象的可见性
  const newVisibility = !layer.visible;
  layer.object.set("visible", newVisibility);

  // 更新本地状态
  layer.visible = newVisibility;

  // 如果隐藏当前选中对象，需要清除选择
  if (layer.object === editorStore.selectedObject && !newVisibility) {
    editorStore.canvas?.discardActiveObject();
    selectedLayer.value = null;
  }

  editorStore.canvas?.renderAll();
  editorStore.saveHistory();

  // 触发更新
  updateTrigger.value++;
};

// 切换图层锁定状态
const toggleLock = (index: number) => {
  const layer = layers.value[index];
  if (!layer) return;

  // 修复锁定逻辑，locked取反后对应到selectable的值
  const newLocked = !layer.locked;

  // 更新对象属性
  layer.object.set({
    selectable: !newLocked,
    evented: !newLocked,
    lockMovementX: newLocked,
    lockMovementY: newLocked,
    lockRotation: newLocked,
    lockScalingX: newLocked,
    lockScalingY: newLocked,
  });

  // 更新内部状态
  layer.locked = newLocked;

  // 如果锁定当前选中对象，需要清除选择
  if (layer.object === editorStore.selectedObject && newLocked) {
    editorStore.canvas?.discardActiveObject();
    selectedLayer.value = null;
  }

  editorStore.canvas?.renderAll();
  editorStore.saveHistory();

  // 触发更新
  updateTrigger.value++;
};

// 删除图层
const deleteLayer = (index: number) => {
  const layer = layers.value[index];
  if (!layer) return;

  const canvas = editorStore.canvas;
  if (!canvas) return;

  // 如果当前图层被选中，先清除选择
  if (layer.object === editorStore.selectedObject) {
    canvas.discardActiveObject();
    selectedLayer.value = null;
  }

  // 删除对象
  canvas.remove(layer.object);
  canvas.renderAll();
  editorStore.saveHistory();

  // 触发更新
  updateTrigger.value++;
};

// 复制图层
const duplicateLayer = (index: number) => {
  const layer = layers.value[index];
  if (!layer) return;

  if (!editorStore.canvas) return;
  const canvas = editorStore.canvas;

  layer.object.clone((cloned: fabric.Object) => {
    // 确保克隆对象有自己的唯一ID
    if (!cloned.data) {
      cloned.data = {};
    }

    // 为克隆对象创建新的唯一ID
    const uniqueID = `layer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    cloned.data.id = uniqueID;
    cloned.data.isHelper = false; // 确保不是辅助对象

    // 设置位置在原对象右下方一点
    cloned.set({
      left: (layer.object.left || 0) + 20,
      top: (layer.object.top || 0) + 20,
      data: {
        ...cloned.data,
        name: `${layer.name} 副本`,
      },
    });

    // 添加到画布
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.renderAll();
    editorStore.saveHistory();

    // 触发更新
    updateTrigger.value++;
  });
};

// 移动图层上移（使其在图层面板中上移一位）
const moveLayerUp = (index: number) => {
  // 检查索引是否有效
  if (index <= 0 || index >= layers.value.length) {
    return;
  }

  const canvas = editorStore.canvas;
  if (!canvas) return;

  // 获取当前图层和目标图层
  const currentLayer = layers.value[index];
  const targetLayer = layers.value[index - 1];

  if (currentLayer?.object && targetLayer?.object) {
    // 使用Fabric.js的bringForward方法将对象在画布中上移一层
    canvas.bringForward(currentLayer.object);
    canvas.renderAll();
    editorStore.saveHistory();
  }

  // 强制图层列表重新计算
  updateTrigger.value++;
};

// 移动图层下移（使其在图层面板中下移一位）
const moveLayerDown = (index: number) => {
  // 检查索引是否有效
  if (index < 0 || index >= layers.value.length - 1) {
    return;
  }

  const canvas = editorStore.canvas;
  if (!canvas) return;

  // 获取当前图层和目标图层
  const currentLayer = layers.value[index];
  const targetLayer = layers.value[index + 1];

  if (currentLayer?.object && targetLayer?.object) {
    // 使用Fabric.js的sendBackwards方法将对象在画布中下移一层
    canvas.sendBackwards(currentLayer.object);
    canvas.renderAll();
    editorStore.saveHistory();
  }

  // 强制图层列表重新计算
  updateTrigger.value++;
};

// 开始编辑图层名称
const startEditLayerName = (index: number, name: string) => {
  editingLayerName.value = name;
  editingLayerIndex.value = index;
};

// 保存图层名称
const saveLayerName = () => {
  if (editingLayerIndex.value === null) return;

  const layer = layers.value[editingLayerIndex.value];
  if (!layer) return;

  // 保存名称到图层数据中
  if (!layer.object.data) {
    layer.object.data = {};
  }
  layer.object.data.name = editingLayerName.value;

  // 重置编辑状态
  editingLayerIndex.value = null;
  editingLayerName.value = "";

  editorStore.saveHistory();
};

// 设置图层不透明度
const setLayerOpacity = (index: number, opacity: number) => {
  const layer = layers.value[index];
  if (!layer || !editorStore.canvas) return;

  layer.object.set("opacity", opacity);
  editorStore.canvas.renderAll();
  editorStore.saveHistory();
};
</script>

<template>
  <div class="layer-manager">
    <div class="layer-header">
      <h3>图层管理</h3>
    </div>

    <div class="layers-list">
      <Layer
        v-for="(layer, index) in layers"
        :key="layer.objectID || index"
        :layer="layer"
        :index="index"
        :object-i-d="layer.objectID"
        :is-selected="selectedLayer === index"
        :is-editing="editingLayerIndex === index"
        :editing-name="editingLayerName"
        :is-first="index === 0"
        :is-last="index === layers.length - 1"
        @select="selectLayer(index)"
        @select-by-id="selectLayerByID"
        @toggle-visibility="toggleVisibility(index)"
        @toggle-lock="toggleLock(index)"
        @delete="deleteLayer(index)"
        @duplicate="duplicateLayer(index)"
        @move-up="moveLayerUp(index)"
        @move-down="moveLayerDown(index)"
        @start-edit-name="startEditLayerName(index, $event)"
        @save-name="saveLayerName()"
        @change-opacity="setLayerOpacity(index, $event)"
      />

      <div class="empty-layers" v-if="layers.length === 0">
        <p>暂无图层</p>
        <p>请在顶部工具栏添加图片、形状或文本</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-manager {
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.layer-header {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-header h3 {
  margin: 0;
  font-size: 16px;
}

.layers-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: 5px;
}

.empty-layers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #bfbfbf;
  text-align: center;
}
</style>

<!-- 自定义指令: 聚焦到输入框 -->
<script lang="ts">
export default {
  directives: {
    focus: {
      mounted: (el) => el.focus(),
    },
  },
};
</script>
