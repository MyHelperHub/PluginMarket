import { defineStore } from "pinia";
import { fabric } from "fabric";
import { ref, markRaw } from "vue";
import { message } from "ant-design-vue";

// 定义控制点样式类型
type ControlStyle = "circle" | "rect";
type ControlsConfig = {
  transparentCorners: boolean;
  cornerColor: string;
  cornerStrokeColor: string;
  cornerSize: number;
  cornerStyle: ControlStyle;
  padding: number;
  borderColor: string;
  borderScaleFactor: number;
};

/**
 * 编辑器状态管理
 */
export const useEditorStore = defineStore("editor", () => {
  // 画布实例 - 使用markRaw避免Vue3 Proxy
  const canvas = ref<fabric.Canvas | null>(null);

  // 历史记录相关状态
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySteps = 100;

  // 当前选择的工具
  const currentTool = ref<string>("select");

  // 当前选中的对象
  const selectedObject = ref<fabric.Object | null>(null);

  // 全局控制点样式配置
  const controlsConfig: ControlsConfig = {
    transparentCorners: false,
    cornerColor: "#00a8ff",
    cornerStrokeColor: "#ffffff",
    cornerSize: 8,
    cornerStyle: "circle",
    padding: 10,
    borderColor: "#00a8ff",
    borderScaleFactor: 1,
  };

  // 添加一个标志，指示当前是否正在执行撤销/重做操作
  const isUndoRedoInProgress = ref(false);

  /**
   * 初始化画布
   * @param canvasEl 画布DOM元素
   */
  function initCanvas(canvasEl: HTMLCanvasElement) {
    try {
      // 确保fabric.js已经加载
      if (!fabric.Canvas) {
        throw new Error("fabric.Canvas 不可用，请检查库是否正确加载");
      }

      // 创建新画布实例
      const fabricCanvas = new fabric.Canvas(canvasEl, {
        preserveObjectStacking: true, // 保持对象叠加顺序
      });

      // 设置全局控制点样式
      Object.assign(fabric.Object.prototype, controlsConfig);

      // 绑定事件
      fabricCanvas.on("selection:created", handleSelection);
      fabricCanvas.on("selection:updated", handleSelection);
      fabricCanvas.on("selection:cleared", () => {
        selectedObject.value = null;
      });

      // 保存状态
      canvas.value = markRaw(fabricCanvas);

      // 清空历史记录，确保从新的起点开始
      history.value = [];
      historyIndex.value = -1;

      // 保存初始空白画布状态
      saveHistory();
    } catch (error) {
      console.error("初始化画布出错:", error);
      message.error("初始化画布失败，请检查fabric.js库是否正确加载");
    }
  }

  /**
   * 处理选择事件
   */
  const handleSelection = (e: any) => {
    if (e.selected && e.selected.length > 0) {
      // 将选中的对象保存到状态中（如果有多个被选中，只保存第一个）
      selectedObject.value = e.selected[0];
    }
  };

  /**
   * 保存当前状态到历史记录
   */
  function saveHistory() {
    if (!canvas.value) return;

    // 如果正在进行撤销/重做操作，不保存历史状态
    if (isUndoRedoInProgress.value) {
      return;
    }

    // 临时存储当前选中状态
    const activeObject = canvas.value.getActiveObject();
    const activeGroup = canvas.value.getActiveObjects();

    // 清除当前选中状态，这样选中边框就不会被保存
    canvas.value.discardActiveObject();

    // 保存当前画布状态
    const json = canvas.value.toJSON([
      "data",
      "id",
      "name",
      "selectable",
      "lockMovementX",
      "lockMovementY",
      "hasControls",
    ]);

    // 将状态转换为字符串形式
    const currentStateStr = JSON.stringify(json);

    // 检查是否应该保存这个状态
    let shouldSaveState = true;

    // 如果历史记录不为空，检查当前状态是否与最新状态相同
    if (history.value.length > 0 && historyIndex.value >= 0) {
      const lastState = history.value[historyIndex.value];
      // 比较当前状态与最近的历史状态
      if (lastState === currentStateStr) {
        // 如果完全相同，不保存这个状态
        shouldSaveState = false;
      }
    }

    if (shouldSaveState) {
      // 删除历史记录中当前位置之后的所有记录
      if (historyIndex.value < history.value.length - 1) {
        history.value = history.value.slice(0, historyIndex.value + 1);
      }

      // 添加新的历史记录
      history.value.push(currentStateStr);
      historyIndex.value = history.value.length - 1;

      // 如果历史记录超过了最大限制，则删除最旧的记录
      if (history.value.length > maxHistorySteps) {
        history.value.shift();
        historyIndex.value--;
      }
    }

    // 恢复之前的选中状态
    if (activeGroup && activeGroup.length > 0) {
      // Fabric.js没有setActiveObjects方法，使用正确的setActiveObject
      if (activeGroup.length === 1) {
        canvas.value.setActiveObject(activeGroup[0]);
      } else {
        const selection = new fabric.ActiveSelection(activeGroup, {
          canvas: canvas.value,
        });
        canvas.value.setActiveObject(selection);
      }
    } else if (activeObject) {
      canvas.value.setActiveObject(activeObject);
    }

    canvas.value.renderAll();
  }

  /**
   * 撤销操作
   */
  function undo() {
    // 检查是否已经到达历史记录开头，如果是则直接返回
    if (historyIndex.value <= 0) {
      return; // 已经是最早状态，不执行任何操作
    }

    // 设置标志，指示正在进行撤销操作
    isUndoRedoInProgress.value = true;

    // 暂时禁用选择事件监听，避免触发额外的历史记录
    if (canvas.value) {
      canvas.value.off("selection:created", handleSelection);
      canvas.value.off("selection:updated", handleSelection);
    }

    try {
      // 清除当前选中状态，避免视觉上的不连贯
      if (canvas.value) {
        canvas.value.discardActiveObject();
        selectedObject.value = null;
        canvas.value.renderAll();
      }

      // 计算前一个历史状态的索引
      const prevIndex = historyIndex.value - 1;

      // 确认索引有效
      if (prevIndex >= 0 && prevIndex < history.value.length) {
        // 加载前一个历史状态
        const json = JSON.parse(history.value[prevIndex]);

        if (canvas.value) {
          canvas.value.loadFromJSON(json, () => {
            // 更新历史索引
            historyIndex.value = prevIndex;
            canvas.value?.renderAll();
          });
        }
      } else {
        console.error("无效的历史索引:", prevIndex);
      }
    } catch (error) {
      console.error("撤销操作出错:", error);
    } finally {
      // 恢复事件监听
      setTimeout(() => {
        if (canvas.value) {
          canvas.value.on("selection:created", handleSelection);
          canvas.value.on("selection:updated", handleSelection);
        }
        // 恢复标志
        isUndoRedoInProgress.value = false;
      }, 200);
    }
  }

  /**
   * 重做操作
   */
  function redo() {
    // 检查是否已经到达历史记录末尾，如果是则直接返回
    if (historyIndex.value >= history.value.length - 1) {
      return; // 已经是最新状态，不执行任何操作
    }

    // 设置标志，指示正在进行重做操作
    isUndoRedoInProgress.value = true;

    // 暂时禁用选择事件监听，避免触发额外的历史记录
    if (canvas.value) {
      canvas.value.off("selection:created", handleSelection);
      canvas.value.off("selection:updated", handleSelection);
    }

    try {
      // 清除当前选中状态，避免视觉上的不连贯
      if (canvas.value) {
        canvas.value.discardActiveObject();
        selectedObject.value = null;
        canvas.value.renderAll();
      }

      // 计算下一个历史状态的索引
      const nextIndex = historyIndex.value + 1;

      // 确认索引有效
      if (nextIndex >= 0 && nextIndex < history.value.length) {
        // 加载下一个历史状态
        const json = JSON.parse(history.value[nextIndex]);

        if (canvas.value) {
          canvas.value.loadFromJSON(json, () => {
            // 更新历史索引
            historyIndex.value = nextIndex;
            canvas.value?.renderAll();
          });
        }
      } else {
        console.error("无效的历史索引:", nextIndex);
      }
    } catch (error) {
      console.error("重做操作出错:", error);
    } finally {
      // 恢复事件监听
      setTimeout(() => {
        if (canvas.value) {
          canvas.value.on("selection:created", handleSelection);
          canvas.value.on("selection:updated", handleSelection);
        }
        // 恢复标志
        isUndoRedoInProgress.value = false;
      }, 200);
    }
  }

  /**
   * 选择指定ID的对象
   */
  const selectObjectByID = (objectID: string) => {
    if (!canvas.value) return;

    const objects = canvas.value.getObjects();
    const targetObject = objects.find((obj) => obj.data?.id === objectID);

    if (targetObject) {
      canvas.value.setActiveObject(targetObject);
      canvas.value.renderAll();
      selectedObject.value = targetObject;
    }
  };

  /**
   * 添加图片
   */
  const addImage = (imageUrl: string) => {
    if (!canvas.value) return;

    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        // 分配唯一ID和名称给图片对象
        const uniqueID = `object_${Date.now()}_${Math.floor(
          Math.random() * 100
        )}`;

        img.data = {
          id: uniqueID,
          name: `图片 ${canvas.value?.getObjects().length}`,
          isHelper: false,
        };

        // 设置图片大小和位置
        scaleAndPositionImage(img);

        // 设置自定义控制点样式
        Object.entries(controlsConfig).forEach(([key, value]) => {
          // @ts-ignore
          img[key] = value;
        });

        // 将图片添加到画布
        canvas.value?.add(markRaw(img));

        // 选中新添加的图片
        canvas.value?.setActiveObject(img);
        canvas.value?.renderAll();

        // 保存历史状态，使添加图片操作可撤销
        saveHistory();

        // 图片添加成功提示
        message.success("图片已添加到画布");

        return img.data?.id;
      },
      { crossOrigin: "anonymous" }
    );
  };

  /**
   * 缩放和定位图片以适应画布
   * @param img 图片对象
   */
  const scaleAndPositionImage = (img: fabric.Image) => {
    if (!canvas.value) return;

    // 获取画布尺寸
    const canvasWidth = canvas.value.getWidth();
    const canvasHeight = canvas.value.getHeight();

    // 获取图片原始尺寸
    const imgWidth = img.width || 0;
    const imgHeight = img.height || 0;

    // 计算缩放比例，确保图片不会超出画布
    let scale = 1;
    if (imgWidth > canvasWidth * 0.8 || imgHeight > canvasHeight * 0.8) {
      const scaleX = (canvasWidth * 0.8) / imgWidth;
      const scaleY = (canvasHeight * 0.8) / imgHeight;
      scale = Math.min(scaleX, scaleY);
    }

    // 应用缩放
    img.scale(scale);

    // 居中图片
    img.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: "center",
      originY: "center",
    });
  };

  /**
   * 裁剪图片
   */
  function cropImage() {
    // 裁剪功能将在组件中实现
    saveHistory();
  }

  /**
   * 切换工具
   * @param tool 工具名称
   */
  function setTool(tool: string) {
    currentTool.value = tool;
  }

  /**
   * 导出图片
   * @param format 格式
   * @param quality 质量
   * @returns DataURL
   */
  function exportImage(format: string = "png", quality: number = 1) {
    if (!canvas.value) return "";

    return canvas.value.toDataURL({
      format,
      quality,
      multiplier: 1,
    });
  }

  return {
    canvas,
    currentTool,
    selectedObject,
    history,
    historyIndex,
    initCanvas,
    saveHistory,
    undo,
    redo,
    addImage,
    cropImage,
    setTool,
    exportImage,
    selectObjectByID,
  };
});
