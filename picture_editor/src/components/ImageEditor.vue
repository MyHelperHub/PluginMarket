<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { markRaw } from "vue";
import { useEditorStore } from "../stores/editor";
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
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import LayerManager from "./LayerManager.vue";
import { fabric } from "fabric";
import { calculateImageFileSize } from "../utils/fileUtils";

// 初始化store和引用
const editorStore = useEditorStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const exportFormat = ref("png");
const exportQuality = ref(0.9);
const isExportModalOpen = ref(false);
const zoomLevel = ref(1);

// 导出设置
const exportSettings = ref({
  sizeType: "pixel", // pixel 或 percent
  width: 800,
  height: 600,
  percentSize: 100,
  dpi: 96,
  maintainAspectRatio: true,
});

// 实时文件大小估算
const estimatedFileSize = ref("0 KB");

// 导出预览图
const exportPreviewUrl = ref("");

// 图片滤镜参数
const filters = ref({
  brightness: 0,
  contrast: 0,
  saturation: 0,
});

// 画布背景滤镜
const canvasFilters = ref({
  brightness: 0,
  contrast: 0,
  saturation: 0,
});

// 显示图层管理
const showLayerManager = ref(false);

// 监听画布对象变化，自动显示/隐藏图层面板
watch(
  () => editorStore.canvas?.getObjects().length,
  (newLength) => {
    if (newLength && newLength > 0) {
      // 过滤掉辅助对象
      const actualObjects = editorStore.canvas
        ?.getObjects()
        .filter((obj) => !(obj.data && obj.data.isHelper)).length;

      if (actualObjects && actualObjects > 0) {
        showLayerManager.value = true;
      }
    }
  }
);

// 折叠面板激活的键
const activeCollapseKeys = ref<string[]>(["1", "2", "3"]);

// 添加新的状态变量跟踪滤镜面板状态
const showFilterPanel = ref(true);
const showTransformPanel = ref(true);
const showObjectPanel = ref(true); // 修改为通用对象属性面板

// 添加滤镜目标状态 - 对象或画布
const filterTarget = ref("object"); // 'object' 或 'canvas'

// 定义对象属性
const objectProperties = ref({
  // 共享属性
  fill: "transparent",
  stroke: "#000000",
  strokeWidth: 2,

  // 文本特有属性
  fontSize: 20,
  fontFamily: "Arial",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left",
  charSpacing: 0,
});

// 添加填充类型计算属性
const fillType = computed({
  get: () =>
    objectProperties.value.fill === "transparent" ? "transparent" : "custom",
  set: (val: string) => {
    objectProperties.value.fill =
      val === "transparent" ? "transparent" : "#ffffff";
  },
});

// 添加防抖函数
const debounceTimer = ref<number | null>(null);

// 添加一个状态变量来跟踪fabric.js是否已准备好
const fabricReady = ref(false);

// 添加预览图防抖定时器
const previewDebounceTimer = ref<number | null>(null);

/**
 * 检查fabric.js是否已准备好
 */
const checkFabricReady = async () => {
  try {
    // 检查fabric.js是否可用
    if (fabric && fabric.Canvas) {
      fabricReady.value = true;
      return true;
    } else {
      console.warn("等待fabric.js加载...");
      // 等待短暂时间后重试
      await new Promise((resolve) => setTimeout(resolve, 500));
      return checkFabricReady();
    }
  } catch (error) {
    console.error("检查fabric.js时出错:", error);
    message.error("无法加载fabric.js库，请刷新页面重试");
    return false;
  }
};

/**
 * 计算导出尺寸
 */
const exportDimensions = computed(() => {
  const canvasWidth = editorStore.canvas?.width ?? 0;
  const canvasHeight = editorStore.canvas?.height ?? 0;

  if (exportSettings.value.sizeType === "pixel") {
    return {
      width: exportSettings.value.width,
      height: exportSettings.value.height,
    };
  } else {
    // 百分比计算
    return {
      width: Math.round(canvasWidth * (exportSettings.value.percentSize / 100)),
      height: Math.round(
        canvasHeight * (exportSettings.value.percentSize / 100)
      ),
    };
  }
});

/**
 * 缩放画布
 * @param delta 缩放增量(正值放大，负值缩小)
 * @param mouseCoords 鼠标位置
 */
const zoomCanvas = (delta: number, mouseCoords?: { x: number; y: number }) => {
  if (!editorStore.canvas) return;

  const canvas = editorStore.canvas;
  const currentZoom = zoomLevel.value;

  // 计算新的缩放值 (0.1 到 5 范围内)
  const newZoom = Math.max(0.1, Math.min(5, currentZoom * (1 + delta * 0.1)));

  // 如果缩放值没变，不做任何事
  if (newZoom === currentZoom) return;

  // 更新缩放级别
  zoomLevel.value = newZoom;

  if (mouseCoords) {
    // 如果提供了鼠标坐标，使用它作为缩放中心点
    // 将页面坐标转换为画布对象坐标
    const transform = canvas.viewportTransform;
    if (!transform) return;

    // 获取鼠标在当前画布状态下的对象坐标
    const zoomPoint = new fabric.Point(
      (mouseCoords.x - transform[4]) / currentZoom,
      (mouseCoords.y - transform[5]) / currentZoom
    );

    // 计算新的画布中心位置
    transform[4] = mouseCoords.x - zoomPoint.x * newZoom;
    transform[5] = mouseCoords.y - zoomPoint.y * newZoom;

    // 更新画布缩放
    transform[0] = newZoom;
    transform[3] = newZoom;

    canvas.setViewportTransform(transform);
  } else {
    // 无鼠标坐标时，使用画布中心作为缩放点
    const canvasWidth = canvas.width ?? 0;
    const canvasHeight = canvas.height ?? 0;

    // 使用fabric.js的API方法避免类型问题
    canvas.setZoom(newZoom);

    // 创建一个包含x和y属性的对象并将其转型为fabric.Point
    const left = (canvasWidth / 2) * (1 - newZoom);
    const top = (canvasHeight / 2) * (1 - newZoom);
    const point = { x: left, y: top } as unknown as fabric.Point;
    canvas.absolutePan(point);
  }

  canvas.requestRenderAll();
};

/**
 * 处理工具栏按钮缩放
 * @param delta 缩放增量
 */
const handleButtonZoom = (delta: number) => {
  zoomCanvas(delta);
};

/**
 * 初始化画布拖拽和缩放功能
 */
