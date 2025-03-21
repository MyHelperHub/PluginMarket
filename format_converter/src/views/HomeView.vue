<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import Card from 'primevue/card';
import Toast from 'primevue/toast';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';
import { useConverterStore } from '../stores/converterStore';

const toast = useToast();
const store = useConverterStore();
const activeIndex = ref(0);
const searchQuery = ref('');

// 创建可视化的格式转换表
const conversionMatrix = reactive([
    { sourceFormat: 'PNG', targetFormats: ['JPG', 'WEBP', 'BMP', 'SVG'], icon: 'pi pi-image' },
    { sourceFormat: 'JPG/JPEG', targetFormats: ['PNG', 'WEBP', 'BMP', 'SVG'], icon: 'pi pi-image' },
    { sourceFormat: 'DOCX', targetFormats: ['TXT', 'HTML', 'PDF'], icon: 'pi pi-file' },
    { sourceFormat: 'XLSX', targetFormats: ['CSV', 'JSON', 'PDF'], icon: 'pi pi-table' },
    { sourceFormat: 'CSV', targetFormats: ['XLSX', 'JSON'], icon: 'pi pi-table' },
    { sourceFormat: 'JSON', targetFormats: ['CSV', 'XLSX', 'XML'], icon: 'pi pi-code' },
    { sourceFormat: 'XML', targetFormats: ['JSON'], icon: 'pi pi-code' },
    { sourceFormat: 'Markdown', targetFormats: ['HTML'], icon: 'pi pi-file-edit' },
    { sourceFormat: 'TXT', targetFormats: ['DOCX'], icon: 'pi pi-file-edit' },
    { sourceFormat: 'WEBP', targetFormats: ['PNG', 'JPG', 'SVG'], icon: 'pi pi-image' },
    { sourceFormat: 'BMP', targetFormats: ['PNG', 'JPG', 'WEBP', 'SVG'], icon: 'pi pi-image' },
    { sourceFormat: 'MP3', targetFormats: ['WAV', 'OGG', 'AAC'], icon: 'pi pi-volume-up' },
    { sourceFormat: 'WAV', targetFormats: ['MP3', 'OGG', 'AAC'], icon: 'pi pi-volume-up' },
    { sourceFormat: 'OGG', targetFormats: ['MP3', 'WAV', 'AAC'], icon: 'pi pi-volume-up' },
    { sourceFormat: 'AAC', targetFormats: ['MP3', 'WAV', 'OGG'], icon: 'pi pi-volume-up' },
    { sourceFormat: 'MP4', targetFormats: ['WEBM'], icon: 'pi pi-video' },
    { sourceFormat: 'WEBM', targetFormats: ['MP4'], icon: 'pi pi-video' },
]);

// 过滤搜索结果
const filteredConversions = computed(() => {
    if (!searchQuery.value) return conversionMatrix;
    const lowerCaseQuery = searchQuery.value.toLowerCase();
    return conversionMatrix.filter(item =>
        item.sourceFormat.toLowerCase().includes(lowerCaseQuery) ||
        item.targetFormats.some(format => format.toLowerCase().includes(lowerCaseQuery))
    );
});

// 根据文件扩展名获取用户友好的格式名称
const getFormatDisplayName = (ext: string): string => {
    const formatMap: Record<string, string> = {
        'png': 'PNG 图像',
        'jpg': 'JPG 图像',
        'jpeg': 'JPEG 图像',
        'webp': 'WebP 图像',
        'bmp': 'BMP 图像',
        'svg': 'SVG 矢量图',
        'docx': 'Word 文档',
        'doc': 'Word 文档',
        'xlsx': 'Excel 电子表格',
        'xls': 'Excel 电子表格',
        'csv': 'CSV 数据',
        'json': 'JSON 数据',
        'xml': 'XML 数据',
        'txt': '文本文件',
        'html': 'HTML 页面',
        'md': 'Markdown 文档',
        'markdown': 'Markdown 文档',
        'mp3': 'MP3 音频',
        'wav': 'WAV 音频',
        'ogg': 'OGG 音频',
        'aac': 'AAC 音频',
        'mp4': 'MP4 视频',
        'webm': 'WebM 视频',
        'avi': 'AVI 视频',
        'mov': 'MOV 视频',
        'mkv': 'MKV 视频',
        'pdf': 'PDF 文档'
    };
    return formatMap[ext] || ext.toUpperCase();
};

