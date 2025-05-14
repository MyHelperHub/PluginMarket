/**
 * 格式化工具函数
 */

// 滤镜键类型
export type FilterKey = "brightness" | "contrast" | "saturation";

/**
 * 格式化百分比，将0-1的值转为百分比表示
 * @param value 0-1之间的值
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * 格式化简单百分比
 * @param value 百分比值
 * @returns 格式化后的百分比字符串
 */
export function formatSimplePercent(value: number): string {
  return `${value}%`;
}