const setupCanvasInteractions = () => {
  if (!editorStore.canvas) return;

  const canvas = editorStore.canvas;

  // 监听对象选择和取消选择
  canvas.on("selection:created", (e) => {
    if (e.selected && e.selected.length > 0) {
      // 选中对象时无需日志记录
    }
  });

  canvas.on("selection:cleared", () => {
    // 清除选择时无需日志记录
  });

  // 滚轮缩放
  canvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    e.preventDefault();
    e.stopPropagation();

    // 确定缩放方向
    const delta = e.deltaY < 0 ? 1 : -1;

    // 获取鼠标坐标
    const mouseCoords = {
      x: e.offsetX,
      y: e.offsetY,
    };

    // 获取画布当前的活动对象（这比使用store中的selectedObject更可靠）
    const activeObject = canvas.getActiveObject();

    // 当有活动对象，并且鼠标指向的目标是活动对象时
    if (activeObject && opt.target === activeObject) {
      // 缩放选中对象
      scaleSelectedObject(delta, activeObject);
    } else {
      // 否则缩放整个画布
      zoomCanvas(delta, mouseCoords);
    }
  });

  // 拖拽画布功能
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  // 鼠标按下时，如果按住Alt键或使用中键，且没有选中对象，启用拖拽
  canvas.on("mouse:down", (opt) => {
    if ((opt.e.altKey || opt.e.button === 1) && !opt.target) {
      isDragging = true;
      canvas.selection = false;
      lastX = opt.e.clientX;
      lastY = opt.e.clientY;
    }
  });

  // 鼠标移动时，如果正在拖拽，更新画布位置
  canvas.on("mouse:move", (opt) => {
    if (isDragging) {
      const e = opt.e;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      vpt[4] += e.clientX - lastX;
      vpt[5] += e.clientY - lastY;

      canvas.requestRenderAll();

      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  // 鼠标松开或离开画布时结束拖拽
  const endDrag = () => {
    isDragging = false;
    canvas.selection = true;
  };

  canvas.on("mouse:up", endDrag);
  canvas.on("mouse:out", endDrag);

  // 双击重置视图
  canvas.on("mouse:dblclick", (opt) => {
    if (!opt.target) {
      resetView();
    }
  });
};

/**
 * 重置视图到默认状态
 */
const resetView = () => {
  if (!editorStore.canvas) return;

  zoomLevel.value = 1;
  const canvas = editorStore.canvas;

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

  // 修复Point类型问题，改用setZoom和absolutePan组合
  canvas.setZoom(1);
  canvas.absolutePan({ x: 0, y: 0 } as any);

  canvas.requestRenderAll();
};

/**
 * 初始化编辑器
 */
onMounted(async () => {
  try {
    // 首先检查fabric.js是否已准备好
    const isFabricReady = await checkFabricReady();

    if (!isFabricReady) {
      message.error("加载画布失败，请刷新页面重试");
      return;
    }

    if (canvasRef.value) {
      editorStore.initCanvas(canvasRef.value);

      // 初始化导出设置
      if (editorStore.canvas) {
        exportSettings.value.width = editorStore.canvas.width || 800;
        exportSettings.value.height = editorStore.canvas.height || 600;

        // 检查是否已有对象，如果有则显示图层面板
        const hasObjects = editorStore.canvas.getObjects().length > 0;
        showLayerManager.value = hasObjects;

        // 设置初始画布背景
        editorStore.canvas.setBackgroundColor("#ffffff", () => {
          editorStore.canvas?.renderAll();
        });
      }

      // 设置画布交互
      setupCanvasInteractions();

      // 添加一个辅助对象，用于修复 Vue3 + Fabric.js 控制点不可用的问题
      if (editorStore.canvas) {
        // 创建一个临时不可见对象
        const helperObj = new fabric.Rect({
          width: 1,
          height: 1,
          left: -100, // 放置在画布外部
          top: -100, // 放置在画布外部
          opacity: 0,
          selectable: false,
          evented: false,
          excludeFromExport: true, // 从导出中排除
          data: {
            isHelper: true,
            id: "helper_object",
          }, // 明确标记为辅助对象，用于图层管理组件过滤
        });

        // 将其添加到画布
        editorStore.canvas.add(markRaw(helperObj));
      }

      // 添加键盘事件监听
      setupKeyboardShortcuts();

      // 监听画布对象修改事件，保存历史
      if (editorStore.canvas) {
        editorStore.canvas.on("object:modified", () => {
          editorStore.saveHistory();
        });

        editorStore.canvas.on("object:added", () => {
          editorStore.saveHistory();
        });

        editorStore.canvas.on("object:removed", () => {
          editorStore.saveHistory();
        });
      }
    }
  } catch (error) {
    console.error("初始化画布时出错:", error);
    message.error("画布初始化失败，请检查浏览器控制台获取详细信息");
  }
});

/**
 * 设置键盘快捷键
 */
const setupKeyboardShortcuts = () => {
  window.addEventListener("keydown", (e) => {
    // 如果用户正在输入，不触发快捷键
    if (
      e.target &&
      ((e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable)
    ) {
      return;
    }

    // Ctrl+Z: 撤销
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      editorStore.undo();
    }

    // Ctrl+Y: 重做
    if (e.ctrlKey && e.key === "y") {
      e.preventDefault();
      editorStore.redo();
    }

    // Ctrl+Shift+Z: 重做 (Mac通用)
    if (e.ctrlKey && e.shiftKey && e.key === "z") {
      e.preventDefault();
      editorStore.redo();
    }

    // Delete: 删除选中对象
    if (e.key === "Delete" && editorStore.selectedObject) {
      e.preventDefault();
      editorStore.canvas?.remove(editorStore.selectedObject);
      editorStore.saveHistory();
    }

    // Ctrl+S: 打开导出对话框
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      openExportModal();
    }
  });
};

/**
 * 上传图片
 */
const uploadImage = () => {
  fileInput.value?.click();
};

/**
 * 处理文件选择
 */
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        // 使用store的addImage方法
        editorStore.addImage(event.target.result as string);
        // 确保图层管理面板显示
        showLayerManager.value = true;
        // 强制页面重新渲染以刷新图层列表
        if (editorStore.canvas) {
          // 短延迟后再次触发渲染
          setTimeout(() => {
            // 修改canvas对象，触发监听器
            const objects = editorStore.canvas?.getObjects();
            if (objects && objects.length > 0) {
              const lastObj = objects[objects.length - 1];
              if (lastObj) {
                // 使对象略微移动一下，触发变化
                const currentLeft = lastObj.left || 0;
                lastObj.set({ left: currentLeft + 0.1 });
                lastObj.set({ left: currentLeft });
                editorStore.canvas?.renderAll();
              }
            }
          }, 200);
        }
      }
    };

    reader.readAsDataURL(file);
    target.value = ""; // 重置输入框，允许再次选择同一文件
  }
};

/**
 * 修改滤镜逻辑，分离对象滤镜和画布滤镜
 */
const applyFilters = () => {
  if (filterTarget.value === "object") {
    applyFiltersToSelection();
  } else {
    applyFiltersToCanvas();
  }
};