// 根据文件扩展名获取对应的图标
const getFormatIcon = (ext: string): string => {
    const iconMap: Record<string, string> = {
        'png': 'pi pi-image',
        'jpg': 'pi pi-image',
        'jpeg': 'pi pi-image',
        'webp': 'pi pi-image',
        'bmp': 'pi pi-image',
        'svg': 'pi pi-image',
        'docx': 'pi pi-file',
        'xlsx': 'pi pi-table',
        'csv': 'pi pi-table',
        'json': 'pi pi-code',
        'xml': 'pi pi-code',
        'txt': 'pi pi-file-edit',
        'html': 'pi pi-globe',
        'md': 'pi pi-file-edit',
        'markdown': 'pi pi-file-edit',
        'mp3': 'pi pi-volume-up',
        'wav': 'pi pi-volume-up',
        'ogg': 'pi pi-volume-up',
        'aac': 'pi pi-volume-up',
        'mp4': 'pi pi-video',
        'webm': 'pi pi-video',
        'avi': 'pi pi-video',
        'mov': 'pi pi-video',
        'mkv': 'pi pi-video'
    };
    return iconMap[ext] || 'pi pi-file';
};

// 检查文件是否为音频或视频
const isMediaFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mediaFormats = ['mp3', 'wav', 'ogg', 'aac', 'mp4', 'webm', 'avi', 'mov', 'mkv'];
    return mediaFormats.includes(ext);
};

// 当前选择的文件预览
const mediaPreviewUrl = ref<string | null>(null);
const showMediaPreview = ref(false);

// 当文件上传后，根据文件类型更新可用的目标格式
const onFileUpload = (event: { files: File[] }) => {
    // 在customUpload模式下，获取选择的文件
    const file = event.files[0];
    store.uploadedFile = file;
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    store.selectedFormat = null;

    // 清理之前的媒体预览
    if (mediaPreviewUrl.value) {
        URL.revokeObjectURL(mediaPreviewUrl.value);
        mediaPreviewUrl.value = null;
    }

    // 如果是媒体文件，创建预览URL
    if (isMediaFile(file)) {
        mediaPreviewUrl.value = URL.createObjectURL(file);
        showMediaPreview.value = true;
    } else {
        showMediaPreview.value = false;
    }

    const hasFormats = store.updateTargetFormats(fileExt);
    if (!hasFormats) {
        toast.add({ severity: 'error', summary: '不支持的格式', detail: '目前不支持该文件格式的转换', life: 3000 });
    } else {
        // 自动切换到第二步
        activeIndex.value = 1;
        toast.add({
            severity: 'info',
            summary: '文件已上传',
            detail: `您现在可以将 ${getFormatDisplayName(fileExt)} 转换为其他格式`,
            life: 3000
        });
    }
};

// 转换文件
const convertFile = async () => {
    const result = await store.convertFile();

    if (result.success) {
        toast.add({ severity: 'success', summary: '转换成功', detail: result.message, life: 3000 });
        // 转换成功后，重置状态并回到第一步
        setTimeout(() => {
            // 完全重置状态
            store.resetState();
            activeIndex.value = 0;
        }, 2000);
    } else {
        if (result.type === 'info') {
            toast.add({ severity: 'info', summary: '演示模式', detail: result.message, life: 3000 });
        } else {
            toast.add({ severity: 'error', summary: '转换失败', detail: result.message, life: 3000 });
        }
    }
};

// 初始化步骤内容
onMounted(() => {
    activeIndex.value = 0;
});

// 当用户选择一个目标格式时
const onFormatSelected = () => {
    // 自动切换到第三步
    if (store.selectedFormat) {
        activeIndex.value = 2;
    }
};

