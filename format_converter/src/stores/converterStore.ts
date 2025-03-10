import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { FormatConverter } from "../utils/converter";

export const useConverterStore = defineStore("converter", () => {
  // 状态
  const isConverting = ref(false);
  const progress = ref(0);
  const uploadedFile = ref(null);
  const selectedFormat = ref(null);

  const formats = reactive({
    image: ["PNG", "JPG", "WEBP", "BMP", "TIFF"],
    document: ["PDF", "DOCX", "TXT", "HTML"],
    spreadsheet: ["XLSX", "CSV", "JSON"],
    other: ["ZIP", "RAR"],
  });

  const targetFormats = ref<string[]>([]);
  const availableConversions = {
    pdf: ["PNG", "JPG", "DOCX", "TXT"],
    png: ["JPG", "WEBP", "PDF", "BMP"],
    jpg: ["PNG", "WEBP", "PDF", "BMP"],
    docx: ["PDF", "TXT", "HTML"],
    xlsx: ["CSV", "JSON", "PDF"],
    csv: ["XLSX", "JSON"],
    json: ["CSV", "XLSX"],
  };

  // 方法
  function updateTargetFormats(fileExt: string) {
    if (fileExt in availableConversions) {
      targetFormats.value =
        availableConversions[fileExt as keyof typeof availableConversions];
      return true;
    } else {
      targetFormats.value = [];
      return false;
    }
  }

  async function convertFile() {
    if (!uploadedFile.value || !selectedFormat.value) {
      return { success: false, message: "请上传文件并选择目标格式" };
    }

    isConverting.value = true;
    progress.value = 10;

    try {
      const fileExt = uploadedFile.value.name.split(".").pop().toLowerCase();
      const fileName = uploadedFile.value.name.split(".")[0];
      let convertedFile = null;

      progress.value = 30;

      // 使用FormatConverter进行格式转换
      try {
        // 图片格式转换
        if (["jpg", "jpeg", "png", "webp", "bmp"].includes(fileExt)) {
          if (
            ["PNG", "JPG", "JPEG", "WEBP", "BMP"].includes(selectedFormat.value)
          ) {
            convertedFile = await FormatConverter.convertImage(
              uploadedFile.value,
              selectedFormat.value
            );
          } else if (selectedFormat.value === "PDF") {
            convertedFile = await FormatConverter.imageToPdf(
              uploadedFile.value
            );
          }
        }
        // Excel转换
        else if (fileExt === "xlsx") {
          if (selectedFormat.value === "CSV") {
            convertedFile = await FormatConverter.excelToCsv(
              uploadedFile.value
            );
          } else if (selectedFormat.value === "JSON") {
            convertedFile = await FormatConverter.excelToJson(
              uploadedFile.value
            );
          }
        }
        // 文本转Word
        else if (fileExt === "txt") {
          if (selectedFormat.value === "DOCX") {
            convertedFile = await FormatConverter.textToWord(
              uploadedFile.value
            );
          }
        }

        progress.value = 80;

        if (convertedFile) {
          FormatConverter.downloadFile(
            convertedFile,
            `${fileName}.${selectedFormat.value.toLowerCase()}`
          );
          progress.value = 100;

          setTimeout(() => {
            isConverting.value = false;
            progress.value = 0;
          }, 1000);

          return { success: true, message: "文件已成功转换并下载" };
        } else {
          progress.value = 100;

          setTimeout(() => {
            isConverting.value = false;
            progress.value = 0;
          }, 1000);

          return {
            success: false,
            message: "此转换在完整版中可用",
            type: "info",
          };
        }
      } catch (error) {
        progress.value = 100;
        setTimeout(() => {
          isConverting.value = false;
          progress.value = 0;
        }, 1000);

        return { success: false, message: error.message };
      }
    } catch (error) {
      isConverting.value = false;
      return { success: false, message: error.message };
    }
  }

  function resetState() {
    isConverting.value = false;
    progress.value = 0;
    uploadedFile.value = null;
    selectedFormat.value = null;
    targetFormats.value = [];
  }

  return {
    // 状态
    isConverting,
    progress,
    uploadedFile,
    selectedFormat,
    formats,
    targetFormats,
    availableConversions,

    // 方法
    updateTargetFormats,
    convertFile,
    resetState,
  };
});