// 应用滤镜到选中对象
const applyFiltersToSelection = () => {
  if (!editorStore.selectedObject || !editorStore.canvas) return;

  // 获取选中对象
  const obj = editorStore.selectedObject;

  if (obj.type === "image" && "filters" in obj) {
    // 应用亮度、对比度和饱和度滤镜
    const imgObj = obj as fabric.Image;
    const filterArray: any[] = [];

    // 添加亮度滤镜
    if (filters.value.brightness !== 0) {
      filterArray.push(
        new fabric.Image.filters.Brightness({
          brightness: filters.value.brightness,
        })
      );
    }

    // 添加对比度滤镜
    if (filters.value.contrast !== 0) {
      filterArray.push(
        new fabric.Image.filters.Contrast({
          contrast: filters.value.contrast,
        })
      );
    }

    // 添加饱和度滤镜
    if (filters.value.saturation !== 0) {
      filterArray.push(
        new fabric.Image.filters.Saturation({
          saturation: filters.value.saturation,
        })
      );
    }

    // 设置滤镜并应用
    imgObj.filters = filterArray;
    imgObj.applyFilters();
    editorStore.canvas.requestRenderAll();
  }
};

// 应用滤镜到整个画布
const applyFiltersToCanvas = () => {
  if (!editorStore.canvas) return;

  // 遍历画布上的所有对象
  editorStore.canvas.getObjects().forEach((obj) => {
    if (obj.type === "image" && "filters" in obj) {
      const imgObj = obj as fabric.Image;
      const filterArray: any[] = [];

      // 添加亮度滤镜
      if (canvasFilters.value.brightness !== 0) {
        filterArray.push(
          new fabric.Image.filters.Brightness({
            brightness: canvasFilters.value.brightness,
          })
        );
      }

      // 添加对比度滤镜
      if (canvasFilters.value.contrast !== 0) {
        filterArray.push(
          new fabric.Image.filters.Contrast({
            contrast: canvasFilters.value.contrast,
          })
        );
      }

      // 添加饱和度滤镜
      if (canvasFilters.value.saturation !== 0) {
        filterArray.push(
          new fabric.Image.filters.Saturation({
            saturation: canvasFilters.value.saturation,
          })
        );
      }

      // 设置滤镜并应用
      imgObj.filters = filterArray;
      imgObj.applyFilters();
    }
  });

  editorStore.canvas.requestRenderAll();
};

/**
 * 添加转换选择对象的功能，实现图层独立变换
 */
const transformSelectedObject = (transformType: string, value: any) => {
  if (!editorStore.selectedObject) return;

  const obj = editorStore.selectedObject;

  switch (transformType) {
    case "scale":
      // 缩放选中的对象
      const currentScaleX = obj.scaleX || 1;
      const currentScaleY = obj.scaleY || 1;
      const newScale = Math.max(
        0.1,
        Math.min(5, currentScaleX * (1 + value * 0.1))
      );

      // 保持宽高比例
      const keepAspectRatio = true;

      if (keepAspectRatio) {
        // 保持长宽比例同时缩放
        obj.set({
          scaleX: newScale,
          scaleY: newScale,
        });
      } else {
        // 分别设置X和Y的缩放
        obj.set({
          scaleX: newScale,
          scaleY: Math.max(0.1, Math.min(5, currentScaleY * (1 + value * 0.1))),
        });
      }
      break;

    case "rotate":
      // 旋转选中的对象
      obj.rotate((obj.angle || 0) + value);
      break;

    case "opacity":
      // 调整选中对象的不透明度，确保在0-1之间
      let newOpacity = (obj.opacity || 1) + value;
      newOpacity = Math.max(0, Math.min(1, newOpacity));
      obj.set("opacity", newOpacity);
      break;
  }

  obj.setCoords(); // 确保坐标更新
  editorStore.canvas?.renderAll();
  editorStore.saveHistory();
};

/**
 * 缩放选中的对象
 * @param delta 缩放增量
 */
const scaleSelectedObject = (delta: number, activeObject: fabric.Object) => {
  // 这里直接使用editorStore.selectedObject，保证使用的是当前选中的对象
  const obj = activeObject;
  if (!obj) return;

  // 定义缩放因子和缩放步长（更平滑的缩放效果）
  const scaleFactor = delta > 0 ? 1.05 : 0.95;

  // 获取当前缩放值
  const currentScaleX = obj.scaleX || 1;
  const currentScaleY = obj.scaleY || 1;

  // 计算新的缩放值，限制范围
  const newScaleX = Math.max(0.1, Math.min(10, currentScaleX * scaleFactor));
  const newScaleY = Math.max(0.1, Math.min(10, currentScaleY * scaleFactor));

  // 保存对象的中心点
  const center = obj.getCenterPoint();

  // 应用新的缩放
  obj.set({
    scaleX: newScaleX,
    scaleY: newScaleY,
  });

  // 确保对象保持在原来的中心位置
  obj.setPositionByOrigin(center, "center", "center");

  // 更新对象坐标
  obj.setCoords();

  // 重新渲染并保存历史
  editorStore.canvas?.renderAll();
  editorStore.saveHistory();
};

/**
 * 修改旋转图片函数，只旋转当前选中的对象
 */
const rotateImage = (angle: number) => {
  transformSelectedObject("rotate", angle);
};

/**
 * 处理工具栏按钮缩放图层
 */
const handleObjectZoom = (delta: number) => {
  if (editorStore.selectedObject) {
    scaleSelectedObject(delta, editorStore.selectedObject);
  } else {
    // 如果没有选中对象，则缩放整个画布
    handleButtonZoom(delta);
  }
};

/**
 * 计算预估文件大小
 */
const calculateEstimatedFileSize = async () => {
  if (!editorStore.canvas) return;

  const format = exportFormat.value;
  const quality = exportQuality.value;
  const dimensions = exportDimensions.value;
  const multiplier = exportSettings.value.dpi / 96; // 根据DPI设置缩放，基准为96

  try {
    // 显示计算中状态
    estimatedFileSize.value = "计算中...";

    // 使用新的工具函数计算准确的文件大小
    const result = await calculateImageFileSize(
      editorStore.canvas,
      format,
      quality,
      multiplier,
      dimensions.width,
      dimensions.height
    );

    // 更新估算的文件大小
    estimatedFileSize.value = result.sizeFormatted;
  } catch (error) {
    console.error("计算文件大小时出错:", error);
    estimatedFileSize.value = "计算错误";
  }
};

/**
 * 处理宽度变化并保持纵横比
 * @param value 新的宽度值
 */
const handleWidthChange = async (value: number) => {
  exportSettings.value.width = value;

  // 只有当保持宽高比选项开启时才调整高度
  if (exportSettings.value.maintainAspectRatio) {
    const canvasWidth = editorStore.canvas?.width ?? 1;
    const canvasHeight = editorStore.canvas?.height ?? 1;
    const aspectRatio = canvasWidth / canvasHeight;
    exportSettings.value.height = Math.round(value / aspectRatio);
  }

  // 清除之前的计算和预览定时器
  if (previewDebounceTimer.value) {
    clearTimeout(previewDebounceTimer.value);
  }

  // 对大尺寸的处理添加延迟，避免卡顿
  if (value > 1000) {
    exportPreviewUrl.value = ""; // 清空预览，显示加载状态
    // 延迟计算和生成预览
    previewDebounceTimer.value = setTimeout(async () => {
      await calculateEstimatedFileSize();
      await updateExportPreview();
    }, 500);
  } else {
    await calculateEstimatedFileSize();
    await updateExportPreview(); // 更新预览图
  }
};

