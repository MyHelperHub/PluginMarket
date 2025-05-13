<script setup lang="ts">
import { ref, watch } from "vue";
import ImageEditor from "./components/ImageEditor.vue";
import ImageCropper from "./components/ImageCropper.vue";
import TextEditor from "./components/TextEditor.vue";
import { useEditorStore } from "./stores/editor";

const editorStore = useEditorStore();
const isCropperVisible = ref(false);
const isTextEditorVisible = ref(false);

// 监听工具变化
watch(
  () => editorStore.currentTool,
  (newTool) => {
    if (newTool === "crop") {
      isCropperVisible.value = true;
    } else if (newTool === "text") {
      isTextEditorVisible.value = true;
    }
  }
);
</script>

<template>
  <div class="app-container">
    <ImageEditor />
    <ImageCropper
      v-model:visible="isCropperVisible"
      @crop-complete="editorStore.setTool('select')"
    />
    <TextEditor v-model:visible="isTextEditorVisible" />
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
}
</style>
