import { useState, useMemo, useCallback } from 'react';
import { Row, Col, Typography, Layout } from 'antd';
import SalaryForm from '@/components/SalaryForm';
import SalaryDisplay from '@/components/SalaryResult';
import SalaryChart from '@/components/SalaryChart';
import type { SalaryFormData } from '@/types/salary';
import type { SalaryParamsType } from '@/utils/salaryCalculator';
import { calculateDailySalary, calculateHourlySalary, calculateWorkingDaysPerMonth, calculateRealtimeSalaryCached, parseWorkingStartDateTime } from '@/utils/salaryCalculator';
import './SalaryCalculator.css';

const { Title } = Typography;
const { Content } = Layout;

// 默认值
const DEFAULT_REST_START_TIME = '12:00';
const DEFAULT_REST_END_TIME = '13:00';

// 计算默认休息时长函数
const calculateRestDuration = (startTime: string, endTime: string): number => {
  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  
  // 处理跨天情况
  return endMinutes < startMinutes 
    ? (24 * 60 - startMinutes) + endMinutes 
    : endMinutes - startMinutes;
};

const SalaryCalculator: React.FC = () => {
  // 创建初始状态对象 - 提取到组件外部避免每次渲染重新创建
  const [formData, setFormData] = useState<SalaryFormData>(() => ({
    monthlySalary: 10000,
    workingDaysPerMonth: calculateWorkingDaysPerMonth('two'),
    restType: 'two',
    hoursPerDay: 8,
    workingStartDate: new Date(),
    workingStartTime: '09:00',
    restTime: calculateRestDuration(DEFAULT_REST_START_TIME, DEFAULT_REST_END_TIME),
    restStartTime: DEFAULT_REST_START_TIME,
    restEndTime: DEFAULT_REST_END_TIME,
    useCustomWorkingDays: false
  }));
  
  // 使用useCallback缓存函数，避免不必要的重渲染
  const handleFormChange = useCallback((values: SalaryFormData) => {
    setFormData(values);
  }, []);
  
  // 创建时间对象 - 只在相关依赖变化时重新计算
  const startDateTime = useMemo(() => {
    return parseWorkingStartDateTime(
      formData.workingStartDate, 
      formData.workingStartTime
    );
  }, [formData.workingStartDate, formData.workingStartTime]);
  
  // 创建休息时间对象
  const restTimeInfo = useMemo(() => {
    // 解析休息时间
    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours, minutes, totalMinutes: hours * 60 + minutes };
    };
    
    const restStart = parseTime(formData.restStartTime);
    const restEnd = parseTime(formData.restEndTime);
    
    // 考虑休息时间跨天的情况
    const isRestCrossingDay = restEnd.totalMinutes < restStart.totalMinutes;
    
    return {
      restStart,
      restEnd,
      isRestCrossingDay
    };
  }, [formData.restStartTime, formData.restEndTime]);
  
  // 检查当前是否在休息时间内的函数
  const isInRestTime = useCallback(() => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const { restStart, restEnd, isRestCrossingDay } = restTimeInfo;
    
    if (isRestCrossingDay) {
      // 跨天情况：检查是否在今天的休息开始后或明天的休息结束前
      return currentTotalMinutes >= restStart.totalMinutes || 
             currentTotalMinutes <= restEnd.totalMinutes;
    }
    
    // 普通情况：直接判断是否在休息时间范围内
    return currentTotalMinutes >= restStart.totalMinutes && 
           currentTotalMinutes <= restEnd.totalMinutes;
  }, [restTimeInfo]);
  
  // 派生状态: 计算各种薪资 - 大量计算逻辑放在useMemo中避免重复计算
  const salaryStats = useMemo(() => {
    const { monthlySalary, workingDaysPerMonth, hoursPerDay } = formData;
    
    // 计算日薪、时薪等
    const actualWorkingDays = workingDaysPerMonth || calculateWorkingDaysPerMonth(formData.restType);
    const dailySalary = calculateDailySalary(monthlySalary, actualWorkingDays);
    const hourlySalary = calculateHourlySalary(dailySalary, hoursPerDay);
    const minuteSalary = hourlySalary / 60;
    const secondSalary = minuteSalary / 60;
    
    // 创建完整的SalaryParams对象，用于计算
    const salaryParams: SalaryParamsType = {
      monthlySalary: formData.monthlySalary,
      workingDaysPerMonth: formData.workingDaysPerMonth,
      restType: formData.restType,
      hoursPerDay: formData.hoursPerDay,
      workingStartDate: formData.workingStartDate,
      workingStartTime: formData.workingStartTime,
      restTime: formData.restTime,
      restStartTime: formData.restStartTime,
      restEndTime: formData.restEndTime
    };
    
    // 使用实时计算函数计算已赚取工资
    const earnedSalary = calculateRealtimeSalaryCached(salaryParams);
    
    // 获取当前日期和时间
    const now = new Date();
    
    // 检查是否是同一天
    const isSameDay = 
      now.getFullYear() === startDateTime.getFullYear() && 
      now.getMonth() === startDateTime.getMonth() && 
      now.getDate() === startDateTime.getDate();
    
    // 当前是否在休息时间
    const currentlyInRest = isInRestTime();
    
    // 时间转换为小时的辅助函数
    const timeToHours = (hours: number, minutes: number) => hours + minutes / 60;
    
    // 将开始工作时间转为小时
    const startTimeHours = timeToHours(
      startDateTime.getHours(),
      startDateTime.getMinutes()
    );
    
    // 将当前时间转为小时
    const currentTimeHours = timeToHours(now.getHours(), now.getMinutes());
    
    // 将休息时间转为小时
    const restTimeHours = formData.restTime / 60;
    
    // 工作结束时间（小时）
    const workEndTimeHours = Math.min(24, startTimeHours + hoursPerDay + restTimeHours);
    
    // 计算进度百分比
    let percentCompleted = 0;
    
    if (isSameDay) {
      // 如果当前时间早于开始时间，进度为0
      if (currentTimeHours <= startTimeHours) {
        percentCompleted = 0;
      } 
      // 如果当前时间晚于结束时间，进度为100%
      else if (currentTimeHours >= workEndTimeHours) {
        percentCompleted = 100;
      } 
      // 在工作时间内
      else {
        const { restStart, restEnd, isRestCrossingDay } = restTimeInfo;
        const restStartHours = timeToHours(restStart.hours, restStart.minutes);
        const restEndHours = timeToHours(restEnd.hours, restEnd.minutes);
        
        // 当前在休息时间内
        if (currentlyInRest) {
          // 计算到休息开始前的进度
          if (currentTimeHours >= restStartHours && !isRestCrossingDay) {
            const effectiveWorkHoursBeforeRest = restStartHours - startTimeHours;
            percentCompleted = (effectiveWorkHoursBeforeRest / hoursPerDay) * 100;
          } else if (isRestCrossingDay && currentTimeHours <= restEndHours) {
            const effectiveWorkHoursBeforeRest = (24 - startTimeHours);
            percentCompleted = (effectiveWorkHoursBeforeRest / hoursPerDay) * 100;
          }
        } 
        // 已过休息时间
        else if (currentTimeHours > restEndHours && restEndHours > startTimeHours && !isRestCrossingDay) {
          const effectiveWorkHours = (currentTimeHours - startTimeHours) - restTimeHours;
          percentCompleted = (effectiveWorkHours / hoursPerDay) * 100;
        }
        // 在休息时间前或跨天情况
        else {
          const effectiveWorkHours = currentTimeHours - startTimeHours;
          percentCompleted = (effectiveWorkHours / hoursPerDay) * 100;
        }
      }
    } else {
      // 不是同一天的逻辑
      const todayStartHours = parseFloat(formData.workingStartTime.split(':')[0]) + 
                              parseFloat(formData.workingStartTime.split(':')[1]) / 60;
      const todayEndHours = todayStartHours + hoursPerDay + restTimeHours;
      
      if (currentTimeHours <= todayStartHours) {
        percentCompleted = 0;
      } else if (currentTimeHours >= todayEndHours) {
        percentCompleted = 100;
      } else {
        const { restStart } = restTimeInfo;
        const restStartHours = timeToHours(restStart.hours, restStart.minutes);
        
        if (currentlyInRest) {
          // 在休息时间内
          const effectiveWorkHoursBeforeRest = restStartHours - todayStartHours;
          percentCompleted = (effectiveWorkHoursBeforeRest / hoursPerDay) * 100;
        } else if (currentTimeHours > parseFloat(formData.restEndTime.split(':')[0]) + 
                                  parseFloat(formData.restEndTime.split(':')[1]) / 60) {
          // 在休息时间后
          const effectiveWorkHours = (currentTimeHours - todayStartHours) - restTimeHours;
          percentCompleted = (effectiveWorkHours / hoursPerDay) * 100;
        } else {
          // 在休息时间前
          const effectiveWorkHours = currentTimeHours - todayStartHours;
          percentCompleted = (effectiveWorkHours / hoursPerDay) * 100;
        }
      }
    }
    
    // 确保百分比在0-100范围内
    percentCompleted = Math.max(0, Math.min(100, percentCompleted));
    
    const remainingSalary = Math.max(0, monthlySalary - earnedSalary);
    
    return {
      dailySalary,
      hourlySalary,
      minuteSalary,
      secondSalary,
      monthlyWorkingDays: actualWorkingDays,
      totalEarnedSalary: earnedSalary,
      currentEarnedSalary: earnedSalary,
      remainingSalary,
      percentCompleted
    };
  }, [formData, startDateTime, isInRestTime, restTimeInfo]);
  
  // 转换为SalaryParams类型，以便传递给组件
  // 使用useMemo避免不必要的对象创建
  const salaryParams = useMemo<SalaryParamsType>(() => ({
    monthlySalary: formData.monthlySalary,
    workingDaysPerMonth: formData.workingDaysPerMonth,
    restType: formData.restType,
    hoursPerDay: formData.hoursPerDay,
    workingStartDate: formData.workingStartDate,
    workingStartTime: formData.workingStartTime,
    restTime: formData.restTime,
    restStartTime: formData.restStartTime,
    restEndTime: formData.restEndTime
  }), [formData]);

  // 使用React.memo包装子组件，避免不必要的重渲染
  return (
    <Layout className="salary-calculator">
      <Content className="calculator-content">
        <Title level={2} className="page-title">实时工资计算器</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <SalaryForm onValuesChange={handleFormChange} />
          </Col>
          <Col xs={24} lg={16}>
            <SalaryDisplay 
              formData={salaryParams}
              salaryStats={salaryStats}
            />
            <SalaryChart 
              salaryStats={salaryStats}
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default SalaryCalculator; 