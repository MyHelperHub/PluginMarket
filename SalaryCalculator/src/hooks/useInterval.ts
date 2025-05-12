import { useEffect, useRef } from "react";

/**
 * 自定义Hook，用于安全地设置在React组件中使用的定时器
 * 这是Dan Abramov推荐的实现方式，解决了普通setInterval在函数组件中的闭包问题
 * @param callback 要定期执行的回调函数
 * @param delay 执行间隔（毫秒），如果为null则暂停
 */
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback);

  // 记住最新的回调函数
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // 设置定时器
  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }

    return undefined;
  }, [delay]);
}

export default useInterval;
