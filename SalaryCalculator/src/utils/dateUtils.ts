/**
 * 日期工具函数
 */

/**
 * 格式化日期为YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * 格式化数字为金额（保留4位小数）
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
};

/**
 * 格式化数字为金额（保留2位小数）
 */
export const formatCurrencySimple = (value: number): string => {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * 检查是否为工作日 (简单实现，不考虑节假日)
 */
export const isWorkingDay = (date: Date, restType: "one" | "two"): boolean => {
  const dayOfWeek = date.getDay(); // 0 是周日，6 是周六

  if (restType === "one") {
    // 单休，周日休息
    return dayOfWeek !== 0;
  } else {
    // 双休，周六周日休息
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }
};

/**
 * 获取当前月份剩余天数
 */
export const getRemainingDaysInMonth = (): number => {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return lastDayOfMonth.getDate() - today.getDate();
};