/**
 * 处理高度变化并保持纵横比
 * @param value 新的高度值
 */
const handleHeightChange = async (value: number) => {
  exportSettings.value.height = value;

  // 只有当保持宽高比选项开启时才调整宽度
  if (exportSettings.value.maintainAspectRatio) {
    const canvasWidth = editorStore.canvas?.width ?? 1;
    const canvasHeight = editorStore.canvas?.height ?? 1;
    const aspectRatio = canvasWidth / canvasHeight;
    exportSettings.value.width = Math.round(value * aspectRatio);
  }

  // 清除之前的计算和预览定时器
  if (previewDebounceTimer.value) {
    clearTimeout(previewDebounceTimer.value);
  }

  // 对大尺寸的处理添加延迟，避免卡顿
  if (value > 1000) {
    exportPreviewUrl.value = ""; // 清空预览，显示加载状态
    // 延迟计算和生成预览
    previewDebounceTimer.value = setTimeout(async () => {
      await calculateEstimatedFileSize();
      await updateExportPreview();
    }, 500);
  } else {
    await calculateEstimatedFileSize();
    await updateExportPreview(); // 更新预览图
  }
};

/**
 * 处理百分比变化
 * @param value 新的百分比值
 */
const handlePercentChange = async (value: number) => {
  exportSettings.value.percentSize = value;

  // 清除之前的计算和预览定时器
  if (previewDebounceTimer.value) {
    clearTimeout(previewDebounceTimer.value);
  }

  // 根据新尺寸计算，较大的百分比可能导致较大的尺寸，添加防抖
  const canvasWidth = editorStore.canvas?.width ?? 0;
  const canvasHeight = editorStore.canvas?.height ?? 0;
  const newWidth = Math.round(canvasWidth * (value / 100));
  const newHeight = Math.round(canvasHeight * (value / 100));

  // 如果尺寸较大，添加延迟处理
  if (newWidth > 1000 || newHeight > 1000) {
    exportPreviewUrl.value = ""; // 清空预览，显示加载状态
    // 延迟计算和生成预览
    previewDebounceTimer.value = setTimeout(async () => {
      await calculateEstimatedFileSize();
      await updateExportPreview();
    }, 500);
  } else {
    await calculateEstimatedFileSize();
    await updateExportPreview(); // 更新预览图
  }
};

/**
 * 更新导出预览图
 */
const updateExportPreview = async () => {
  if (!editorStore.canvas) return;

  try {
    // 使用当前导出设置生成预览图
    const format = exportFormat.value;
    const quality = exportQuality.value;
    const { width, height } = exportDimensions.value;

    // 对大尺寸图片进行缩小预览，提高性能
    let previewWidth = width;
    let previewHeight = height;
    const maxPreviewDimension = 800; // 最大预览尺寸

    // 如果尺寸过大，按比例缩小预览图
    if (width > maxPreviewDimension || height > maxPreviewDimension) {
      const aspectRatio = width / height;
      if (width > height) {
        previewWidth = maxPreviewDimension;
        previewHeight = Math.round(maxPreviewDimension / aspectRatio);
      } else {
        previewHeight = maxPreviewDimension;
        previewWidth = Math.round(maxPreviewDimension * aspectRatio);
      }
    }

    // 创建临时画布用于预览，避免修改主画布
    const tempCanvas = new fabric.Canvas(document.createElement("canvas"));
    tempCanvas.setDimensions({
      width: previewWidth,
      height: previewHeight,
    });

    // 复制主画布的背景色
    if (editorStore.canvas.backgroundColor) {
      tempCanvas.setBackgroundColor(
        editorStore.canvas.backgroundColor,
        tempCanvas.renderAll.bind(tempCanvas)
      );
    }

    // 复制所有对象到临时画布
    const clonedObjects = editorStore.canvas
      .getObjects()
      .filter((obj) => !obj.data?.isHelper)
      .map((obj) => fabric.util.object.clone(obj));

    // 计算缩放比例
    const scaleX = previewWidth / editorStore.canvas.getWidth();
    const scaleY = previewHeight / editorStore.canvas.getHeight();

    // 添加对象到临时画布，并应用缩放
    clonedObjects.forEach((obj) => {
      // 如果宽高比不锁定，需要调整所有对象的比例
      if (!exportSettings.value.maintainAspectRatio) {
        obj.set({
          scaleX: (obj.scaleX || 1) * scaleX,
          scaleY: (obj.scaleY || 1) * scaleY,
          left: (obj.left || 0) * scaleX,
          top: (obj.top || 0) * scaleY,
        });
      } else {
        // 如果锁定宽高比，只调整位置，保持原比例
        obj.set({
          left: (obj.left || 0) * scaleX,
          top: (obj.top || 0) * scaleY,
        });
      }
      obj.setCoords();
      tempCanvas.add(obj);
    });

    // 生成预览图
    const dataURL = tempCanvas.toDataURL({
      format,
      quality: Math.min(quality, 0.7),
      multiplier: 1,
    });

    // 销毁临时画布
    tempCanvas.dispose();

    // 更新预览图URL
    exportPreviewUrl.value = dataURL;
  } catch (error) {
    console.error("生成预览图出错:", error);
    exportPreviewUrl.value = ""; // 出错时清空预览图
  }
};

/**
 * 导出图片
 */
