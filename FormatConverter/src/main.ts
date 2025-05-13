import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import "./style.css";

import PrimeVue from "primevue/config";
import Lara from "@primeuix/themes/lara";
import "primeicons/primeicons.css";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";

import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 配置PrimeVue并使用Lara主题
app.use(PrimeVue, {
  theme: {
    preset: Lara,
  },
});

// 注册指令和服务
app.directive("tooltip", Tooltip);
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
