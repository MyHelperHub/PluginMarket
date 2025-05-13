// 图像处理工具，用于与工作线程通信

type FilterAction = {
  type: string
  payload: any
}

// 创建一个Promise包装的Worker处理函数
export const processImageWithWorker = (
  imageData: ImageData,
  actions: FilterAction[]
): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    try {
      // 创建新的Worker
      const worker = new Worker(
        new URL('./imageProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      )

      // 监听Worker的消息
      worker.onmessage = (e) => {
        const { imageData } = e.data
        // 完成处理后终止Worker
        worker.terminate()
        resolve(imageData)
      }

      // 错误处理
      worker.onerror = (error) => {
        worker.terminate()
        reject(error)
      }

      // 发送数据到Worker
      worker.postMessage({ imageData, actions }, [imageData.data.buffer])
    } catch (error) {
      reject(error)
    }
  })
}

// 用于从Canvas获取图像数据
export const getImageDataFromCanvas = (
  canvas: HTMLCanvasElement
): ImageData => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法获取Canvas的2D上下文')
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// 将ImageData应用到Canvas
export const applyImageDataToCanvas = (
  canvas: HTMLCanvasElement,
  imageData: ImageData
): void => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法获取Canvas的2D上下文')
  }
  ctx.putImageData(imageData, 0, 0)
}

// 处理图像并应用到Canvas
export const processAndApply = async (
  canvas: HTMLCanvasElement,
  actions: FilterAction[]
): Promise<void> => {
  const imageData = getImageDataFromCanvas(canvas)
  const processedData = await processImageWithWorker(imageData, actions)
  applyImageDataToCanvas(canvas, processedData)
} 