const exportImage = async () => {
  if (!editorStore.canvas) return;

  // 设置导出参数
  const exportOptions = {
    format: exportFormat.value,
    quality: exportQuality.value,
    multiplier: exportSettings.value.dpi / 96, // 根据 DPI 设置缩放
  };

  try {
    // 获取导出尺寸（无论是像素或百分比模式，都已经计算为实际像素值）
    const { width, height } = exportDimensions.value;

    // 创建临时画布用于导出，避免修改主画布
    const tempCanvas = new fabric.Canvas(document.createElement("canvas"));
    tempCanvas.setDimensions({
      width: width,
      height: height,
    });

    // 复制主画布的背景色
    if (editorStore.canvas.backgroundColor) {
      tempCanvas.setBackgroundColor(
        editorStore.canvas.backgroundColor,
        tempCanvas.renderAll.bind(tempCanvas)
      );
    }

    // 复制所有对象到临时画布
    const clonedObjects = editorStore.canvas
      .getObjects()
      .filter((obj) => !obj.data?.isHelper)
      .map((obj) => fabric.util.object.clone(obj));

    // 计算缩放比例
    const scaleX = width / editorStore.canvas.getWidth();
    const scaleY = height / editorStore.canvas.getHeight();

    // 添加对象到临时画布，并应用缩放
    clonedObjects.forEach((obj) => {
      // 如果宽高比不锁定，需要调整所有对象的比例
      if (!exportSettings.value.maintainAspectRatio) {
        obj.set({
          scaleX: (obj.scaleX || 1) * scaleX,
          scaleY: (obj.scaleY || 1) * scaleY,
          left: (obj.left || 0) * scaleX,
          top: (obj.top || 0) * scaleY,
        });
      } else {
        // 如果锁定宽高比，只调整位置，保持原比例
        obj.set({
          left: (obj.left || 0) * scaleX,
          top: (obj.top || 0) * scaleY,
        });
      }
      obj.setCoords();
      tempCanvas.add(obj);
    });

    // 重新计算一次准确的文件大小
    const result = await calculateImageFileSize(
      tempCanvas,
      exportFormat.value,
      exportQuality.value,
      exportSettings.value.dpi / 96,
      width,
      height
    );
    estimatedFileSize.value = result.sizeFormatted;

    // 导出图片
    const dataURL = tempCanvas.toDataURL(exportOptions);

    // 销毁临时画布
    tempCanvas.dispose();

    // 创建下载链接
    const link = document.createElement("a");
    link.download = `edited_image.${exportFormat.value}`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success(`图片已导出 (${estimatedFileSize.value})`);
    isExportModalOpen.value = false;
  } catch (error) {
    console.error("导出图片时出错:", error);
    message.error("导出图片失败，请重试");
  }
};

/**
 * 打开导出模态框
 */
const openExportModal = async () => {
  isExportModalOpen.value = true;
  await calculateEstimatedFileSize();
  await updateExportPreview(); // 生成初始预览图
};

// 添加处理滤镜滑块改变的新方法
type FilterKey = "brightness" | "contrast" | "saturation";

// 添加获取当前滤镜值的方法
const getCurrentFilterValue = (type: FilterKey) => {
  return filterTarget.value === "object"
    ? filters.value[type]
    : canvasFilters.value[type];
};

// 监听滤镜变化
watch(
  [filters, canvasFilters, filterTarget],
  () => {
    // 清除之前的定时器
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value);
    }

    // 设置新的定时器，延迟300ms应用滤镜
    debounceTimer.value = setTimeout(() => {
      applyFilters();
    }, 300);
  },
  { deep: true }
);

// 监听导出设置变化
watch(
  [exportFormat, exportQuality, exportSettings],
  async () => {
    // 清除之前的定时器
    if (previewDebounceTimer.value) {
      clearTimeout(previewDebounceTimer.value);
    }

    // 大尺寸图片添加延迟处理（无论是像素还是百分比模式）
    if (
      exportDimensions.value.width > 1000 ||
      exportDimensions.value.height > 1000
    ) {
      estimatedFileSize.value = "计算中...";
      exportPreviewUrl.value = ""; // 清空预览，显示加载状态

      previewDebounceTimer.value = setTimeout(async () => {
        await calculateEstimatedFileSize();
        await updateExportPreview();
      }, 500);
    } else {
      await calculateEstimatedFileSize();
      await updateExportPreview();
    }
  },
  { deep: true }
);

/**
 * 添加新形状
 * @param type A形状类型
 */
const addNewShape = (type: string) => {
  if (!editorStore.canvas) return;

  const canvas = editorStore.canvas;
  const canvasCenter = canvas.getCenter();
  let newObject: fabric.Object;
  const uniqueID = `shape_${type}_${Date.now()}_${Math.floor(
    Math.random() * 1000
  )}`;

  // 先创建对象基本属性
  let baseProps: any = {
    left: canvasCenter.left - 50,
    top: canvasCenter.top - 50,
    fill: "transparent", // 默认透明填充
    stroke: "#" + Math.floor(Math.random() * 16777215).toString(16), // 随机边框颜色
    strokeWidth: 2, // 默认边框宽度
  };

  switch (type) {
    case "rect":
      baseProps = {
        ...baseProps,
        width: 100,
        height: 100,
      };
      newObject = new fabric.Rect(baseProps);
      newObject.data = {
        name: "新矩形",
        id: uniqueID,
        isHelper: false,
      };
      break;

    case "circle":
      baseProps = {
        ...baseProps,
        radius: 50,
      };
      newObject = new fabric.Circle(baseProps);
      newObject.data = {
        name: "新圆形",
        id: uniqueID,
        isHelper: false,
      };
      break;

    case "text":
      baseProps = {
        ...baseProps,
        left: canvasCenter.left - 50,
        top: canvasCenter.top - 10,
        fontSize: 20,
        fill: "#333333", // 文本需要有填充色
        stroke: "", // 文本不需要边框
      };
      newObject = new fabric.IText("双击编辑文本", baseProps);
      newObject.data = {
        name: "新文本",
        id: uniqueID,
        isHelper: false,
      };
      break;

    default:
      return;
  }

  // 设置控制点样式
  const controlsConfig = {
    cornerColor: "#00a8ff",
    cornerSize: 8,
    cornerStyle: "circle",
    cornerStrokeColor: "#ffffff",
    transparentCorners: false,
    borderColor: "#00a8ff",
    borderScaleFactor: 1,
  };

  // 应用控制点样式
  Object.entries(controlsConfig).forEach(([key, value]) => {
    // @ts-ignore
    newObject[key] = value;
  });

  // 添加到画布
  canvas.add(newObject);
  canvas.setActiveObject(newObject);
  canvas.renderAll();

  editorStore.saveHistory();

  // 确保图层管理面板显示
  showLayerManager.value = true;

  // 显示成功提示
  message.success(
    `已添加${type === "rect" ? "矩形" : type === "circle" ? "圆形" : "文本"}`
  );

  // 延迟触发图层列表更新
  setTimeout(() => {
    // 触发对象修改事件，确保图层列表更新
    canvas.fire("object:modified", { target: newObject });
    canvas.renderAll();
  }, 50);
};

// 修复处理滑块变化的方法，添加明确的类型
const handleBrightnessChange = (value: number) => {
  if (filterTarget.value === "selection" && editorStore.selectedObject) {
    filters.value.brightness = value;
    applyFiltersToSelection();
  } else {
    canvasFilters.value.brightness = value;
    applyFiltersToCanvas();
  }
};

const handleContrastChange = (value: number) => {
  if (filterTarget.value === "selection" && editorStore.selectedObject) {
    filters.value.contrast = value;
    applyFiltersToSelection();
  } else {
    canvasFilters.value.contrast = value;
    applyFiltersToCanvas();
  }
};

const handleSaturationChange = (value: number) => {
  if (filterTarget.value === "selection" && editorStore.selectedObject) {
    filters.value.saturation = value;
    applyFiltersToSelection();
  } else {
    canvasFilters.value.saturation = value;
    applyFiltersToCanvas();
  }
};

