/**
 * 工资计算工具函数
 */
import { BreakTime } from "@/types/salary";

export interface SalaryParams {
  monthlySalary: number;
  workingDaysPerMonth: number | null;
  restType: "one" | "two"; // 'one' 表示单休, 'two' 表示双休
  workingDate: Date;
  workingStartTime: string; // 格式 "HH:mm"
  workingEndTime: string; // 格式 "HH:mm"
  breakTimes: BreakTime[]; // 休息时间数组
  restTime: number; // 总休息时间（分钟）
}

// 导出类型，便于模块导入
type SalaryParamsType = SalaryParams;
export type { SalaryParamsType };

/**
 * 计算休息时间段的时长（分钟）
 */
export const calculateBreakDuration = (
  startTime: string,
  endTime: string
): number => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // 计算总分钟数
  const durationMinutes = endTotalMinutes - startTotalMinutes;

  return durationMinutes;
};

/**
 * 检查休息时间是否有重叠或者无效
 * @returns 如果有重叠或者无效返回true，否则返回false
 */
export const hasOverlappingBreaks = (
  breakTimes: BreakTime[],
  workingStartTime: string,
  workingEndTime: string
): boolean => {
  if (breakTimes.length <= 1) return false;

  // 检查每个休息时间是否在工作时间范围内
  for (const breakTime of breakTimes) {
    const startInvalid = !isTimeInWorkRange(
      breakTime.startTime,
      workingStartTime,
      workingEndTime
    );
    const endInvalid = !isTimeInWorkRange(
      breakTime.endTime,
      workingStartTime,
      workingEndTime
    );

    if (startInvalid || endInvalid) return true;
  }

  // 检查休息时间间是否重叠
  for (let i = 0; i < breakTimes.length; i++) {
    for (let j = i + 1; j < breakTimes.length; j++) {
      if (isBreakTimeOverlap(breakTimes[i], breakTimes[j])) {
        return true;
      }
    }
  }

  return false;
};

/**
 * 检查时间是否在工作时间范围内
 */
