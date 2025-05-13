<script setup lang="ts">
import Card from "primevue/card";
import Divider from "primevue/divider";
</script>

<template>
  <div class="about-view">
    <header>
      <h1>关于格式转换工具</h1>
      <p>了解更多关于我们的在线格式转换工具</p>
    </header>

    <main>
      <Card class="about-card">
        <template #title>
          <div class="card-title">项目介绍</div>
        </template>
        <template #content>
          <p>
            格式转换工具是一个简洁美观的在线文件格式转换平台，旨在为用户提供便捷的文件格式转换服务。无论是图像、文档还是表格文件，都可以在这里轻松转换成您需要的格式。
          </p>

          <p>
            我们的工具完全在浏览器中运行，所有的转换过程都在您的本地设备上完成，不会上传文件到服务器，保护您的隐私和数据安全。
          </p>

          <p class="warning-text">
            <i class="pi pi-exclamation-triangle" style="margin-right: 8px"></i
            >由于该转换工具是完全运行于本地设备，受限较大，对PDF等特殊格式支持较差，如您对文件要求较严格，请使用正规转换工具。
          </p>
        </template>
      </Card>

      <Divider />

      <Card class="about-card">
        <template #title>
          <div class="card-title">支持的格式</div>
        </template>
        <template #content>
          <div class="format-section">
            <h3><i class="pi pi-image"></i> 图像格式</h3>
            <p>
              支持PNG、JPG/JPEG、WEBP、BMP、TIFF等常见图像格式之间的互相转换。
            </p>
          </div>

          <div class="format-section">
            <h3><i class="pi pi-file"></i> 文档格式</h3>
            <p>
              支持PDF、DOCX、TXT、HTML等文档格式之间的转换，满足您的文档处理需求。
            </p>
          </div>

          <div class="format-section">
            <h3><i class="pi pi-table"></i> 表格格式</h3>
            <p>
              提供XLSX、CSV、JSON等表格数据格式的转换功能，便于数据分析和处理。
            </p>
          </div>

          <div class="format-section">
            <h3><i class="pi pi-folder"></i> 其他格式</h3>
            <p>不断扩展中的其他格式支持，如压缩文件格式等。</p>
          </div>
        </template>
      </Card>

      <Divider />

      <Card class="about-card">
        <template #title>
          <div class="card-title">技术栈</div>
        </template>
        <template #content>
          <div class="tech-stack">
            <div class="tech-item">
              <h3>前端框架</h3>
              <ul>
                <li>Vue 3</li>
                <li>TypeScript</li>
                <li>Vite</li>
                <li>PrimeVue UI 组件库</li>
              </ul>
            </div>

            <div class="tech-item">
              <h3>格式转换库</h3>
              <ul>
                <li>pdf-lib / jspdf - PDF处理</li>
                <li>xlsx - Excel文件处理</li>
                <li>docx - Word文档处理</li>
                <li>file-saver - 文件下载</li>
                <li>html2canvas - 网页截图</li>
              </ul>
            </div>
          </div>
        </template>
      </Card>
    </main>
  </div>
</template>

<style lang="less" scoped>
@import "../styles/variables.less";

.about-view {
  font-family: @font-family;
  max-width: 1000px;
  margin: 0 auto;
  padding: @spacing-xl;
  color: @text-color;

  header {
    text-align: center;
    margin-bottom: 2.5rem;

    h1 {
      color: @primary-color;
      margin-bottom: @spacing-sm;
      font-size: 2.5rem;
    }

    p {
      color: @text-secondary;
      font-size: 1.1rem;
    }
  }

  .about-card {
    margin-bottom: @spacing-xl;
    box-shadow: @shadow-sm;
    border-radius: @border-radius;

    .card-title {
      font-size: @font-size-lg;
      font-weight: 600;
      color: @primary-color;
    }

    .warning-text {
      background-color: #fff6f6;
      color: #db2828;
      padding: 12px;
      border-radius: 4px;
      border-left: 4px solid #db2828;
      margin-top: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
    }
  }

  .format-section {
    margin-bottom: @spacing-lg;

    h3 {
      color: #444;
      display: flex;
      align-items: center;
      gap: @spacing-sm;
      margin-bottom: @spacing-sm;

      i {
        color: @primary-color;
      }
    }

    p {
      line-height: 1.6;
      color: #555;
    }
  }

  .tech-stack {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: @spacing-lg;

    .tech-item {
      h3 {
        color: #444;
        margin-bottom: @spacing-md;
      }

      ul {
        list-style-type: circle;
        padding-left: 1.2rem;

        li {
          margin-bottom: @spacing-sm;
          color: #555;
        }
      }
    }
  }

  footer {
    margin-top: 3rem;
    text-align: center;
    color: @text-light;
    font-size: @font-size-sm;
  }
}

// 响应式设计
@media (max-width: @breakpoint-md) {
  .about-view {
    padding: @spacing-lg;

    .tech-stack {
      grid-template-columns: 1fr;
    }
  }
}
</style>
