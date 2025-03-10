import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import { utils, write } from "xlsx";
import { Document, Packer, Paragraph } from "docx";

/**
 * 格式转换工具类
 */
export class FormatConverter {
  /**
   * 图像格式转换
   * @param file 源文件
   * @param targetFormat 目标格式
   * @returns Promise<Blob> 转换后的Blob
   */
  public static async convertImage(
    file: File,
    targetFormat: string
  ): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("无法创建Canvas上下文"));
              return;
            }

            ctx.drawImage(img, 0, 0);

            let mimeType = "";
            switch (targetFormat.toLowerCase()) {
              case "png":
                mimeType = "image/png";
                break;
              case "jpg":
              case "jpeg":
                mimeType = "image/jpeg";
                break;
              case "webp":
                mimeType = "image/webp";
                break;
              case "bmp":
                mimeType = "image/bmp";
                break;
              default:
                reject(new Error(`不支持的目标格式: ${targetFormat}`));
                return;
            }

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("转换失败"));
                }
              },
              mimeType,
              0.95
            );
          };

          img.onerror = () => {
            reject(new Error("图像加载失败"));
          };

          img.src = e.target?.result as string;
        };

        reader.onerror = () => {
          reject(new Error("文件读取失败"));
        };

        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 图像转PDF
   * @param file 源图像文件
   * @returns Promise<Blob> 转换后的PDF Blob
   */
  public static async imageToPdf(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("无法创建Canvas上下文"));
              return;
            }

            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL("image/jpeg", 0.95);

            // 创建PDF
            const pdf = new jsPDF({
              orientation: img.width > img.height ? "landscape" : "portrait",
              unit: "mm",
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // 计算适合页面的图像尺寸
            let imgWidth = img.width;
            let imgHeight = img.height;

            if (imgWidth > pdfWidth) {
              const ratio = pdfWidth / imgWidth;
              imgWidth = pdfWidth;
              imgHeight = imgHeight * ratio;
            }

            if (imgHeight > pdfHeight) {
              const ratio = pdfHeight / imgHeight;
              imgHeight = pdfHeight;
              imgWidth = imgWidth * ratio;
            }

            // 添加图像到PDF
            pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

            // 导出PDF
            const pdfBlob = pdf.output("blob");
            resolve(pdfBlob);
          };

          img.onerror = () => {
            reject(new Error("图像加载失败"));
          };

          img.src = e.target?.result as string;
        };

        reader.onerror = () => {
          reject(new Error("文件读取失败"));
        };

        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Excel转CSV
   * @param file Excel文件
   * @returns Promise<Blob> 转换后的CSV Blob
   */
  public static async excelToCsv(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = utils.book_new();

          try {
            const wb = utils.read(data, { type: "array" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // 转换为CSV格式
            const csv = utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            resolve(blob);
          } catch (error) {
            reject(new Error("Excel解析失败"));
          }
        };

        reader.onerror = () => {
          reject(new Error("文件读取失败"));
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Excel转JSON
   * @param file Excel文件
   * @returns Promise<Blob> 转换后的JSON Blob
   */
  public static async excelToJson(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);

          try {
            const wb = utils.read(data, { type: "array" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // 转换为JSON格式
            const jsonData = utils.sheet_to_json(ws);
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
              type: "application/json;charset=utf-8",
            });
            resolve(blob);
          } catch (error) {
            reject(new Error("Excel解析失败"));
          }
        };

        reader.onerror = () => {
          reject(new Error("文件读取失败"));
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 文本转Word
   * @param file 文本文件
   * @returns Promise<Blob> 转换后的Word文档 Blob
   */
  public static async textToWord(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;

          // 创建Word文档
          const doc = new Document({
            sections: [
              {
                properties: {},
                children: [
                  new Paragraph({
                    children: [{ text }],
                  }),
                ],
              },
            ],
          });

          // 导出Word文档
          Packer.toBlob(doc)
            .then((blob) => {
              resolve(blob);
            })
            .catch((error) => {
              reject(new Error("Word文档生成失败"));
            });
        };

        reader.onerror = () => {
          reject(new Error("文件读取失败"));
        };

        reader.readAsText(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 下载文件
   * @param blob 文件Blob
   * @param filename 文件名
   */
  public static downloadFile(blob: Blob, filename: string): void {
    saveAs(blob, filename);
  }
}