export const isTimeInWorkRange = (
  time: string,
  workStartTime: string,
  workEndTime: string
): boolean => {
  const timeMinutes = convertTimeToMinutes(time);
  const startMinutes = convertTimeToMinutes(workStartTime);
  const endMinutes = convertTimeToMinutes(workEndTime);

  // 标准情况：时间必须在开始时间和结束时间之间
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

/**
 * 将时间转换为总分钟数
 */
export const convertTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * 检查两个休息时间是否重叠
 */
const isBreakTimeOverlap = (breakA: BreakTime, breakB: BreakTime): boolean => {
  const startA = convertTimeToMinutes(breakA.startTime);
  const endA = convertTimeToMinutes(breakA.endTime);
  const startB = convertTimeToMinutes(breakB.startTime);
  const endB = convertTimeToMinutes(breakB.endTime);

  // 标准情况：两个时间段重叠的条件是一个时间段的开始时间小于另一个时间段的结束时间
  // 并且这个时间段的结束时间大于另一个时间段的开始时间
  return Math.max(startA, startB) < Math.min(endA, endB);
};

/**
 * 计算所有休息时间的总时长（分钟）
 */
export const calculateTotalBreakMinutes = (breakTimes: BreakTime[]): number => {
  if (!breakTimes || breakTimes.length === 0) return 0;

  return breakTimes.reduce((total, breakTime) => {
    if (!breakTime.startTime || !breakTime.endTime) return total;

    const startMinutes = convertTimeToMinutes(breakTime.startTime);
    const endMinutes = convertTimeToMinutes(breakTime.endTime);

    // 确保结束时间大于开始时间（不考虑跨天）
    if (endMinutes <= startMinutes) return total;

    return total + (endMinutes - startMinutes);
  }, 0);
};

/**
 * 根据休息类型计算每月工作天数
 */
export const calculateWorkingDaysPerMonth = (
  restType: "one" | "two"
): number => {
  const daysInMonth = 30; // 假设每月30天

  if (restType === "one") {
    // 单休，每周工作6天
    return Math.round((daysInMonth * 6) / 7);
  } else {
    // 双休，每周工作5天
    return Math.round((daysInMonth * 5) / 7);
  }
};

/**
 * 计算每天薪资
 */
export const calculateDailySalary = (
  monthlySalary: number,
  workingDays: number
): number => {
  return monthlySalary / workingDays;
};

/**
 * 计算每小时薪资
 */
export const calculateHourlySalary = (
  dailySalary: number,
  workingHours: number
): number => {
  return dailySalary / workingHours;
};

/**
 * 计算工作时长（小时）
 */
export const calculateWorkingHours = (
  startTimeStr: string,
  endTimeStr: string,
  totalBreakMinutes: number
): number => {
  const [startHours, startMinutes] = startTimeStr.split(":").map(Number);
  const [endHours, endMinutes] = endTimeStr.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // 计算总工作分钟数
  const totalMinutes = endTotalMinutes - startTotalMinutes;

  // 减去休息时间
  const workingMinutes = totalMinutes - totalBreakMinutes;

  // 转换为小时
  return workingMinutes / 60;
};

/**
 * 解析工作开始时间字符串为Date对象
 */
export const parseWorkingStartDateTime = (
  workDate: Date,
  startTimeStr: string
): Date => {
  const [hours, minutes] = startTimeStr.split(":").map(Number);
  const startDateTime = new Date(workDate);
  startDateTime.setHours(hours, minutes, 0, 0);
  return startDateTime;
};

/**
 * 解析工作结束时间字符串为Date对象
 */
export const parseWorkingEndDateTime = (
  workDate: Date,
  endTimeStr: string
): Date => {
  const [hours, minutes] = endTimeStr.split(":").map(Number);
  const endDateTime = new Date(workDate);
  endDateTime.setHours(hours, minutes, 0, 0);
  return endDateTime;
};

/**
 * 检查当前时间是否在任一休息时间段内
 */
export const isInAnyBreakTime = (
  currentTime: Date,
  breakTimes: BreakTime[]
): boolean => {
  if (breakTimes.length === 0) return false;

  // 将当前时间转换为分钟数
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // 检查当前时间是否在任一休息时间段内
  return breakTimes.some((breakTime) => {
    // 将休息时间转换为分钟数
    const startTotalMinutes = convertTimeToMinutes(breakTime.startTime);
    const endTotalMinutes = convertTimeToMinutes(breakTime.endTime);

    // 当前时间在休息开始时间和结束时间之间
    return (
      currentTotalMinutes >= startTotalMinutes &&
      currentTotalMinutes <= endTotalMinutes
    );
  });
};

/**
 * 计算已经获得的工资
 */
export const calculateEarnedSalary = (params: SalaryParamsType): number => {
  // 直接使用calculateRealtimeSalary函数，保持逻辑一致
  return calculateRealtimeSalary(params);
};

/**
 * 缓存版本的实时工资计算 - 减少频繁计算资源消耗
 */
let cachedResult = {
  params: null as SalaryParamsType | null,
  lastCalculationTime: 0,
  lastResult: 0,
};

/**
 * 带缓存的实时工资计算函数 - 在短时间内重复调用时使用缓存结果
 * 如果参数相同且上次计算时间在500ms内，则直接返回缓存结果
 */
export const calculateRealtimeSalaryCached = (
  params: SalaryParamsType
): number => {
  const now = Date.now();

  // 检查是否可以使用缓存
  // 1. 缓存存在
  // 2. 参数没有变化
  // 3. 距离上次计算时间不超过500ms
  if (
    cachedResult.params &&
    now - cachedResult.lastCalculationTime < 500 &&
    areParamsEqual(params, cachedResult.params)
  ) {
    // 检查是否跨过整分钟或者整小时，如果是则强制重新计算
    const lastDate = new Date(cachedResult.lastCalculationTime);
    const currentDate = new Date(now);

    // 如果分钟或小时发生变化，不使用缓存
    if (
      lastDate.getMinutes() !== currentDate.getMinutes() ||
      lastDate.getHours() !== currentDate.getHours() ||
      lastDate.getDate() !== currentDate.getDate()
    ) {
      // 需要重新计算
    } else {
      return cachedResult.lastResult;
    }
  }

  // 需要重新计算
  const result = calculateRealtimeSalary(params);

  // 更新缓存
  cachedResult = {
    params: { ...params },
    lastCalculationTime: now,
    lastResult: result,
  };

  return result;
};

/**
 * 检查两个薪资参数对象是否相等
 */
function areParamsEqual(
  paramsA: SalaryParamsType,
  paramsB: SalaryParamsType
): boolean {
  // 检查基本属性
  const basicEqual =
    paramsA.monthlySalary === paramsB.monthlySalary &&
    paramsA.workingDaysPerMonth === paramsB.workingDaysPerMonth &&
    paramsA.restType === paramsB.restType &&
    paramsA.restTime === paramsB.restTime &&
    paramsA.workingStartTime === paramsB.workingStartTime &&
    paramsA.workingEndTime === paramsB.workingEndTime &&
    paramsA.workingDate instanceof Date &&
    paramsB.workingDate instanceof Date &&
    paramsA.workingDate.getTime() === paramsB.workingDate.getTime();

  if (!basicEqual) return false;

  // 检查休息时间数组
  if (paramsA.breakTimes.length !== paramsB.breakTimes.length) return false;

  // 检查每个休息时间段是否相同
  return paramsA.breakTimes.every((breakA, index) => {
    const breakB = paramsB.breakTimes[index];
    return (
      breakA.id === breakB.id &&
      breakA.startTime === breakB.startTime &&
      breakA.endTime === breakB.endTime
    );
  });
}

/**
 * 获取实时工资（精确到秒）
 */
export const calculateRealtimeSalary = (params: SalaryParamsType): number => {
  const {
    monthlySalary,
    workingDaysPerMonth,
    restType,
    workingDate,
    workingStartTime,
    workingEndTime,
    breakTimes,
  } = params;

  // 如果没有提供工作天数，使用根据休息类型计算的天数
  const actualWorkingDays =
    workingDaysPerMonth || calculateWorkingDaysPerMonth(restType);

  // 计算有效工作时长 (小时)
  const workingHours = calculateWorkingHours(
    workingStartTime,
    workingEndTime,
    params.restTime
  );

  // 计算每天、每小时工资
  const dailySalary = calculateDailySalary(monthlySalary, actualWorkingDays);
  const hourlySalary = calculateHourlySalary(dailySalary, workingHours);

  // 解析完整的开始和结束时间
  const startDateTime = parseWorkingStartDateTime(
    workingDate,
    workingStartTime
  );
  const endDateTime = parseWorkingEndDateTime(workingDate, workingEndTime);

  // 当前时间
  const now = new Date();

  // 如果还没到开始时间，返回0
  if (now < startDateTime) {
    return 0;
  }

  // 如果已经超过结束时间，返回全天工资
  if (now > endDateTime) {
    return dailySalary;
  }

  // 1. 计算从工作开始到现在的总时间（小时）
  const elapsedHours =
    (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

  // 2. 计算已经过去的休息时间（小时）
  let passedBreakHours = 0;

  for (const breakTime of breakTimes) {
    // 将休息时间转换为日期对象
    const breakStartTime = new Date(workingDate);
    breakStartTime.setHours(
      parseInt(breakTime.startTime.split(":")[0]),
      parseInt(breakTime.startTime.split(":")[1]),
      0,
      0
    );

    const breakEndTime = new Date(workingDate);
    breakEndTime.setHours(
      parseInt(breakTime.endTime.split(":")[0]),
      parseInt(breakTime.endTime.split(":")[1]),
      0,
      0
    );

    // 计算这个休息时间段和有效工作时间的交集

    // 确定交集的开始时间 - 取较晚的开始时间
    const intersectStart = new Date(
      Math.max(startDateTime.getTime(), breakStartTime.getTime())
    );

    // 确定交集的结束时间 - 取较早的结束时间
    const intersectEnd = new Date(
      Math.min(now.getTime(), breakEndTime.getTime())
    );

    // 如果存在交集（开始时间早于结束时间），则计算交集时长并添加到已过去的休息时间中
    if (intersectStart < intersectEnd) {
      const breakDuration =
        (intersectEnd.getTime() - intersectStart.getTime()) / (1000 * 60 * 60);
      passedBreakHours += breakDuration;
    }
  }

  // 3. 计算有效工作时间（总时间 - 休息时间）
  const effectiveWorkHours = Math.max(0, elapsedHours - passedBreakHours);

  // 4. 计算已经赚取的工资
  return hourlySalary * effectiveWorkHours;
};