// 为tipFormatter添加类型定义
const percentFormatter = (value: number): string =>
  `${Math.round(value * 100)}%`;
const simplePercentFormatter = (value: number): string => `${value}%`;

/**
 * 应用属性到选中的对象
 */
const applyObjectProperties = () => {
  if (!editorStore.selectedObject || !editorStore.canvas) return;

  const obj = editorStore.selectedObject;

  // 应用共有属性
  const commonProps: any = {
    fill: objectProperties.value.fill,
    stroke: objectProperties.value.stroke,
    strokeWidth: objectProperties.value.strokeWidth,
  };

  // 检查对象类型
  if (obj.type === "rect" || obj.type === "circle") {
    // 应用形状属性
    obj.set(commonProps);
  } else if (obj.type === "i-text" || obj.type === "text") {
    // 应用文本属性
    obj.set({
      ...commonProps,
      fontSize: objectProperties.value.fontSize,
      fontFamily: objectProperties.value.fontFamily,
      fontWeight: objectProperties.value.fontWeight,
      fontStyle: objectProperties.value.fontStyle,
      textAlign: objectProperties.value.textAlign,
      charSpacing: objectProperties.value.charSpacing,
    });
  }

  editorStore.canvas.renderAll();
  editorStore.saveHistory();
};

// 监听对象属性变化，自动应用到选中对象
watch(
  objectProperties,
  () => {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value);
    }

    debounceTimer.value = setTimeout(() => {
      applyObjectProperties();
    }, 300);
  },
  { deep: true }
);

// 监听选中对象变化，更新形状属性面板
watch(
  () => editorStore.selectedObject,
  (newObj) => {
    if (newObj) {
      // 根据对象类型更新属性
      if (newObj.type === "rect" || newObj.type === "circle") {
        // 更新形状属性
        objectProperties.value = {
          ...objectProperties.value,
          fill: (newObj.fill as string) || "transparent",
          stroke: (newObj.stroke as string) || "#000000",
          strokeWidth: newObj.strokeWidth || 2,
        };
      } else if (newObj.type === "i-text" || newObj.type === "text") {
        // 更新文本属性
        const textObj = newObj as fabric.Text;
        objectProperties.value = {
          ...objectProperties.value,
          fill: (textObj.fill as string) || "#000000",
          stroke: (textObj.stroke as string) || "",
          strokeWidth: textObj.strokeWidth || 0,
          fontSize: textObj.fontSize || 20,
          fontFamily: textObj.fontFamily || "Arial",
          fontWeight: (textObj.fontWeight as string) || "normal",
          fontStyle: (textObj.fontStyle as string) || "normal",
          textAlign: (textObj.textAlign as string) || "left",
          charSpacing: textObj.charSpacing || 0,
        };
      }
    }
  }
);
</script>

