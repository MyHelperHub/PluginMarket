import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: {
        title: "格式转换工具 - 首页",
      },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("../views/AboutView.vue"),
      meta: {
        title: "关于 - 格式转换工具",
      },
    },
    // 路由不存在时重定向到首页
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// 全局前置守卫，设置页面标题
router.beforeEach((to, from, next) => {
  document.title = (to.meta.title as string) || "格式转换工具";
  next();
});

export default router;
