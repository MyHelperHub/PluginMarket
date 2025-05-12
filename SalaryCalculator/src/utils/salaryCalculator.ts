/**
 * 工资计算工具函数
 */

export interface SalaryParams {
  monthlySalary: number;
  workingDaysPerMonth: number | null;
  restType: "one" | "two"; // 'one' 表示单休, 'two' 表示双休
  hoursPerDay: number;
  workingStartDate: Date;
  workingStartTime: string; // 格式 "HH:mm"
  restTime: number; // 休息时间（分钟）
  restStartTime: string; // 休息开始时间，格式 "HH:mm"
  restEndTime: string; // 休息结束时间，格式 "HH:mm"
}

// 导出类型，便于模块导入
type SalaryParamsType = SalaryParams;
export type { SalaryParamsType };

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
  hoursPerDay: number
): number => {
  return dailySalary / hoursPerDay;
};

/**
 * 解析工作开始时间字符串为Date对象
 */
export const parseWorkingStartDateTime = (
  startDate: Date,
  startTimeStr: string
): Date => {
  const [hours, minutes] = startTimeStr.split(":").map(Number);
  const startDateTime = new Date(startDate);
  startDateTime.setHours(hours, minutes, 0, 0);
  return startDateTime;
};

/**
 * 计算已经工作的时间（考虑休息时间）
 * @returns 工作时间（小时）
 */
export const calculateWorkedHours = (
  startDateTime: Date,
  restMinutes: number
): number => {
  const now = new Date();

  // 如果还没到开始时间，返回0
  if (now < startDateTime) {
    return 0;
  }

  // 总时间差（毫秒）
  const totalTimeDiff = now.getTime() - startDateTime.getTime();

  // 计算工作日数（整天）
  const dayDiff = Math.floor(totalTimeDiff / (1000 * 60 * 60 * 24));

  // 计算当天工作的小时数
  const remainingMsDiff = totalTimeDiff % (1000 * 60 * 60 * 24);
  const currentDayHours = remainingMsDiff / (1000 * 60 * 60);

  // 计算总休息时间（小时）
  const totalRestHours =
    (dayDiff * restMinutes +
      (dayDiff > 0
        ? restMinutes
        : Math.min(restMinutes, remainingMsDiff / (1000 * 60)))) /
    60;

  // 总工作时间 = 总时间 - 总休息时间
  const totalWorkHours = totalTimeDiff / (1000 * 60 * 60) - totalRestHours;

  return Math.max(0, totalWorkHours);
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
  return (
    paramsA.monthlySalary === paramsB.monthlySalary &&
    paramsA.workingDaysPerMonth === paramsB.workingDaysPerMonth &&
    paramsA.restType === paramsB.restType &&
    paramsA.hoursPerDay === paramsB.hoursPerDay &&
    paramsA.restTime === paramsB.restTime &&
    paramsA.restStartTime === paramsB.restStartTime &&
    paramsA.restEndTime === paramsB.restEndTime &&
    paramsA.workingStartTime === paramsB.workingStartTime &&
    paramsA.workingStartDate instanceof Date &&
    paramsB.workingStartDate instanceof Date &&
    paramsA.workingStartDate.getTime() === paramsB.workingStartDate.getTime()
  );
}

/**
 * 获取实时工资（精确到秒）
 */