<template>
  <div class="editor-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <a-button-group>
        <a-tooltip title="撤销">
          <a-button @click="editorStore.undo">
            <template #icon><UndoOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="重做">
          <a-button @click="editorStore.redo">
            <template #icon><RedoOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-divider type="vertical" />

      <a-tooltip title="打开图片">
        <a-button @click="uploadImage">
          <template #icon><PictureOutlined /></template>
        </a-button>
      </a-tooltip>

      <a-divider type="vertical" />

      <a-button-group>
        <a-tooltip
          :title="editorStore.selectedObject ? '缩小选中图层' : '缩小画布'"
        >
          <a-button @click="handleObjectZoom(-1)">
            <template #icon><ZoomOutOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip :title="`缩放: ${Math.round(zoomLevel * 100)}%`">
          <a-button>{{ Math.round(zoomLevel * 100) }}%</a-button>
        </a-tooltip>
        <a-tooltip
          :title="editorStore.selectedObject ? '放大选中图层' : '放大画布'"
        >
          <a-button @click="handleObjectZoom(1)">
            <template #icon><ZoomInOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-divider type="vertical" />

      <a-button-group>
        <a-tooltip title="裁剪">
          <a-button @click="editorStore.setTool('crop')">
            <template #icon><ScissorOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="向左旋转">
          <a-button @click="rotateImage(-90)">
            <template #icon><RotateLeftOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="向右旋转">
          <a-button @click="rotateImage(90)">
            <template #icon><RotateRightOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-divider type="vertical" />

      <!-- 面板控制按钮 -->
      <a-button-group>
        <a-tooltip title="滤镜面板">
          <a-button
            :type="showFilterPanel ? 'primary' : 'default'"
            @click="showFilterPanel = !showFilterPanel"
          >
            <template #icon><FilterOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="变换面板">
          <a-button
            :type="showTransformPanel ? 'primary' : 'default'"
            @click="showTransformPanel = !showTransformPanel"
          >
            <template #icon><SettingOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="形状属性">
          <a-button
            :type="showObjectPanel ? 'primary' : 'default'"
            @click="showObjectPanel = !showObjectPanel"
          >
            <template #icon><BorderOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-divider type="vertical" />

      <!-- 图形和文本工具 -->
      <a-button-group>
        <a-tooltip title="添加矩形">
          <a-button @click="addNewShape('rect')">
            <template #icon><BorderOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="添加圆形">
          <a-button @click="addNewShape('circle')">
            <template #icon><HighlightOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="添加文本">
          <a-button @click="addNewShape('text')">
            <template #icon><FontSizeOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-divider type="vertical" />

      <a-tooltip title="图层管理">
        <a-button
          :type="showLayerManager ? 'primary' : 'default'"
          @click="showLayerManager = !showLayerManager"
        >
          <template #icon><OrderedListOutlined /></template>
        </a-button>
      </a-tooltip>

      <a-divider type="vertical" />

      <a-tooltip title="导出">
        <a-button type="primary" @click="openExportModal">
          <template #icon><SaveOutlined /></template>
        </a-button>
      </a-tooltip>
    </div>

    <!-- 主编辑区和侧边栏 -->
    <div
      class="main-content"
      :class="[
        showLayerManager ? 'layer-panel-visible' : 'layer-panel-hidden',
        showFilterPanel || showTransformPanel ? 'properties-panel-visible' : '',
      ]"
    >
      <!-- 主编辑区 -->
      <div class="canvas-container">
        <canvas ref="canvasRef" width="800" height="600"></canvas>
      </div>

      <!-- 图层管理面板 -->
      <div class="layer-panel" v-if="showLayerManager">
        <LayerManager />
      </div>

      <!-- 属性面板 - 修改为始终显示 -->
      <div
        class="properties-panel"
        v-if="showFilterPanel || showTransformPanel"
      >
        <a-collapse v-model:activeKey="activeCollapseKeys">
          <a-collapse-panel key="1" header="滤镜" v-if="showFilterPanel">
            <div class="filter-panel-header">
              <a-radio-group
                v-model:value="filterTarget"
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
                  @change="handleBrightnessChange"
                  :min="-100"
                  :max="100"
                  :disabled="
                    filterTarget === 'object' && !editorStore.selectedObject
                  "
                />
              </div>
              <div class="filter-item">
                <span>对比度</span>
                <a-slider
                  :value="getCurrentFilterValue('contrast')"
                  @change="handleContrastChange"
                  :min="-100"
                  :max="100"
                  :disabled="
                    filterTarget === 'object' && !editorStore.selectedObject
                  "
                />
              </div>
              <div class="filter-item">
                <span>饱和度</span>
                <a-slider
                  :value="getCurrentFilterValue('saturation')"
                  @change="handleSaturationChange"
                  :min="-100"
                  :max="100"
                  :disabled="
                    filterTarget === 'object' && !editorStore.selectedObject
                  "
                />
              </div>
            </div>
          </a-collapse-panel>

          <a-collapse-panel key="2" header="变换" v-if="showTransformPanel">
            <div class="transform-controls">
              <a-button-group style="margin-bottom: 10px">
                <a-button
                  @click="rotateImage(-1)"
                  :disabled="!editorStore.selectedObject"
                >
                  <template #icon><RotateLeftOutlined /></template>
                </a-button>
                <a-button
                  @click="rotateImage(1)"
                  :disabled="!editorStore.selectedObject"
                >
                  <template #icon><RotateRightOutlined /></template>
                </a-button>
              </a-button-group>

              <a-button-group>
                <a-button
                  @click="handleObjectZoom(-1)"
                  :disabled="!editorStore.selectedObject"
                >
                  <template #icon><ZoomOutOutlined /></template>
                </a-button>
                <a-button
                  @click="handleObjectZoom(1)"
                  :disabled="!editorStore.selectedObject"
                >
                  <template #icon><ZoomInOutlined /></template>
                </a-button>
              </a-button-group>
            </div>
          </a-collapse-panel>

          <a-collapse-panel
            key="3"
            header="对象属性"
            v-if="showObjectPanel && editorStore.selectedObject"
          >
            <!-- 形状控制区域 -->
            <div
              class="object-controls"
              v-if="
                editorStore.selectedObject.type === 'rect' ||
                editorStore.selectedObject.type === 'circle'
              "
            >
              <div class="object-property">
                <span>填充颜色</span>
                <div class="color-picker">
                  <a-radio-group
                    v-model:value="fillType"
                    button-style="solid"
                    size="small"
                  >
                    <a-radio-button value="transparent">透明</a-radio-button>
                    <a-radio-button value="custom">自定义</a-radio-button>
                  </a-radio-group>
                  <a-input
                    v-if="fillType === 'custom'"
                    v-model:value="objectProperties.fill"
                    type="color"
                    style="width: 100%; margin-top: 5px"
                  />
                </div>
              </div>

              <div class="object-property">
                <span>边框颜色</span>
                <a-input
                  v-model:value="objectProperties.stroke"
                  type="color"
                  style="width: 100%"
                />
              </div>

              <div class="object-property">
                <span>边框宽度</span>
                <a-slider
                  v-model:value="objectProperties.strokeWidth"
                  :min="0"
                  :max="20"
                  :step="1"
                />
              </div>
            </div>

            <!-- 文本控制区域 -->
            <div
              class="object-controls"
              v-else-if="
                editorStore.selectedObject.type === 'i-text' ||
                editorStore.selectedObject.type === 'text'
              "
            >
              <div class="object-property">
                <span>文本颜色</span>
                <a-input
                  v-model:value="objectProperties.fill"
                  type="color"
                  style="width: 100%"
                />
              </div>

              <div class="object-property">
                <span>字体</span>
                <a-select v-model:value="objectProperties.fontFamily">
                  <a-select-option value="Arial">Arial</a-select-option>
                  <a-select-option value="Times New Roman"
                    >Times New Roman</a-select-option
                  >
                  <a-select-option value="Microsoft YaHei"
                    >微软雅黑</a-select-option
                  >
                  <a-select-option value="SimSun">宋体</a-select-option>
                  <a-select-option value="SimHei">黑体</a-select-option>
                </a-select>
              </div>

              <div class="object-property">
                <span>字号</span>
                <a-slider
                  v-model:value="objectProperties.fontSize"
                  :min="8"
                  :max="80"
                  :step="1"
                />
              </div>

              <div class="object-property">
                <span>样式</span>
                <div class="text-style-buttons">
                  <a-button
                    :type="
                      objectProperties.fontWeight === 'bold'
                        ? 'primary'
                        : 'default'
                    "
                    @click="
                      objectProperties.fontWeight =
                        objectProperties.fontWeight === 'bold'
                          ? 'normal'
                          : 'bold'
                    "
                  >
                    <template #icon
                      ><span style="font-weight: bold">B</span></template
                    >
                  </a-button>

                  <a-button
                    :type="
                      objectProperties.fontStyle === 'italic'
                        ? 'primary'
                        : 'default'
                    "
                    @click="
                      objectProperties.fontStyle =
                        objectProperties.fontStyle === 'italic'
                          ? 'normal'
                          : 'italic'
                    "
                  >
                    <template #icon
                      ><span style="font-style: italic">I</span></template
                    >
                  </a-button>
                </div>
              </div>

              <div class="object-property">
                <span>对齐方式</span>
                <div class="text-align-buttons">
                  <a-button-group>
                    <a-button
                      :type="
                        objectProperties.textAlign === 'left'
                          ? 'primary'
                          : 'default'
                      "
                      @click="objectProperties.textAlign = 'left'"
                    >
                      <template #icon>L</template>
                    </a-button>

                    <a-button
                      :type="
                        objectProperties.textAlign === 'center'
                          ? 'primary'
                          : 'default'
                      "
                      @click="objectProperties.textAlign = 'center'"
                    >
                      <template #icon>C</template>
                    </a-button>

                    <a-button
                      :type="
                        objectProperties.textAlign === 'right'
                          ? 'primary'
                          : 'default'
                      "
                      @click="objectProperties.textAlign = 'right'"
                    >
                      <template #icon>R</template>
                    </a-button>
                  </a-button-group>
                </div>
              </div>

              <div class="object-property">
                <span>字间距</span>
                <a-slider
                  v-model:value="objectProperties.charSpacing"
                  :min="-100"
                  :max="300"
                  :step="10"
                />
              </div>
            </div>

            <!-- 没有支持的对象时显示提示 -->
            <div v-else class="empty-panel">
              请选择矩形、圆形或文本来编辑其属性
            </div>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>

    <!-- 隐藏文件输入 -->
    <input
      type="file"
      ref="fileInput"
      style="display: none"
      accept="image/*"
      @change="handleFileChange"
    />

    <!-- 导出模态框 -->
    <a-modal
      v-model:open="isExportModalOpen"
      title="导出图片"
      @ok="exportImage"
      width="800px"
    >
      <a-row :gutter="24">
        <!-- 左侧设置面板 -->
        <a-col :span="14">
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="格式">
                  <a-select v-model:value="exportFormat">
                    <a-select-option value="png">PNG</a-select-option>
                    <a-select-option value="jpeg">JPEG</a-select-option>
                    <a-select-option value="webp">WebP</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>

              <a-col :span="12">
                <a-form-item label="质量" v-if="exportFormat !== 'png'">
                  <a-slider
                    v-model:value="exportQuality"
                    :min="0.1"
                    :max="1"
                    :step="0.1"
                    :tooltipVisible="true"
                    :tipFormatter="percentFormatter"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider />

            <a-form-item label="尺寸类型">
              <a-radio-group
                v-model:value="exportSettings.sizeType"
                button-style="solid"
              >
                <a-radio-button value="pixel">像素</a-radio-button>
                <a-radio-button value="percent">百分比</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item v-if="exportSettings.sizeType === 'pixel'">
              <a-row :gutter="16">
                <a-col :span="11">
                  <a-form-item label="宽度 (像素)">
                    <a-input-number
                      v-model:value="exportSettings.width"
                      :min="1"
                      :max="10000"
                      style="width: 100%"
                      @change="handleWidthChange"
                    />
                  </a-form-item>
                </a-col>
                <a-col
                  :span="2"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 30px;
                  "
                >
                  <a-tooltip
                    :title="
                      exportSettings.maintainAspectRatio
                        ? '锁定宽高比（点击解锁）'
                        : '解锁宽高比（点击锁定）'
                    "
                  >
                    <a-button
                      shape="circle"
                      :type="
                        exportSettings.maintainAspectRatio
                          ? 'primary'
                          : 'default'
                      "
                      @click="
                        exportSettings.maintainAspectRatio =
                          !exportSettings.maintainAspectRatio
                      "
                    >
                      <template #icon>
                        <LockOutlined
                          v-if="exportSettings.maintainAspectRatio"
                        />
                        <UnlockOutlined v-else />
                      </template>
                    </a-button>
                  </a-tooltip>
                </a-col>
                <a-col :span="11">
                  <a-form-item label="高度 (像素)">
                    <a-input-number
                      v-model:value="exportSettings.height"
                      :min="1"
                      :max="10000"
                      style="width: 100%"
                      @change="handleHeightChange"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form-item>

            <a-form-item
              v-if="exportSettings.sizeType === 'percent'"
              label="尺寸百分比"
            >
              <a-slider
                v-model:value="exportSettings.percentSize"
                :min="1"
                :max="200"
                :step="1"
                :tooltipVisible="true"
                :tipFormatter="simplePercentFormatter"
                @change="handlePercentChange"
              />
            </a-form-item>

            <a-form-item label="DPI (分辨率)">
              <a-select v-model:value="exportSettings.dpi" style="width: 200px">
                <a-select-option :value="96">96 DPI (屏幕显示)</a-select-option>
                <a-select-option :value="150">
                  150 DPI (普通打印)
                </a-select-option>
                <a-select-option :value="300">
                  300 DPI (高质量打印)
                </a-select-option>
                <a-select-option :value="600">
                  600 DPI (专业印刷)
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-divider />

            <div class="export-info">
              <div class="export-info-item">
                <strong>导出尺寸:</strong>
                {{ exportDimensions.width }} ×
                {{ exportDimensions.height }} 像素
              </div>
              <div class="export-info-item">
                <strong>估计文件大小:</strong> {{ estimatedFileSize }}
              </div>
            </div>
          </a-form>
        </a-col>

        <!-- 右侧预览区域 -->
        <a-col :span="10">
          <div class="export-preview">
            <h3>预览效果</h3>
            <div class="preview-container">
              <img
                v-if="exportPreviewUrl"
                :src="exportPreviewUrl"
                alt="导出预览"
                class="preview-image"
              />
              <div v-else class="preview-placeholder">
                <span>生成预览中...</span>
              </div>
            </div>
            <div class="preview-info">
              <span>此预览图展示的是实际导出效果的近似结果</span>
            </div>
          </div>
        </a-col>
      </a-row>
    </a-modal>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f2f5;
}

