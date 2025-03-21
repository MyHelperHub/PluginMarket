import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { renderAsync } from "docx-preview";
import { jsPDF } from "jspdf";
// @ts-ignore
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import ExcelJS from "exceljs";

/**
 * Office文档转PDF工具类
 * 纯浏览器端实现，无需服务器
 */
export class OfficeToPdfConverter {
  /**
   * 保存当前滚动位置
   */
  private static saveScrollPosition(): { x: number; y: number } {
    return {
      x: window.scrollX,
      y: window.scrollY,
    };
  }

  /**
   * 恢复滚动位置
   */
  private static restoreScrollPosition(position: {
    x: number;
    y: number;
  }): void {
    window.scrollTo(position.x, position.y);
  }

  /**
   * Word转PDF
   * @param file Word文档
   * @returns Promise<Blob> 转换后的PDF Blob
   */
  public static async wordToPdf(file: File): Promise<Blob> {
    // 保存初始滚动位置
    const scrollPosition = this.saveScrollPosition();

    return new Promise(async (resolve, reject) => {
      try {
        console.log("开始处理Word文档转PDF...");

        // 读取Word文档
        const arrayBuffer = await file.arrayBuffer();
        const zip = new PizZip(arrayBuffer);

        // 使用docxtemplater解析docx - 注意这步主要是为了验证文件是有效的Word文档
        new Docxtemplater().loadZip(zip);

        // 创建文档容器
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "0";
        container.style.top = "0";
        container.style.width = "794px"; // A4 width in pixels at 96 DPI
        container.style.height = "auto";
        container.style.background = "#FFFFFF";
        container.style.zIndex = "-1";
        container.style.padding = "0";
        container.style.margin = "0";
        container.style.overflow = "hidden";
        container.id = "docx-container";
        document.body.appendChild(container);

        // 在head中添加全局样式（这样能确保样式被应用）
        const globalStyle = document.createElement("style");
        globalStyle.textContent = `
          .docx-viewer {
            padding: 0 !important;
            margin: 0 !important;
          }
          .docx-wrapper {
            padding: 0 !important;
            margin: 0 !important;
          }
          .docx-wrapper-page {
            padding: 0 !important;
            margin: 0 !important;
            border-left: none !important;
            text-indent: 0 !important;
          }
          /* 消除所有可能的左侧padding和margin */
          .docx-viewer > div,
          .docx-wrapper > div,
          .docx-wrapper-page > div {
            padding-left: 0 !important;
            margin-left: 0 !important;
          }
          p {
            margin-left: 0 !important;
            padding-left: 0 !important;
            text-indent: 0 !important;
          }
        `;
        document.head.appendChild(globalStyle);

        // 使用docx-preview渲染Word文档
        await renderAsync(arrayBuffer, container, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        // 另外在容器中也添加样式以确保覆盖
        const styleElement = document.createElement("style");
        styleElement.textContent = `
          .docx-viewer {
            padding: 0 !important;
            margin: 0 !important;
          }
          .docx-wrapper {
            padding: 0 !important;
            margin: 0 !important;
          }
          .docx-wrapper-page {
            padding: 0 !important;
            margin: 0 !important;
            border-left: none !important;
            text-indent: 0 !important;
          }
          /* 消除所有可能的左侧padding和margin */
          .docx-viewer > div,
          .docx-wrapper > div,
          .docx-wrapper-page > div,
          p {
            padding-left: 0 !important;
            margin-left: 0 !important;
            text-indent: 0 !important;
          }
        `;
        container.appendChild(styleElement);

        // 给渲染好的内容一点时间来完成布局
        await new Promise((r) => setTimeout(r, 500));

        // 直接修改渲染后的样式
        const docxElements = container.querySelectorAll(
          ".docx-viewer, .docx-wrapper, .docx-wrapper-page, p"
        );
        docxElements.forEach((el) => {
          (el as HTMLElement).style.paddingLeft = "0";
          (el as HTMLElement).style.marginLeft = "0";
          (el as HTMLElement).style.textIndent = "0";
          if ((el as HTMLElement).classList.contains("docx-wrapper-page")) {
            (el as HTMLElement).style.borderLeft = "none";
          }
        });

        // 设置PDF选项
        const pdfOptions = {
          margin: [0, 10, 10, 0], // 左边距设为0
          filename: "document.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
            width: container.scrollWidth,
            height: container.scrollHeight,
            windowWidth: container.scrollWidth,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        };

        try {
          // 确保内容已完全渲染
          console.log(
            "容器尺寸:",
            container.scrollWidth,
            container.scrollHeight
          );

          // 使用html2pdf转换为PDF
          const pdfBlob = await new Promise<Blob>((pdfResolve, pdfReject) => {
            html2pdf()
              .set(pdfOptions)
              .from(container)
              .outputPdf("blob")
              .then((blob: Blob | PromiseLike<Blob>) => pdfResolve(blob))
              .catch((error: any) => pdfReject(error));
          });

          // 清理DOM并恢复滚动位置
          document.body.removeChild(container);
          this.restoreScrollPosition(scrollPosition);

          resolve(pdfBlob);
        } catch (pdfError) {
          console.error("PDF生成失败，尝试备用方法:", pdfError);

          // 备用方法：使用jsPDF和html2canvas
          try {
            // 确保容器可见以便html2canvas可以正确捕获内容
            container.style.position = "fixed";
            container.style.left = "0";
            container.style.top = "0";
            container.style.width = "794px"; // A4 width in pixels at 96 DPI
            container.style.zIndex = "9999";
            container.style.background = "#FFF";
            container.style.overflow = "hidden";
            container.style.padding = "0";
            container.style.margin = "0";

            // 添加自定义样式以减少左侧留白
            const styleElement = document.createElement("style");
            styleElement.textContent = `
              .docx-viewer {
                padding: 0 !important;
                margin: 0 !important;
              }
              .docx-wrapper {
                padding: 0 !important;
                margin: 0 !important;
              }
              .docx-wrapper-page {
                padding: 0 !important;
                margin: 0 !important;
                border-left: none !important;
              }
            `;
            container.appendChild(styleElement);

            await new Promise((r) => setTimeout(r, 300)); // 等待渲染完成

            // 将HTML转为图像添加到PDF
            const canvas = await html2canvas(container, {
              scale: 2,
              useCORS: true,
              logging: true,
              allowTaint: true,
              windowWidth: 794,
              width: 794,
              height: container.scrollHeight,
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95);

            // 创建PDF
            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4",
            });

            // 获取容器宽高
            const width = pdf.internal.pageSize.getWidth();
            const height = pdf.internal.pageSize.getHeight();

            // 计算转换比例
            const ratio = canvas.width / width;
            const totalPages = Math.ceil(canvas.height / (height * ratio));

            // 添加页面
            for (let i = 0; i < totalPages; i++) {
              if (i > 0) pdf.addPage();

              const srcY = i * height * ratio;
              const srcHeight = Math.min(height * ratio, canvas.height - srcY);

              pdf.addImage(imgData, "JPEG", 0, 0, width, srcHeight / ratio);
            }

            // 获取PDF二进制数据
            const pdfBlob = pdf.output("blob");

            // 清理DOM并恢复滚动位置
            document.body.removeChild(container);
            this.restoreScrollPosition(scrollPosition);

            resolve(pdfBlob);
          } catch (jspdfError) {
            console.error("备用PDF生成也失败:", jspdfError);
            document.body.removeChild(container);
            this.restoreScrollPosition(scrollPosition);
            reject(new Error("PDF生成失败"));
          }
        }
      } catch (error) {
        console.error("Word转PDF失败:", error);
        // 确保清理可能的DOM元素
        const container = document.getElementById("docx-container");
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }

        // 恢复滚动位置
        this.restoreScrollPosition(scrollPosition);

        reject(error);
      }
    });
  }

  /**
   * Excel转PDF
   * @param file Excel文件
   * @returns Promise<Blob> 转换后的PDF Blob
   */
  public static async excelToPdf(file: File): Promise<Blob> {
    // 保存初始滚动位置
    const scrollPosition = this.saveScrollPosition();
    let container: HTMLDivElement | null = null;

    return new Promise<Blob>(async (resolve, reject) => {
      try {
        console.log("开始处理Excel转PDF...");

        // 读取Excel文件
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // 创建HTML容器
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "0";
        container.style.top = "0";
        container.style.width = "794px"; // 固定宽度为A4宽度
        container.style.height = "auto";
        container.style.background = "#fff";
        container.style.zIndex = "-1";
        container.style.padding = "0";
        container.style.margin = "0";
        container.id = "excel-container";

        // 添加样式
        container.innerHTML = `
          <style>
            .excel-sheet {
              margin-bottom: 20px;
              page-break-after: always;
              font-family: Arial, sans-serif;
              padding: 0;
              margin: 0;
            }
            .sheet-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              background: #f3f3f3;
              padding: 8px;
              border-bottom: 1px solid #ddd;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 20px;
              table-layout: auto;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 5px;
              text-align: left;
              font-size: 11px;
              word-break: break-word;
              max-width: 300px;
            }
            th {
              background-color: #f7f7f7;
              font-weight: bold;
            }
          </style>
        `;

        // 遍历每个工作表并创建HTML表格
        let hasData = false;
        workbook.eachSheet((worksheet) => {
          const sheetDiv = document.createElement("div");
          sheetDiv.className = "excel-sheet";

          const sheetTitle = document.createElement("div");
          sheetTitle.className = "sheet-name";
          sheetTitle.textContent = worksheet.name;
          sheetDiv.appendChild(sheetTitle);

          const table = document.createElement("table");

          // 获取有数据的区域范围
          const rows = worksheet.rowCount || 0;
          const cols = worksheet.columnCount || 0;

          if (rows > 0 && cols > 0) {
            hasData = true;
            console.log(`工作表 ${worksheet.name} 尺寸: ${rows}x${cols}`);

            // 创建表头行
            const headerRow = document.createElement("tr");
            // 遍历第一行单元格创建表头
            for (let col = 1; col <= cols; col++) {
              const cell = worksheet.getCell(1, col);
              const th = document.createElement("th");
              th.textContent =
                cell.text || cell.value?.toString() || `列 ${col}`;
              headerRow.appendChild(th);
            }
            table.appendChild(headerRow);

            // 创建数据行
            for (let row = 2; row <= rows; row++) {
              const tr = document.createElement("tr");
              for (let col = 1; col <= cols; col++) {
                const cell = worksheet.getCell(row, col);
                const td = document.createElement("td");
                td.textContent = cell.text || cell.value?.toString() || "";
                tr.appendChild(td);
              }
              table.appendChild(tr);
            }
          } else {
            // 处理空工作表的情况
            console.log(`工作表 ${worksheet.name} 没有数据`);
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.textContent = "此工作表没有数据";
            tr.appendChild(td);
            table.appendChild(tr);
          }

          sheetDiv.appendChild(table);
          if (container) {
            container.appendChild(sheetDiv);
          }
        });

        if (!hasData) {
          throw new Error("Excel文件中没有可用数据");
        }

        document.body.appendChild(container);

        // 给DOM一些时间来渲染
        await new Promise((r) => setTimeout(r, 500));

        // 设置PDF选项
        const pdfOptions = {
          margin: [0, 10, 10, 0], // 左边距设为0
          filename: "spreadsheet.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            width: container.scrollWidth,
            height: container.scrollHeight,
            windowWidth: container.scrollWidth,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation:
              container.scrollWidth > container.scrollHeight
                ? "landscape"
                : "portrait",
          },
        };

        try {
          // 使用html2pdf转换为PDF
          const pdfBlob = await new Promise<Blob>((pdfResolve, pdfReject) => {
            html2pdf()
              .set(pdfOptions)
              .from(container as HTMLElement)
              .outputPdf("blob")
              .then((blob: Blob) => pdfResolve(blob))
              .catch((error: Error) => pdfReject(error));
          });

          // 清理DOM并恢复滚动位置
          if (container && container.parentNode) {
            document.body.removeChild(container);
          }
          container = null;
          this.restoreScrollPosition(scrollPosition);

          resolve(pdfBlob);
        } catch (pdfError) {
          console.error("PDF生成失败，尝试备用方法:", pdfError);

          // 备用方法：使用jsPDF直接生成
          if (!container) {
            throw new Error("容器元素为null，无法生成PDF");
          }

          try {
            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4",
            });

            // 为每个表格创建新的页面
            const sheets = container.querySelectorAll(".excel-sheet");

            for (let i = 0; i < sheets.length; i++) {
              if (i > 0) pdf.addPage();

              const sheet = sheets[i] as HTMLElement;
              const canvas = await html2canvas(sheet, {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                width: 794,
                windowWidth: 794,
              });

              const imgData = canvas.toDataURL("image/jpeg", 0.95);

              // 自适应到页面宽度
              const width = pdf.internal.pageSize.getWidth();
              const aspectRatio = canvas.height / canvas.width;
              const imgHeight = width * aspectRatio;

              pdf.addImage(imgData, "JPEG", 0, 0, width, imgHeight);
            }

            const pdfBlob = pdf.output("blob");

            // 清理DOM
            if (container && container.parentNode) {
              document.body.removeChild(container);
            }
            container = null;
            this.restoreScrollPosition(scrollPosition);

            resolve(pdfBlob);
          } catch (jspdfError) {
            console.error("备用PDF生成也失败:", jspdfError);
            if (container && container.parentNode) {
              document.body.removeChild(container);
            }
            container = null;
            this.restoreScrollPosition(scrollPosition);
            reject(new Error("Excel转PDF失败"));
          }
        }
      } catch (error) {
        console.error("Excel转PDF失败:", error);
        if (container && container.parentNode) {
          document.body.removeChild(container);
        }
        this.restoreScrollPosition(scrollPosition);
        reject(error);
      }
    });
  }
}
