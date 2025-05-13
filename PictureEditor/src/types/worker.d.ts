// 为工作线程声明自定义类型

// 扩展 Worker 接口以支持转移对象
interface WorkerGlobalScope {
  postMessage(message: any, transfer: Transferable[]): void;
}

// 确保 TypeScript 知道 self 引用是 WorkerGlobalScope 类型
declare var self: WorkerGlobalScope;