// 获取当前可选择的格式展示文本
const getTargetFormatsText = computed(() => {
    if (!store.uploadedFile) return '请先上传文件';

    if (store.targetFormats.length === 0) return '不支持此格式转换';

    const formatNames = store.targetFormats.map(format => format).join('、');
    return `可以转换为：${formatNames}`;
});

// 组件卸载时清理资源
onUnmounted(() => {
    if (mediaPreviewUrl.value) {
        URL.revokeObjectURL(mediaPreviewUrl.value);
    }
});
</script>

<template>
    <div class="home-view">
        <Toast />
        <header>
            <h1><i class="pi pi-sync rotate-icon"></i> 格式转换工具</h1>
            <p>一站式解决各种文件格式转换需求</p>
        </header>

        <main>
            <!-- 转换步骤卡片 -->
            <Card class="converter-card">
                <template #title>
                    <div class="card-title">
                        <span>文件格式转换</span>
                        <span v-if="store.uploadedFile" class="file-badge">
                            <i
                                :class="getFormatIcon(store.uploadedFile.name.split('.').pop()?.toLowerCase() || '')"></i>
                            {{ store.uploadedFile.name }}
                        </span>
                    </div>
                </template>
                <template #content>
                    <!-- 步骤指示器 -->
                    <div class="steps-container">
                        <div class="step-indicator"
                            :class="{ 'active': activeIndex === 0, 'completed': activeIndex > 0 }">
                            <div class="step-number">1</div>
                            <div class="step-label">上传文件</div>
                        </div>
                        <div class="step-line" :class="{ 'active': activeIndex > 0 }"></div>
                        <div class="step-indicator"
                            :class="{ 'active': activeIndex === 1, 'completed': activeIndex > 1 }">
                            <div class="step-number">2</div>
                            <div class="step-label">选择格式</div>
                        </div>
                        <div class="step-line" :class="{ 'active': activeIndex > 1 }"></div>
                        <div class="step-indicator" :class="{ 'active': activeIndex === 2 }">
                            <div class="step-number">3</div>
                            <div class="step-label">转换下载</div>
                        </div>
                    </div>

                    <!-- 步骤内容 -->
                    <div class="step-content">
                        <!-- 步骤1：上传文件 -->
                        <div v-if="activeIndex === 0" class="upload-step">
                            <div class="upload-container">
                                <FileUpload mode="basic" :customUpload="true" @select="onFileUpload" chooseLabel="选择文件"
                                    :maxFileSize="100000000" :disabled="store.isConverting" class="upload-button"
                                    accept=".jpg,.jpeg,.png,.webp,.bmp,.svg,.docx,.doc,.txt,.html,.htm,.md,.markdown,.xlsx,.xls,.csv,.json,.xml,.mp3,.wav,.ogg,.aac,.mp4,.webm,.avi,.mov,.mkv"
                                    chooseIcon="pi pi-upload" />
                                <div class="upload-tip">
                                    <i class="pi pi-info-circle"></i>
                                    <span>支持多种格式文件转换</span>
                                </div>
                                <div class="security-tip">
                                    <i class="pi pi-shield"></i>
                                    <span>完全由客户端完成转换，无需上传至服务器，简洁安全放心</span>
                                </div>
                            </div>

                            <div class="format-info-section">
                                <h3>支持的转换格式</h3>
                                <div class="search-bar">
                                    <span class="p-input-icon-left">
                                        <i class="pi pi-search"></i>
                                        <input type="text" v-model="searchQuery" placeholder="搜索格式..."
                                            class="search-input" />
                                    </span>
                                </div>
                                <div class="conversion-table">
                                    <div v-for="(item, index) in filteredConversions" :key="index"
                                        class="conversion-row">
                                        <div class="source-format">
                                            <i :class="item.icon"></i>
                                            <span>{{ item.sourceFormat }}</span>
                                        </div>
                                        <div class="arrow">
                                            <i class="pi pi-arrow-right"></i>
                                        </div>
                                        <div class="target-formats">
                                            <span v-for="(format, idx) in item.targetFormats" :key="idx"
                                                class="format-tag">
                                                {{ format }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 步骤2：选择目标格式 -->
                        <div v-if="activeIndex === 1" class="format-step">
                            <div class="current-file">
                                <div class="file-info" v-if="store.uploadedFile">
                                    <i
                                        :class="getFormatIcon(store.uploadedFile.name.split('.').pop()?.toLowerCase() || '')"></i>
                                    <span class="file-name">{{ store.uploadedFile.name }}</span>
                                    <span class="file-size">({{ (store.uploadedFile.size / 1024).toFixed(1) }}
                                        KB)</span>
                                </div>
                                <div class="target-format-text">
                                    {{ getTargetFormatsText }}
                                </div>
                            </div>

                            <!-- 媒体文件预览 -->
                            <div v-if="showMediaPreview && mediaPreviewUrl" class="media-preview">
                                <h3>文件预览</h3>
                                <div class="preview-container">
                                    <!-- 音频预览 -->
                                    <audio v-if="store.uploadedFile?.name.match(/\.(mp3|wav|ogg|aac)$/i)" controls
                                        :src="mediaPreviewUrl" class="audio-preview"></audio>

                                    <!-- 视频预览 -->
                                    <video v-else-if="store.uploadedFile?.name.match(/\.(mp4|webm|avi|mov|mkv)$/i)"
                                        controls :src="mediaPreviewUrl" class="video-preview"></video>
                                </div>
                            </div>

                            <div class="format-selection">
                                <h3>选择目标格式</h3>
                                <div class="format-options">
                                    <div v-for="format in store.targetFormats" :key="format" class="format-option"
                                        :class="{ 'selected': store.selectedFormat === format }"
                                        @click="store.selectedFormat = format; onFormatSelected()">
                                        <div class="format-icon">
                                            <i :class="getFormatIcon(format.toLowerCase())"></i>
                                        </div>
                                        <div class="format-label">{{ format }}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="navigation-buttons">
                                <Button label="返回" icon="pi pi-arrow-left" severity="secondary" @click="activeIndex = 0"
                                    outlined />
                                <Button label="继续" icon="pi pi-arrow-right" :disabled="!store.selectedFormat"
                                    @click="activeIndex = 2" />
                            </div>
                        </div>

                        <!-- 步骤3：转换并下载 -->
                        <div v-if="activeIndex === 2" class="convert-step">
                            <div class="conversion-summary">
                                <div class="summary-item from">
                                    <div class="summary-label">源文件格式</div>
                                    <div class="summary-value" v-if="store.uploadedFile">
                                        <i
                                            :class="getFormatIcon(store.uploadedFile.name.split('.').pop()?.toLowerCase() || '')"></i>
                                        <span>{{
                                            getFormatDisplayName(store.uploadedFile.name.split('.').pop()?.toLowerCase()
                                                || '')
                                        }}</span>
                                    </div>
                                </div>

                                <div class="summary-arrow">
                                    <i class="pi pi-arrow-right"></i>
                                </div>

                                <div class="summary-item to">
                                    <div class="summary-label">目标格式</div>
                                    <div class="summary-value">
                                        <i :class="getFormatIcon(store.selectedFormat?.toLowerCase() || '')"></i>
                                        <span>{{ store.selectedFormat }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="convert-action">
                                <Button label="开始转换" icon="pi pi-sync" @click="convertFile"
                                    :disabled="store.isConverting" class="convert-button" severity="success" />
                                <div class="convert-tip">
                                    <i class="pi pi-info-circle"></i>
                                    <span>转换后将自动下载文件</span>
                                </div>
                            </div>

                            <div v-if="store.isConverting" class="progress-container">
                                <ProgressBar :value="store.progress" class="custom-progress-bar" />
                                <p>正在转换中，请稍候...</p>
                            </div>

                            <div class="convert-tips" v-if="isMediaFile(store.uploadedFile!)">
                                <div class="info-box">
                                    <i class="pi pi-info-circle"></i>
                                    <div class="info-content">
                                        <p><strong>关于媒体文件转换的说明</strong></p>
                                        <p>浏览器环境下的媒体文件转换有一定限制：</p>
                                        <ul>
                                            <li>音频格式：支持基本的格式转换，但某些编解码可能受限</li>
                                            <li>视频格式：浏览器环境下只能进行基本的格式切换</li>
                                            <li>大文件处理：媒体文件通常较大，处理可能需要较长时间</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div class="navigation-buttons">
                                <Button label="返回" icon="pi pi-arrow-left" severity="secondary" @click="activeIndex = 1"
                                    :disabled="store.isConverting" outlined />
                                <Button label="重新开始" icon="pi pi-refresh" severity="secondary"
                                    @click="activeIndex = 0; store.resetState()" :disabled="store.isConverting" />
                            </div>
                        </div>
                    </div>
                </template>
            </Card>
        </main>

        <footer>
            <p>© 2023 格式转换工具 | 使用优质的第三方库提供强大的转换能力</p>
        </footer>
    </div>
</template>

<style lang="less" scoped>
@import '../styles/variables.less';

// 隐藏FileUpload中的"No file chosen"文本
:deep(.p-fileupload-basic) {
    .p-button {
        width: 100%;
        max-width: 300px;
        font-weight: 600;

        // 确保图标和文字对齐居中
        .p-button-icon {
            margin-right: 0.5rem;
        }
    }

    .p-fileupload-filename {
        display: none !important;
    }
}

.home-view {
    font-family: @font-family;
    max-width: 1200px;
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
            display: flex;
            align-items: center;
            justify-content: center;
            gap: @spacing-sm;

            .rotate-icon {
                animation: rotate @animation-duration linear infinite;
                font-size: 2rem;
            }
        }

        p {
            color: @text-secondary;
            font-size: 1.1rem;
        }
    }

    // 定义旋转动画
    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(360deg);
        }
    }

    .converter-card {
        margin-bottom: @spacing-xl;
        box-shadow: @shadow-lg;
        border-radius: @border-radius-lg;

        .card-title {
            font-size: @font-size-lg;
            font-weight: 600;
            color: @primary-color;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .file-badge {
            font-size: @font-size-sm;
            background-color: @primary-light;
            border-radius: @border-radius-pill;
            padding: @spacing-xs @spacing-md;
            display: flex;
            align-items: center;
            gap: @spacing-sm;
            color: #0d6efd;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    // 步骤指示器样式
    .steps-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: @spacing-xl;
        padding: 0 @spacing-xl;

        .step-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;

            .step-number {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background-color: #e9ecef;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-bottom: @spacing-sm;
                color: @text-muted;
                transition: all @transition-duration ease;
            }

            .step-label {
                font-size: @font-size-sm;
                color: @text-muted;
                transition: all @transition-duration ease;
            }

            &.active {
                .step-number {
                    background-color: @primary-color;
                    color: white;
                }

                .step-label {
                    color: @primary-color;
                    font-weight: 600;
                }
            }

            &.completed {
                .step-number {
                    background-color: @success-color;
                    color: white;
                }
            }
        }

        .step-line {
            flex: 1;
            height: 3px;
            background-color: #e9ecef;
            margin: 0 @spacing-sm;
            position: relative;
            top: -18px;
            transition: all @transition-duration ease;

            &.active {
                background-color: @success-color;
            }
        }
    }

    // 步骤内容样式
    .step-content {
        padding: @spacing-md;
        min-height: 400px;

        // 步骤1：上传文件
        .upload-step {
            display: flex;
            flex-direction: column;
            gap: @spacing-xl;

            .upload-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: @spacing-xl;
                background-color: @bg-light;
                border-radius: @border-radius;
                border: 2px dashed @border-color;
                transition: all @transition-duration ease;

                &:hover {
                    border-color: @primary-color;
                    background-color: fade(@primary-color, 5%);
                }

                .upload-button {
                    margin-bottom: @spacing-md;
                }

                .upload-tip,
                .security-tip {
                    display: flex;
                    align-items: center;
                    gap: @spacing-sm;
                    color: @text-muted;
                    font-size: @font-size-sm;
                    margin-top: @spacing-sm;
                }
                
                .security-tip {
                    color: @success-color;
                    
                    i {
                        font-size: 1rem;
                    }
                }
            }

            .format-info-section {
                margin-top: @spacing-md;

                h3 {
                    margin-bottom: @spacing-md;
                    color: #343a40;
                    font-size: 1.2rem;
                }

                .search-bar {
                    margin-bottom: @spacing-md;

                    .search-input {
                        width: 100%;
                        padding: @spacing-sm @spacing-sm @spacing-sm 2rem;
                        border: 1px solid #ced4da;
                        border-radius: @border-radius-sm;
                        font-size: @font-size-sm;
                        transition: all @transition-duration ease;

                        &:focus {
                            border-color: @primary-color;
                            box-shadow: 0 0 0 0.2rem rgba(33, 150, 243, 0.25);
                            outline: none;
                        }
                    }

                    .p-input-icon-left {
                        width: 100%;
                        position: relative;

                        i {
                            position: absolute;
                            left: @spacing-sm;
                            top: 50%;
                            transform: translateY(-50%);
                            color: @text-muted;
                        }
                    }
                }

                .conversion-table {
                    display: flex;
                    flex-direction: column;
                    gap: @spacing-md;
                    max-height: 350px;
                    overflow-y: auto;
                    padding-right: @spacing-sm;

                    .conversion-row {
                        display: flex;
                        align-items: center;
                        background-color: @bg-white;
                        border-radius: @border-radius;
                        padding: @spacing-md;
                        box-shadow: @shadow-sm;
                        transition: all @transition-duration ease;

                        &:hover {
                            box-shadow: @shadow-md;
                            transform: translateY(-2px);
                        }

                        .source-format {
                            flex: 0 0 120px;
                            display: flex;
                            align-items: center;
                            gap: @spacing-sm;
                            font-weight: 600;
                        }

                        .arrow {
                            margin: 0 @spacing-md;
                            color: @text-muted;
                        }

                        .target-formats {
                            flex: 1;
                            display: flex;
                            flex-wrap: wrap;
                            gap: @spacing-sm;

                            .format-tag {
                                background-color: #e9ecef;
                                color: #495057;
                                border-radius: 16px;
                                padding: @spacing-xs @spacing-sm;
                                font-size: @font-size-sm;
                                transition: all 0.2s ease;

                                &:hover {
                                    background-color: @primary-color;
                                    color: white;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 步骤2：选择目标格式
        .format-step {
            display: flex;
            flex-direction: column;
            gap: @spacing-xl;

            .current-file {
                background-color: @bg-light;
                border-radius: @border-radius;
                padding: @spacing-lg;
                display: flex;
                flex-direction: column;
                gap: @spacing-md;

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;

                    i {
                        font-size: @font-size-lg;
                        color: @primary-color;
                    }

                    .file-name {
                        font-weight: 600;
                        color: #343a40;
                    }

                    .file-size {
                        color: @text-muted;
                        font-size: @font-size-sm;
                    }
                }

                .target-format-text {
                    font-size: 0.95rem;
                    color: #495057;
                    margin-top: @spacing-sm;
                }
            }

            .format-selection {
                h3 {
                    margin-bottom: @spacing-md;
                    color: #343a40;
                }

                .format-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: @spacing-md;
                    margin-bottom: @spacing-lg;

                    .format-option {
                        background-color: @bg-white;
                        border: 1px solid @border-color;
                        border-radius: @border-radius;
                        padding: @spacing-md;
                        width: 120px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: @spacing-sm;
                        cursor: pointer;
                        transition: all 0.2s ease;

                        &:hover {
                            border-color: @primary-color;
                            transform: translateY(-3px);
                            box-shadow: @shadow-md;
                        }

                        &.selected {
                            border-color: @primary-color;
                            background-color: @primary-light;
                            transform: translateY(-3px);
                            box-shadow: 0 4px 8px rgba(33, 150, 243, 0.2);
                        }

                        .format-icon {
                            font-size: 2rem;
                            color: @primary-color;
                        }

                        .format-label {
                            font-weight: 600;
                            color: #343a40;
                        }
                    }
                }
            }

            .navigation-buttons {
                display: flex;
                justify-content: space-between;
                margin-top: @spacing-xl;
            }
        }

        // 步骤3：转换并下载
        .convert-step {
            display: flex;
            flex-direction: column;
            gap: @spacing-xl;

            .conversion-summary {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: @spacing-xl;
                background-color: @bg-light;
                border-radius: @border-radius;
                padding: @spacing-xl;

                .summary-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: @spacing-sm;

                    .summary-label {
                        font-size: @font-size-sm;
                        color: @text-muted;
                    }

                    .summary-value {
                        display: flex;
                        align-items: center;
                        gap: @spacing-sm;
                        font-weight: 600;
                        color: #343a40;

                        i {
                            font-size: @font-size-lg;
                            color: @primary-color;
                        }
                    }
                }

                .summary-arrow {
                    color: @primary-color;
                    font-size: @font-size-lg;
                }
            }

            .convert-action {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: @spacing-md;

                .convert-button {
                    width: 200px;
                }

                .convert-tip {
                    display: flex;
                    align-items: center;
                    gap: @spacing-sm;
                    color: @text-muted;
                    font-size: @font-size-sm;
                }
            }

            .progress-container {
                margin-top: @spacing-md;
                text-align: center;

                .custom-progress-bar {
                    height: 10px;
                    border-radius: 5px;
                }

                p {
                    margin-top: @spacing-sm;
                    color: @text-muted;
                }
            }

            .convert-tips {
                margin: 1.5rem 0;

                .info-box {
                    display: flex;
                    background-color: rgba(33, 150, 243, 0.1);
                    border-left: 4px solid #2196F3;
                    padding: 1rem;
                    border-radius: @border-radius;
                    gap: 1rem;
                    align-items: flex-start;

                    i {
                        color: #2196F3;
                        font-size: @font-size-lg;
                        margin-top: 0.2rem;
                    }

                    .info-content {
                        flex: 1;

                        p {
                            margin: 0 0 0.5rem 0;
                            color: @text-color;

                            &:last-child {
                                margin-bottom: 0;
                            }
                        }

                        ul {
                            margin: 0.5rem 0 0 1rem;
                            padding: 0;

                            li {
                                margin-bottom: 0.3rem;
                                color: @text-muted;
                            }
                        }
                    }
                }
            }

            .navigation-buttons {
                display: flex;
                justify-content: space-between;
                margin-top: @spacing-xl;
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
    .home-view {
        .steps-container {
            padding: 0;
        }

        .conversion-summary {
            flex-direction: column;
            gap: @spacing-md;

            .summary-arrow {
                transform: rotate(90deg);
            }
        }

        .format-options {
            justify-content: center;
        }
    }
}

// 媒体预览样式
.media-preview {
    margin: 1.5rem 0;

    h3 {
        margin-bottom: 1rem;
        font-size: @font-size-md;
        color: @text-color;
    }

    .preview-container {
        display: flex;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: @border-radius;
        padding: 1rem;
    }

    .audio-preview {
        width: 100%;
        max-width: 500px;
    }

    .video-preview {
        max-width: 100%;
        max-height: 300px;
        border-radius: @border-radius;
    }
}

// 转换提示信息
.convert-tips {
    margin: 1.5rem 0;

    .info-box {
        display: flex;
        background-color: rgba(33, 150, 243, 0.1);
        border-left: 4px solid #2196F3;
        padding: 1rem;
        border-radius: @border-radius;
        gap: 1rem;
        align-items: flex-start;

        i {
            color: #2196F3;
            font-size: @font-size-lg;
            margin-top: 0.2rem;
        }

        .info-content {
            flex: 1;

            p {
                margin: 0 0 0.5rem 0;
                color: @text-color;

                &:last-child {
                    margin-bottom: 0;
                }
            }

            ul {
                margin: 0.5rem 0 0 1rem;
                padding: 0;

                li {
                    margin-bottom: 0.3rem;
                    color: @text-muted;
                }
            }
        }
    }
}
</style>