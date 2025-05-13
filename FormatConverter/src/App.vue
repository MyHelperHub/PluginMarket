<script setup lang="ts">
import Menubar from 'primevue/menubar';
import { useRouter } from 'vue-router';

const router = useRouter();

const menuItems = [
  {
    label: '首页',
    icon: 'pi pi-home',
    command: () => router.push('/')
  },
  {
    label: '关于',
    icon: 'pi pi-info-circle',
    command: () => router.push('/about')
  }
];
</script>

<template>
  <div class="app-container">
    <Menubar :model="menuItems" class="app-menubar">
      <template #start>
        <div class="brand">
          <i class="pi pi-sync brand-icon"></i>
          <span class="brand-text">格式转换工具</span>
        </div>
      </template>
    </Menubar>

    <div class="app-content">
      <router-view />
    </div>
  </div>
</template>

<style lang="less">
@import './styles/variables.less';

// 全局样式
body {
  margin: 0;
  padding: 0;
  font-family: @font-family;
  background-color: @bg-color;
  color: @text-color;
}

// 应用容器
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  // 顶部菜单栏
  .app-menubar {
    padding: @spacing-sm @spacing-xl;
    background: @bg-white;
    box-shadow: @shadow-sm;
  }

  // 品牌标识
  .brand {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    cursor: pointer;

    .brand-icon {
      font-size: @font-size-lg;
      color: @primary-color;
    }

    .brand-text {
      font-size: @font-size-lg;
      font-weight: 600;
      color: @primary-color;
    }
  }

  // 内容区域
  .app-content {
    flex: 1;
    padding: 0;
  }
}

// 响应式设计
@media (max-width: @breakpoint-md) {
  .app-container {
    .app-menubar {
      padding: @spacing-sm @spacing-md;
    }
  }
}
</style>
