/**
 * 文件工具函数
 */

/**
 * 计算图片文件大小
 * @param canvas Fabric.js 画布
 * @param format 导出格式 ('jpeg', 'png', 'webp')
 * @param quality 质量 (0-1)
 * @param multiplier 分辨率倍数
 * @param width 导出宽度
 * @param height 导出高度
 * @returns Promise<{ size: number, sizeFormatted: string }> 文件大小（字节）及格式化后的大小字符串
 */
export const calculateImageFileSize = async (
  canvas: any,
  format: string = "png",
  quality: number = 1,
  multiplier: number = 1,
  width?: number,
  height?: number
): Promise<{ size: number; sizeFormatted: string }> => {
  if (!canvas) {
    return { size: 0, sizeFormatted: "0 B" };
  }

  try {
    // 临时保存画布原始尺寸
    const originalWidth = canvas.getWidth();
    const originalHeight = canvas.getHeight();

    // 如果提供了导出尺寸，临时调整画布大小
    if (width && height) {
      canvas.setDimensions({ width, height });
    }

    // 生成数据URL
    const dataURL = canvas.toDataURL({
      format,
      quality,
      multiplier,
    });

    // 恢复原始尺寸
    if (width && height) {
      canvas.setDimensions({ width: originalWidth, height: originalHeight });
    }

    // 将DataURL转换为Blob获取准确大小
    const blob = await dataURLToBlob(dataURL);
    const size = blob.size;

    // 格式化文件大小
    const sizeFormatted = formatFileSize(size);

    return { size, sizeFormatted };
  } catch (error) {
    console.error("计算文件大小出错:", error);
    return { size: 0, sizeFormatted: "计算错误" };
  }
};

/**
 * 将DataURL转换为Blob对象
 * @param dataURL 数据URL字符串
 * @returns Promise<Blob> Blob对象
 */
const dataURLToBlob = async (dataURL: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // 解析DataURL
      const arr = dataURL.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      resolve(new Blob([u8arr], { type: mime }));
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 格式化文件大小
 * @param bytes 字节大小
 * @param decimals 小数位数
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
