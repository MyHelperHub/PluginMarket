import { createApp } from "vue";
import { createPinia } from "pinia";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import "./style.css";
import App from "./App.vue";
import { fabric } from "fabric";

// 确保fabric.js已正确加载
try {
  // 可以在这里添加全局fabric.js配置
  console.info("Fabric.js 版本:", fabric.version);
} catch (error) {
  console.error("Fabric.js 加载失败:", error);
}

const app = createApp(App);
app.use(createPinia());
app.use(Antd);
app.mount("#app");