export const calculateRealtimeSalary = (params: SalaryParamsType): number => {
  const {
    monthlySalary,
    workingDaysPerMonth,
    restType,
    hoursPerDay,
    workingStartDate,
    workingStartTime,
    restTime,
    restStartTime,
    restEndTime,
  } = params;

  // 解析日期和时间到数字，避免重复解析
  const parseTime = (
    timeStr: string
  ): { hours: number; minutes: number; totalMinutes: number } => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
    };
  };

  // 如果没有提供工作天数，使用根据休息类型计算的天数
  const actualWorkingDays =
    workingDaysPerMonth || calculateWorkingDaysPerMonth(restType);

  const dailySalary = calculateDailySalary(monthlySalary, actualWorkingDays);
  const hourlySalary = calculateHourlySalary(dailySalary, hoursPerDay);

  // 解析完整的开始时间
  const startDateTime = parseWorkingStartDateTime(
    workingStartDate,
    workingStartTime
  );

  // 当前时间
  const now = new Date();

  // 如果还没到开始时间，返回0
  if (now < startDateTime) {
    return 0;
  }

  // 解析休息时间
  const restStartData = parseTime(restStartTime);
  const restEndData = parseTime(restEndTime);

  // 创建今天的休息时间对象 - 优化为只创建必要的对象
  const now_hours = now.getHours();
  const now_minutes = now.getMinutes();
  const now_totalMinutes = now_hours * 60 + now_minutes;

  const start_hours = startDateTime.getHours();
  const start_minutes = startDateTime.getMinutes();
  const start_totalMinutes = start_hours * 60 + start_minutes;

  // 检查是否是跨天休息
  const isRestCrossingDay =
    restEndData.totalMinutes < restStartData.totalMinutes;

  // 检查当前是否在休息时间内 - 优化计算逻辑
  const isInRestTime = isRestCrossingDay
    ? now_totalMinutes >= restStartData.totalMinutes ||
      now_totalMinutes <= restEndData.totalMinutes
    : now_totalMinutes >= restStartData.totalMinutes &&
      now_totalMinutes <= restEndData.totalMinutes;

  // 如果当前在休息时间内
  if (isInRestTime) {
    // 如果工作开始时间在今天的休息时间之后，直接计算从工作开始到当前的收入
    if (start_totalMinutes >= restEndData.totalMinutes) {
      // 计算时间差（小时）
      const hours =
        (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      return hourlySalary * hours;
    }

    // 如果工作开始时间在休息时间之前，只计算到休息开始的收入
    if (start_totalMinutes < restStartData.totalMinutes) {
      // 创建休息开始时间对象
      const restStartDateTime = new Date(now);
      restStartDateTime.setHours(
        restStartData.hours,
        restStartData.minutes,
        0,
        0
      );

      // 如果休息开始时间在今天之前，说明已经过了一天，需要调整日期
      if (
        startDateTime.getDate() !== now.getDate() ||
        startDateTime.getMonth() !== now.getMonth() ||
        startDateTime.getFullYear() !== now.getFullYear()
      ) {
        // 如果是不同天，我们需要正确计算工作日
        // 使用开始日期的时间点
        restStartDateTime.setFullYear(
          startDateTime.getFullYear(),
          startDateTime.getMonth(),
          startDateTime.getDate()
        );
      }

      // 计算从工作开始到休息开始的小时数
      const hours =
        (restStartDateTime.getTime() - startDateTime.getTime()) /
        (1000 * 60 * 60);
      return hourlySalary * Math.max(0, hours);
    }

    // 如果工作开始时间在休息时间内，则到现在为止未产生收入
    return 0;
  }

  // 如果当前不在休息时间内

  // 如果工作开始在休息前，现在在休息后
  if (
    start_totalMinutes < restStartData.totalMinutes &&
    now_totalMinutes > restEndData.totalMinutes
  ) {
    // 创建休息时间对象
    const restStartDateTime = new Date(now);
    restStartDateTime.setHours(
      restStartData.hours,
      restStartData.minutes,
      0,
      0
    );

    const restEndDateTime = new Date(now);
    restEndDateTime.setHours(restEndData.hours, restEndData.minutes, 0, 0);

    // 处理跨天日期问题
    if (
      startDateTime.getDate() !== now.getDate() ||
      startDateTime.getMonth() !== now.getMonth() ||
      startDateTime.getFullYear() !== now.getFullYear()
    ) {
      // 如果是不同天，使用工作开始日的日期作为基准
      restStartDateTime.setFullYear(
        startDateTime.getFullYear(),
        startDateTime.getMonth(),
        startDateTime.getDate()
      );

      // 对于休息结束时间，如果是跨天的，需要设置为下一天
      restEndDateTime.setFullYear(
        startDateTime.getFullYear(),
        startDateTime.getMonth(),
        startDateTime.getDate()
      );

      // 如果是跨天休息，调整结束日期
      if (isRestCrossingDay) {
        restEndDateTime.setDate(restEndDateTime.getDate() + 1);
      }
    } else {
      // 同一天的情况，如果休息时间是跨天的，需要调整结束日期
      if (isRestCrossingDay && restEndDateTime < restStartDateTime) {
        restEndDateTime.setDate(restEndDateTime.getDate() + 1);
      }
    }

    // 计算休息前的有效工作时间（小时）
    const hoursBeforeRest =
      (restStartDateTime.getTime() - startDateTime.getTime()) /
      (1000 * 60 * 60);

    // 计算休息后的有效工作时间（小时）
    const hoursAfterRest =
      (now.getTime() - restEndDateTime.getTime()) / (1000 * 60 * 60);

    // 总收入 = 休息前收入 + 休息后收入
    return (
      hourlySalary *
      (Math.max(0, hoursBeforeRest) + Math.max(0, hoursAfterRest))
    );
  }

  // 简化逻辑：如果不属于以上特殊情况，直接计算总时间
  const totalHours =
    (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  return hourlySalary * totalHours;
};
