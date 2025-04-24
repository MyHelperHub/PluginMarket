// 图像处理工作线程

type FilterAction = {
  type: string;
  payload: any;
};

// 图片滤镜处理
function applyFilter(imageData: ImageData, action: FilterAction): ImageData {
  const { type, payload } = action;
  const data = imageData.data;

  switch (type) {
    case "brightness": {
      const value = (payload.value / 100) * 255;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + value));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
      }
      break;
    }

    case "contrast": {
      const value = payload.value / 100 + 1;
      const intercept = 128 * (1 - value);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * value + intercept));
        data[i + 1] = Math.min(
          255,
          Math.max(0, data[i + 1] * value + intercept)
        );
        data[i + 2] = Math.min(
          255,
          Math.max(0, data[i + 2] * value + intercept)
        );
      }
      break;
    }

    case "saturation": {
      const value = payload.value / 100 + 1;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 计算灰度值
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;

        // 应用饱和度调整
        data[i] = Math.min(255, Math.max(0, gray + (r - gray) * value));
        data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * value));
        data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * value));
      }
      break;
    }

    case "blur": {
      const radius = payload.radius || 1;
      const width = imageData.width;
      const height = imageData.height;

      // 创建临时图像数据，避免修改原始数据时相互影响
      const tempData = new Uint8ClampedArray(data.length);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0,
            count = 0;

          // 对每个像素应用模糊算法
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              const px = x + kx;
              const py = y + ky;

              if (px >= 0 && px < width && py >= 0 && py < height) {
                const i = (py * width + px) * 4;
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                a += data[i + 3];
                count++;
              }
            }
          }

          // 计算平均值
          const i = (y * width + x) * 4;
          tempData[i] = r / count;
          tempData[i + 1] = g / count;
          tempData[i + 2] = b / count;
          tempData[i + 3] = a / count;
        }
      }

      // 更新图像数据
      for (let i = 0; i < data.length; i++) {
        data[i] = tempData[i];
      }
      break;
    }
  }

  return imageData;
}

// 处理图像管道，应用多个滤镜
function processImage(
  imageData: ImageData,
  actions: FilterAction[]
): ImageData {
  let result = imageData;

  for (const action of actions) {
    result = applyFilter(result, action);
  }

  return result;
}

// 监听主线程消息
self.addEventListener("message", (e) => {
  const { imageData, actions } = e.data;

  if (imageData && actions) {
    const result = processImage(imageData, actions);
    // 将处理后的图像数据返回给主线程
    self.postMessage({ imageData: result }, [result.data.buffer]);
  }
});

export {};