.toolbar {
  padding: 10px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  z-index: 10;
}

.main-content {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
  justify-content: center;
}

.canvas-container {
  flex-grow: 1;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  margin: 0 auto;
  transition: max-width 0.3s ease;
}

/* 处理图层面板显示状态的容器宽度 */
.layer-panel-visible .canvas-container {
  max-width: calc(100% - 270px); /* 考虑图层面板的宽度 */
  margin-right: 270px; /* 为图层面板预留空间 */
}

/* 处理属性面板显示状态的容器宽度 */
.properties-panel-visible .canvas-container {
  max-width: calc(100% - 320px); /* 考虑属性面板的宽度 */
  margin-right: 320px; /* 为属性面板预留空间 */
}

/* 同时显示两个面板时的处理 */
.layer-panel-visible.properties-panel-visible .canvas-container {
  max-width: calc(100% - 570px); /* 考虑两个面板的宽度 */
  margin-right: 570px; /* 为两个面板预留空间 */
}

.layer-panel-hidden .canvas-container {
  max-width: calc(100% - 20px);
}

canvas {
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.layer-panel {
  width: 250px;
  background: white;
  height: 100%;
  border-left: 1px solid #f0f0f0;
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 5;
  transition: transform 0.3s ease;
  overflow-y: auto; /* 添加滚动条，避免内容溢出 */
}

.properties-panel {
  width: 300px;
  background: white;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
  position: absolute; /* 改为绝对定位，避免与图层面板重叠 */
  right: 250px; /* 当图层面板显示时，位于其左侧 */
  top: 0;
  bottom: 0;
  padding: 10px;
  overflow-y: auto;
  z-index: 4; /* 层级低于图层面板 */
}

/* 当图层面板隐藏时，属性面板靠右显示 */
.layer-panel-hidden .properties-panel {
  right: 0;
}

.filter-item {
  margin-bottom: 10px;
}

.filter-item span {
  display: block;
  margin-bottom: 5px;
}

.transform-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.export-info {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}

.export-info-item {
  margin-bottom: 8px;
}

.export-info-item:last-child {
  margin-bottom: 0;
}

.filter-panel-header {
  margin-bottom: 12px;
  text-align: center;
}

.object-controls {
  padding: 10px;
}

.object-property {
  margin-bottom: 15px;
}

.object-property span {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.color-picker {
  margin-top: 5px;
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

.export-preview {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.export-preview h3 {
  margin-bottom: 10px;
  text-align: center;
}

.preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #f5f5f5;
  border-radius: 4px;
  min-height: 300px;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.preview-placeholder {
  color: #999;
  font-size: 14px;
}

.preview-info {
  margin-top: 10px;
  text-align: center;
  font-size: 12px;
  color: #999;
}
</style>
