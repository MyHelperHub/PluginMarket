import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { FormatConverter } from "../utils/converter";

/**
 * 文件类型
 */
export enum FileType {
  IMAGE = "image",
  PDF = "pdf",
  EXCEL = "excel",
  TEXT = "text",
  HTML = "html",
  MARKDOWN = "markdown",
  XML = "xml",
  JSON = "json",
  CSV = "csv",
  AUDIO = "audio",
  VIDEO = "video",
}

/**
 * 转换类型
 */
export interface ConversionType {
  sourceType: FileType;
  targetType: FileType | string;
  label: string;
  accept: string;
}

/**
 * 转换结果
 */
interface ConversionResult {
  success: boolean;
  message: string;
  type?: "error" | "success" | "info";
}

export const useConverterStore = defineStore("converter", () => {
  // 状态
  const isConverting = ref(false);
  const progress = ref(0);
  const uploadedFile = ref<File | null>(null);
  const selectedFormat = ref<string | null>(null);
  const targetFormats = ref<string[]>([]);
  const currentConversion = ref<ConversionType | null>(null);

  // 支持的转换类型定义
  const conversionTypes = reactive([
    // 图像格式转换
    {
      sourceType: FileType.IMAGE,
      targetType: "png",
      label: "图像 → PNG",
      accept: ".jpg,.jpeg,.webp,.bmp",
    },
    {
      sourceType: FileType.IMAGE,
      targetType: "jpg",
      label: "图像 → JPG",
      accept: ".png,.webp,.bmp",
    },
    {
      sourceType: FileType.IMAGE,
      targetType: "webp",
      label: "图像 → WEBP",
      accept: ".jpg,.jpeg,.png,.bmp",
    },
    {
      sourceType: FileType.IMAGE,
      targetType: "bmp",
      label: "图像 → BMP",
      accept: ".jpg,.jpeg,.png,.webp",
    },
    {
      sourceType: FileType.IMAGE,
      targetType: "svg",
      label: "图像 → SVG(矢量化)",
      accept: ".jpg,.jpeg,.png,.webp,.bmp",
    },
    {
      sourceType: FileType.IMAGE,
      targetType: FileType.PDF,
      label: "图像 → PDF",
      accept: ".jpg,.jpeg,.png,.webp,.bmp",
    },

    // PDF转换
    {
      sourceType: FileType.PDF,
      targetType: "png",
      label: "PDF → PNG",
      accept: ".pdf",
    },
    {
      sourceType: FileType.PDF,
      targetType: "jpg",
      label: "PDF → JPG",
      accept: ".pdf",
    },
    {
      sourceType: FileType.PDF,
      targetType: "docx",
      label: "PDF → Word",
      accept: ".pdf",
    },
    {
      sourceType: FileType.PDF,
      targetType: "txt",
      label: "PDF → TXT",
      accept: ".pdf",
    },

    // 电子表格转换
    {
      sourceType: FileType.EXCEL,
      targetType: FileType.CSV,
      label: "Excel → CSV",
      accept: ".xlsx,.xls",
    },
    {
      sourceType: FileType.EXCEL,
      targetType: FileType.JSON,
      label: "Excel → JSON",
      accept: ".xlsx,.xls",
    },
    {
      sourceType: FileType.EXCEL,
      targetType: FileType.PDF,
      label: "Excel → PDF",
      accept: ".xlsx,.xls",
    },
    {
      sourceType: FileType.CSV,
      targetType: FileType.EXCEL,
      label: "CSV → Excel",
      accept: ".csv",
    },
    {
      sourceType: FileType.JSON,
      targetType: FileType.CSV,
      label: "JSON → CSV",
      accept: ".json",
    },
    {
      sourceType: FileType.JSON,
      targetType: FileType.EXCEL,
      label: "JSON → Excel",
      accept: ".json",
    },

    // 文档转换
    {
      sourceType: FileType.TEXT,
      targetType: "docx",
      label: "文本 → Word",
      accept: ".txt",
    },
    {
      sourceType: FileType.TEXT,
      targetType: FileType.PDF,
      label: "Word → PDF",
      accept: ".docx,.doc",
    },
    {
      sourceType: FileType.TEXT,
      targetType: "txt",
      label: "Word → TXT",
      accept: ".docx,.doc",
    },
    {
      sourceType: FileType.TEXT,
      targetType: FileType.HTML,
      label: "Word → HTML",
      accept: ".docx,.doc",
    },
    {
      sourceType: FileType.HTML,
      targetType: FileType.PDF,
      label: "HTML → PDF",
      accept: ".html,.htm",
    },
    {
      sourceType: FileType.MARKDOWN,
      targetType: FileType.HTML,
      label: "Markdown → HTML",
      accept: ".md,.markdown",
    },

    // 数据格式转换
    {
      sourceType: FileType.JSON,
      targetType: FileType.XML,
      label: "JSON → XML",
      accept: ".json",
    },
    {
      sourceType: FileType.XML,
      targetType: FileType.JSON,
      label: "XML → JSON",
      accept: ".xml",
    },

    // 音频格式转换
    {
      sourceType: FileType.AUDIO,
      targetType: "mp3",
      label: "音频 → MP3",
      accept: ".wav,.ogg,.aac",
    },
    {
      sourceType: FileType.AUDIO,
      targetType: "wav",
      label: "音频 → WAV",
      accept: ".mp3,.ogg,.aac",
    },
    {
      sourceType: FileType.AUDIO,
      targetType: "ogg",
      label: "音频 → OGG",
      accept: ".mp3,.wav,.aac",
    },
    {
      sourceType: FileType.AUDIO,
      targetType: "aac",
      label: "音频 → AAC",
      accept: ".mp3,.wav,.ogg",
    },

    // 视频格式转换
    {
      sourceType: FileType.VIDEO,
      targetType: "mp4",
      label: "视频 → MP4",
      accept: ".webm,.avi,.mov,.mkv",
    },
    {
      sourceType: FileType.VIDEO,
      targetType: "webm",
      label: "视频 → WEBM",
      accept: ".mp4,.avi,.mov,.mkv",
    },
  ] as ConversionType[]);

  // 格式分组（用于UI显示）
  const formats = reactive({
    image: ["PNG", "JPG", "WEBP", "BMP", "SVG"],
    document: ["PDF", "DOCX", "TXT", "HTML", "MD"],
    spreadsheet: ["XLSX", "CSV", "JSON", "XML"],
    audio: ["MP3", "WAV", "OGG", "AAC"],
    video: ["MP4", "WEBM"],
  });

  // 获取文件类型
  const getFileType = (extension: string): FileType | null => {
    const extensionMap: Record<string, FileType> = {
      // 图像类型
      jpg: FileType.IMAGE,
      jpeg: FileType.IMAGE,
      png: FileType.IMAGE,
      webp: FileType.IMAGE,
      bmp: FileType.IMAGE,
      svg: FileType.IMAGE,

      // 文档类型
      pdf: FileType.PDF,
      txt: FileType.TEXT,
      docx: FileType.TEXT,
      doc: FileType.TEXT,
      html: FileType.HTML,
      htm: FileType.HTML,
      md: FileType.MARKDOWN,
      markdown: FileType.MARKDOWN,

      // 数据类型
      xlsx: FileType.EXCEL,
      xls: FileType.EXCEL,
      csv: FileType.CSV,
      json: FileType.JSON,
      xml: FileType.XML,

      // 音频类型
      mp3: FileType.AUDIO,
      wav: FileType.AUDIO,
      ogg: FileType.AUDIO,
      aac: FileType.AUDIO,

      // 视频类型
      mp4: FileType.VIDEO,
      webm: FileType.VIDEO,
      avi: FileType.VIDEO,
      mov: FileType.VIDEO,
      mkv: FileType.VIDEO,
    };

    return extensionMap[extension] || null;
  };

  /**
   * 更新可用的目标格式
   */
  function updateTargetFormats(fileExt: string): boolean {
    const sourceType = getFileType(fileExt);
    if (!sourceType) {
      targetFormats.value = [];
      return false;
    }

    // 过滤出当前文件类型可用的转换
    const availableConversions = conversionTypes.filter(
      (conversion) => conversion.sourceType === sourceType
    );

    // 如果没有可用的转换，返回false
    if (availableConversions.length === 0) {
      targetFormats.value = [];
      return false;
    }

    // 对于部分特殊的扩展名，可能需要额外的处理
    const normalizedExt = fileExt.toLowerCase();

    // 提取可用的目标格式
    let availableFormats: string[] = [];

    availableConversions.forEach((conversion) => {
      // 如果目标格式是枚举类型，需要特殊处理
      if (typeof conversion.targetType === "string") {
        // 如果当前文件扩展名不在接受列表中，跳过
        if (!conversion.accept.includes(`.${normalizedExt}`)) {
          return;
        }
        availableFormats.push(conversion.targetType.toUpperCase());
      } else {
        // 对于枚举类型的目标格式，需要根据类型添加相应的格式
        switch (conversion.targetType) {
          case FileType.PDF:
            availableFormats.push("PDF");
            break;
          case FileType.CSV:
            availableFormats.push("CSV");
            break;
          case FileType.JSON:
            availableFormats.push("JSON");
            break;
          case FileType.EXCEL:
            availableFormats.push("XLSX");
            break;
          case FileType.HTML:
            availableFormats.push("HTML");
            break;
          case FileType.XML:
            availableFormats.push("XML");
            break;
        }
      }
    });

    // 去重
    availableFormats = [...new Set(availableFormats)];
    targetFormats.value = availableFormats;

    return availableFormats.length > 0;
  }

  /**
   * 设置当前选中的转换类型
   */
  function setCurrentConversion(conversion: ConversionType) {
    currentConversion.value = conversion;
  }

  /**
   * 执行底层转换逻辑
   */
  async function executeConversion(): Promise<Blob> {
    if (!uploadedFile.value || !selectedFormat.value) {
      throw new Error("缺少必要参数");
    }

    const file = uploadedFile.value;
    const sourceExt = file.name.split(".").pop()?.toLowerCase() || "";
    const targetExt = selectedFormat.value.toLowerCase();

    try {
      // 使用通用转换入口方法
      return await FormatConverter.convertFile(file, sourceExt, targetExt);
    } catch (error) {
      console.error("文件转换失败:", error);
      throw new Error(`文件转换失败: ${(error as Error).message}`);
    }
  }

  /**
   * 执行转换
   */
  async function convertFile(): Promise<ConversionResult> {
    if (!uploadedFile.value || !selectedFormat.value) {
      return {
        success: false,
        message: "请选择文件和目标格式",
        type: "error",
      };
    }

    isConverting.value = true;
    progress.value = 10;

    try {
      // 获取源文件类型
      const fileExt =
        uploadedFile.value.name.split(".").pop()?.toLowerCase() || "";
      const sourceType = getFileType(fileExt);

      if (!sourceType) {
        return {
          success: false,
          message: "不支持的源文件格式",
          type: "error",
        };
      }

      // 获取目标格式
      let targetType: string | FileType = selectedFormat.value;

      // 转换目标格式为系统内部使用的类型
      switch (selectedFormat.value.toLowerCase()) {
        case "pdf":
          targetType = FileType.PDF;
          break;
        case "csv":
          targetType = FileType.CSV;
          break;
        case "json":
          targetType = FileType.JSON;
          break;
        case "excel":
          targetType = FileType.EXCEL;
          break;
        case "html":
          targetType = FileType.HTML;
          break;
        case "xml":
          targetType = FileType.XML;
          break;
        default:
          targetType = targetType.toLowerCase();
      }

      progress.value = 30;

      // 在converter模块中找到对应的转换类型
      const conversionType = conversionTypes.find(
        (c) => c.sourceType === sourceType && c.targetType === targetType
      );

      if (!conversionType) {
        return {
          success: false,
          message: `不支持从 ${fileExt.toUpperCase()} 转换到 ${
            selectedFormat.value
          }`,
          type: "error",
        };
      }

      // 设置当前转换和源文件
      currentConversion.value = conversionType;

      progress.value = 50;

      // 执行转换
      const result = await executeConversion();

      progress.value = 80;

      // 生成下载文件名
      const nameWithoutExt = uploadedFile.value.name.replace(/\.[^/.]+$/, "");
      let fileExt2 = "";

      switch (true) {
        case targetType === FileType.PDF:
          fileExt2 = ".pdf";
          break;
        case targetType === FileType.CSV:
          fileExt2 = ".csv";
          break;
        case targetType === FileType.JSON:
          fileExt2 = ".json";
          break;
        case targetType === FileType.XML:
          fileExt2 = ".xml";
          break;
        case targetType === FileType.HTML:
          fileExt2 = ".html";
          break;
        case targetType === FileType.EXCEL:
          fileExt2 = ".html"; // 简化示例使用HTML表格
          break;
        case targetType === "docx":
          fileExt2 = ".docx";
          break;
        case targetType === "svg":
          fileExt2 = ".svg";
          break;
        default:
          fileExt2 = `.${targetType}`;
      }

      const fileName = `${nameWithoutExt}${fileExt2}`;

      // 下载文件
      FormatConverter.downloadFile(result, fileName);

      progress.value = 100;

      // 短暂延迟后重置进度
      setTimeout(() => {
        progress.value = 0;
      }, 1000);

      return {
        success: true,
        message: `${fileExt.toUpperCase()} 到 ${selectedFormat.value} 转换成功`,
        type: "success",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "转换过程中出现异常";
      return {
        success: false,
        message: errorMessage,
        type: "error",
      };
    } finally {
      // 短暂延迟后重置状态
      setTimeout(() => {
        isConverting.value = false;
      }, 1000);
    }
  }

  /**
   * 重置状态
   */
  function resetState() {
    isConverting.value = false;
    progress.value = 0;
    uploadedFile.value = null;
    selectedFormat.value = null;
    targetFormats.value = [];
    currentConversion.value = null;
  }

  return {
    // 状态
    isConverting,
    progress,
    uploadedFile,
    selectedFormat,
    formats,
    targetFormats,
    conversionTypes,

    // 方法
    updateTargetFormats,
    convertFile,
    resetState,
    setCurrentConversion,
  };
});
