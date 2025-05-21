/**
 * 工资计算器相关类型定义
 */

export interface BreakTime {
  id: string;
  startTime: string; // 格式 "HH:mm"
  endTime: string; // 格式 "HH:mm"
}

export interface SalaryFormData {
  monthlySalary: number;
  workingDaysPerMonth: number | null;
  restType: "one" | "two";
  workingDate: Date;
  workingStartTime: string; // 格式 "HH:mm"
  workingEndTime: string; // 格式 "HH:mm"
  breakTimes: BreakTime[]; // 休息时间数组
  restTime: number; // 总休息时间，单位分钟 (计算得出)
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
