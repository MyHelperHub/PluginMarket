<template>
  <a-modal
    :open="open"
    @update:open="(val: boolean) => emit('update:open', val)"
    title="导出图片"
    @ok="$emit('export-image')"
    width="800px"
  >
    <a-row :gutter="24">
      <a-col :span="14">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="格式">
                <a-select
                  :value="exportFormat"
                  @change="(val: string) => emit('update:exportFormat', val)"
                >
                  <a-select-option value="png">PNG</a-select-option>
                  <a-select-option value="jpeg">JPEG</a-select-option>
                  <a-select-option value="webp">WebP</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>

            <a-col :span="12">
              <a-form-item label="质量" v-if="exportFormat !== 'png'">
                <a-slider
                  :value="exportQuality"
                  @change="(val: number) => emit('update:exportQuality', val)"
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
              :value="exportSettings.sizeType"
              @change="(val: string) => (exportSettings.sizeType = val)"
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
                    :value="exportSettings.width"
                    :min="1"
                    :max="10000"
                    style="width: 100%"
                    @change="(val: number) => emit('width-change', val)"
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
                      exportSettings.maintainAspectRatio ? 'primary' : 'default'
                    "
                    @click="$emit('toggle-aspect')"
                  >
                    <template #icon>
                      <LockOutlined v-if="exportSettings.maintainAspectRatio" />
                      <UnlockOutlined v-else />
                    </template>
                  </a-button>
                </a-tooltip>
              </a-col>
              <a-col :span="11">
                <a-form-item label="高度 (像素)">
                  <a-input-number
                    :value="exportSettings.height"
                    :min="1"
                    :max="10000"
                    style="width: 100%"
                    @change="(val: number) => emit('height-change', val)"
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
              :value="exportSettings.percentSize"
              :min="1"
              :max="200"
              :step="1"
              :tooltipVisible="true"
              :tipFormatter="simplePercentFormatter"
              @change="(val: number) => emit('percent-change', val)"
            />
          </a-form-item>

          <a-form-item label="DPI (分辨率)">
            <a-select
              :value="exportSettings.dpi"
              @change="(val: number) => (exportSettings.dpi = val)"
              style="width: 200px"
            >
              <a-select-option :value="96">96 DPI (屏幕显示)</a-select-option>
              <a-select-option :value="150">150 DPI (普通打印)</a-select-option>
              <a-select-option :value="300"
                >300 DPI (高质量打印)</a-select-option
              >
              <a-select-option :value="600">600 DPI (专业印刷)</a-select-option>
            </a-select>
          </a-form-item>

          <a-divider />

          <div class="export-info">
            <div class="export-info-item">
              <strong>导出尺寸:</strong> {{ exportDimensions.width }} ×
              {{ exportDimensions.height }} 像素
            </div>
            <div class="export-info-item">
              <strong>估计文件大小:</strong> {{ estimatedFileSize }}
            </div>
          </div>
        </a-form>
      </a-col>

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
</template>

<script setup lang="ts">
import { LockOutlined, UnlockOutlined } from "@ant-design/icons-vue";
import { formatPercent, formatSimplePercent } from "../../utils/formatters";

defineProps<{
  open: boolean;
  exportFormat: string;
  exportQuality: number;
  exportSettings: {
    sizeType: string;
    width: number;
    height: number;
    maintainAspectRatio: boolean;
    percentSize: number;
    dpi: number;
  };
  exportDimensions: { width: number; height: number };
  estimatedFileSize: string;
  exportPreviewUrl: string;
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "update:exportFormat", val: string): void;
  (e: "update:exportQuality", val: number): void;
  (e: "width-change", val: number): void;
  (e: "height-change", val: number): void;
  (e: "percent-change", val: number): void;
  (e: "toggle-aspect"): void;
  (e: "export-image"): void;
}>();

const percentFormatter = formatPercent;
const simplePercentFormatter = formatSimplePercent;
</script>

<style scoped>
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
.export-preview {
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
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
