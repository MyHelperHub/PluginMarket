/**
 * 工资计算器相关类型定义
 */

export interface SalaryFormData {
  monthlySalary: number;
  workingDaysPerMonth: number | null;
  restType: "one" | "two";
  hoursPerDay: number;
  workingStartDate: Date;
  workingStartTime: string; // 格式 "HH:mm"
  restTime: number; // 休息时间，单位分钟
  restStartTime: string; // 休息开始时间，格式 "HH:mm"
  restEndTime: string; // 休息结束时间，格式 "HH:mm"
  useCustomWorkingDays: boolean;
}

export interface SalaryStats {
  dailySalary: number;
  hourlySalary: number;
  minuteSalary: number;
  secondSalary: number;
  monthlyWorkingDays: number;
  totalEarnedSalary: number;
  currentEarnedSalary: number;
  remainingSalary: number;
  percentCompleted: number;
}

export interface RealtimeSalaryInfo {
  currentEarnedSalary: number;
  lastUpdateTime: number;
}

export interface WorkTimeInfo {
  startDateTime: Date; // 包含日期和时间的完整开始时间
  restTimeMinutes: number; // 休息时间（分钟）
  effectiveWorkingHours: number; // 有效工作时间（小时）
}
