<script setup lang="ts">
import { computed } from "vue";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CopyOutlined,
  FileImageOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  BorderOutlined,
} from "@ant-design/icons-vue";

// 接收属性
const props = defineProps({
  // 图层数据
  layer: {
    type: Object,
    required: true,
  },
  // 是否选中
  isSelected: {
    type: Boolean,
    default: false,
  },
  // 编辑状态
  isEditing: {
    type: Boolean,
    default: false,
  },
  // 编辑名称
  editingName: {
    type: String,
    default: "",
  },
  // 图层索引
  index: {
    type: Number,
    required: true,
  },
  // 是否为列表中第一个图层
  isFirst: {
    type: Boolean,
    default: false,
  },
  // 是否为列表中最后一个图层
  isLast: {
    type: Boolean,
    default: false,
  },
  // 图层ID
  objectID: {
    type: String,
    default: "",
  },
});

// 事件
const emit = defineEmits([
  "select",
  "toggle-visibility",
  "toggle-lock",
  "delete",
  "duplicate",
  "move-up",
  "move-down",
  "start-edit-name",
  "save-name",
  "change-opacity",
  "select-by-id",
]);

// 图层图标
const layerIcon = computed(() => {
  if (props.layer.object.type === "image") {
    return FileImageOutlined;
  } else if (
    props.layer.object.type === "i-text" ||
    props.layer.object.type === "text"
  ) {
    return FontSizeOutlined;
  } else if (props.layer.object.type === "rect") {
    return BorderOutlined;
  } else if (props.layer.object.type === "circle") {
    return HighlightOutlined;
  }
  return null;
});

// 图层ID
const layerID = computed(() => {
  return (
    props.layer.object.data?.id || props.objectID || `layer_${props.index}`
  );
});

// 选择当前图层
const selectThisLayer = () => {
  // 检查图层是否被锁定或隐藏
  if (props.layer.locked || !props.layer.visible) {
    return;
  }

  if (props.layer.objectID) {
    emit("select-by-id", props.layer.objectID);
  } else {
    emit("select");
  }
};

// 处理可见性切换
const handleToggleVisibility = (event: Event) => {
  event.stopPropagation(); // 防止冒泡触发选择
  emit("toggle-visibility");
};

// 处理锁定切换
const handleToggleLock = (event: Event) => {
  event.stopPropagation(); // 防止冒泡触发选择
  emit("toggle-lock");
};
</script>

<template>
  <div
    class="layer-item"
    :class="{ selected: isSelected }"
    @click="selectThisLayer"
    :data-layer-id="layerID"
  >
    <div class="layer-content">
      <div class="layer-info">
        <component :is="layerIcon" v-if="layerIcon" class="layer-icon" />

        <!-- 图层名称 (可编辑) -->
        <a-input
          v-if="isEditing"
          :value="editingName"
          size="small"
          @pressEnter="emit('save-name')"
          @blur="emit('save-name')"
          style="width: 120px"
          v-focus
        />
        <span
          v-else
          class="layer-name"
          @dblclick="emit('start-edit-name', layer.name)"
          :title="layer.name"
        >
          {{ layer.name }}
        </span>
      </div>

      <div class="layer-actions">
        <a-button
          type="text"
          size="small"
          @click.stop="handleToggleVisibility"
          :title="layer.visible ? '隐藏图层' : '显示图层'"
        >
          <template #icon>
            <EyeOutlined v-if="layer.visible" />
            <EyeInvisibleOutlined v-else />
          </template>
        </a-button>

        <a-button
          type="text"
          size="small"
          @click.stop="handleToggleLock"
          :title="layer.locked ? '解锁图层' : '锁定图层'"
        >
          <template #icon>
            <UnlockOutlined v-if="!layer.locked" />
            <LockOutlined v-else />
          </template>
        </a-button>

        <a-dropdown :trigger="['click']">
          <a-button type="text" size="small" title="更多操作">
            <template #icon>⋮</template>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click.stop="emit('duplicate')">
                <CopyOutlined /> 复制图层
              </a-menu-item>
              <a-menu-item @click.stop="emit('start-edit-name', layer.name)">
                <FontSizeOutlined /> 重命名
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item @click.stop="emit('delete')">
                <DeleteOutlined /> 删除图层
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <div class="layer-properties">
      <div class="opacity-slider">
        <span class="opacity-label">不透明度:</span>
        <a-slider
          :value="layer.opacity"
          :min="0"
          :max="1"
          :step="0.01"
          :tipFormatter="(val: number) => `${Math.round(val * 100)}%`"
          style="flex: 1"
          @change="(value: number) => emit('change-opacity', value)"
          @click.stop
        />
      </div>
    </div>

    <div class="layer-position">
      <a-button
        type="text"
        size="small"
        @click.stop="emit('move-up')"
        :disabled="isFirst"
        title="上移图层"
      >
        <template #icon><ArrowUpOutlined /></template>
      </a-button>

      <a-button
        type="text"
        size="small"
        @click.stop="emit('move-down')"
        :disabled="isLast"
        title="下移图层"
      >
        <template #icon><ArrowDownOutlined /></template>
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.layer-item {
  padding: 8px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: background-color 0.2s;
}

.layer-item:hover {
  background-color: #f5f5f5;
}

.layer-item.selected {
  background-color: #e6f7ff;
}

.layer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-info {
  display: flex;
  align-items: center;
}

.layer-icon {
  margin-right: 8px;
  font-size: 14px;
  color: #666;
}

.layer-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.layer-actions {
  display: flex;
}

.layer-properties {
  margin-top: 5px;
  margin-bottom: 5px;
}

.opacity-slider {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.opacity-label {
  margin-right: 8px;
  color: #666;
  white-space: nowrap;
}

.layer-position {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}
</style>
