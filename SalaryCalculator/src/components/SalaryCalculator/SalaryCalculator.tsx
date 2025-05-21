import { useState, useMemo, useCallback } from 'react';
import { Row, Col, Typography, Layout } from 'antd';
import SalaryForm from '@/components/SalaryForm';
import SalaryDisplay from '@/components/SalaryResult';
import SalaryChart from '@/components/SalaryChart';
import type { SalaryFormData } from '@/types/salary';
import type { SalaryParamsType } from '@/utils/salaryCalculator';
import { calculateDailySalary, calculateHourlySalary, calculateWorkingHours, calculateWorkingDaysPerMonth, calculateRealtimeSalaryCached, parseWorkingStartDateTime, parseWorkingEndDateTime, isInAnyBreakTime, calculateTotalBreakMinutes } from '@/utils/salaryCalculator';
import { v4 as uuidv4 } from 'uuid';
import './SalaryCalculator.css';

const { Title } = Typography;
const { Content } = Layout;

// 默认休息时间
const DEFAULT_BREAK_TIME = { id: uuidv4(), startTime: '12:00', endTime: '13:00' };

const SalaryCalculator: React.FC = () => {
  // 创建初始状态对象 - 提取到组件外部避免每次渲染重新创建
  const [formData, setFormData] = useState<SalaryFormData>(() => ({
    monthlySalary: 10000,
    workingDaysPerMonth: calculateWorkingDaysPerMonth('two'),
    restType: 'two',
    workingDate: new Date(),
    workingStartTime: '09:00',
    workingEndTime: '18:00',
    breakTimes: [DEFAULT_BREAK_TIME],
    restTime: calculateTotalBreakMinutes([DEFAULT_BREAK_TIME]),
    useCustomWorkingDays: false
  }));
  
  // 使用useCallback缓存函数，避免不必要的重渲染
  const handleFormChange = useCallback((values: SalaryFormData) => {
    setFormData(values);
  }, []);
  
  // 创建时间对象 - 只在相关依赖变化时重新计算
  const startDateTime = useMemo(() => {
    return parseWorkingStartDateTime(
      formData.workingDate, 
      formData.workingStartTime
    );
  }, [formData.workingDate, formData.workingStartTime]);
  
  // 创建结束时间对象
  const endDateTime = useMemo(() => {
    return parseWorkingEndDateTime(
      formData.workingDate,
      formData.workingEndTime
    );
  }, [formData.workingDate, formData.workingEndTime]);
  
  // 检查当前是否在休息时间内的函数
  const isInBreakTime = useCallback(() => {
    const now = new Date();
    return isInAnyBreakTime(now, formData.breakTimes);
  }, [formData.breakTimes]);
  
  // 获取工作时长（小时）
  const workingHours = useMemo(() => {
    return calculateWorkingHours(
      formData.workingStartTime,
      formData.workingEndTime,
      formData.restTime
    );
  }, [formData.workingStartTime, formData.workingEndTime, formData.restTime]);
  
  // 派生状态: 计算各种薪资 - 大量计算逻辑放在useMemo中避免重复计算
  const salaryStats = useMemo(() => {
    const { monthlySalary, workingDaysPerMonth } = formData;
    
    // 计算日薪、时薪等
    const actualWorkingDays = workingDaysPerMonth || calculateWorkingDaysPerMonth(formData.restType);
    const dailySalary = calculateDailySalary(monthlySalary, actualWorkingDays);
    const hourlySalary = calculateHourlySalary(dailySalary, workingHours);
    const minuteSalary = hourlySalary / 60;
    const secondSalary = minuteSalary / 60;
    
    // 创建完整的SalaryParams对象，用于计算
    const salaryParams: SalaryParamsType = {
      monthlySalary: formData.monthlySalary,
      workingDaysPerMonth: formData.workingDaysPerMonth,
      restType: formData.restType,
      workingDate: formData.workingDate,
      workingStartTime: formData.workingStartTime,
      workingEndTime: formData.workingEndTime,
      breakTimes: formData.breakTimes,
      restTime: formData.restTime
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
    const currentlyInRest = isInBreakTime();
    
    // 时间转换为小时的辅助函数
    const timeToHours = (hours: number, minutes: number) => hours + minutes / 60;
    
    // 将开始工作时间转为小时
    const startTimeHours = timeToHours(
      startDateTime.getHours(),
      startDateTime.getMinutes()
    );
    
    // 将结束工作时间转为小时
    const endTimeHours = timeToHours(
      endDateTime.getHours(),
      endDateTime.getMinutes()
    );
    
    // 将当前时间转为小时
    const currentTimeHours = timeToHours(now.getHours(), now.getMinutes());
    
    // 工作结束时间（小时）
    const workEndTimeHours = endTimeHours;
    
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
        // 计算有效工作时间（不包括休息时间）
        const effectiveWorkHours = workingHours;
        
        // 如果当前在休息时间内
        if (currentlyInRest) {
          // 计算过去的休息时间前的工作时间
          let workedHoursBeforeCurrentBreak = 0;
          
          // 找出当前所在的休息时间段
          const currentBreak = formData.breakTimes.find(breakTime => {
            const [startHours, startMinutes] = breakTime.startTime.split(':').map(Number);
            const [endHours, endMinutes] = breakTime.endTime.split(':').map(Number);
            
            const breakStartTotalMinutes = startHours * 60 + startMinutes;
            const breakEndTotalMinutes = endHours * 60 + endMinutes;
            
            const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
            
            const isOvernight = breakEndTotalMinutes < breakStartTotalMinutes;
            
            return isOvernight
              ? currentTotalMinutes >= breakStartTotalMinutes || currentTotalMinutes <= breakEndTotalMinutes
              : currentTotalMinutes >= breakStartTotalMinutes && currentTotalMinutes <= breakEndTotalMinutes;
          });
          
          if (currentBreak) {
            const breakStartHours = parseInt(currentBreak.startTime.split(':')[0]);
            const breakStartMinutes = parseInt(currentBreak.startTime.split(':')[1]);
            const breakStartTotalHours = timeToHours(breakStartHours, breakStartMinutes);
            
            workedHoursBeforeCurrentBreak = Math.max(0, breakStartTotalHours - startTimeHours);
            
            // 减去之前的休息时间
            formData.breakTimes.forEach(breakTime => {
              if (breakTime.id === currentBreak.id) return; // 跳过当前休息时间
              
              const otherBreakStartHours = parseInt(breakTime.startTime.split(':')[0]);
              const otherBreakStartMinutes = parseInt(breakTime.startTime.split(':')[1]);
              const otherBreakEndHours = parseInt(breakTime.endTime.split(':')[0]);
              const otherBreakEndMinutes = parseInt(breakTime.endTime.split(':')[1]);
              
              const otherBreakStartTotalHours = timeToHours(otherBreakStartHours, otherBreakStartMinutes);
              const otherBreakEndTotalHours = timeToHours(otherBreakEndHours, otherBreakEndMinutes);
              
              // 检查这个休息时间是否已结束且在当前休息时间之前
              if (otherBreakEndTotalHours <= breakStartTotalHours) {
                const breakDuration = (otherBreakEndTotalHours - otherBreakStartTotalHours);
                workedHoursBeforeCurrentBreak -= Math.max(0, breakDuration);
              }
            });
            
            percentCompleted = (workedHoursBeforeCurrentBreak / effectiveWorkHours) * 100;
          }
        } 
        // 不在休息时间内
        else {
          // 计算从开始到现在的总时间
          const totalHours = currentTimeHours - startTimeHours;
          
          // 减去已经过去的休息时间
          let pastBreakHours = 0;
          
          formData.breakTimes.forEach(breakTime => {
            const breakEndHours = parseInt(breakTime.endTime.split(':')[0]);
            const breakEndMinutes = parseInt(breakTime.endTime.split(':')[1]);
            const breakEndTotalHours = timeToHours(breakEndHours, breakEndMinutes);
            
            // 如果休息已经结束
            if (breakEndTotalHours < currentTimeHours) {
              const breakStartHours = parseInt(breakTime.startTime.split(':')[0]);
              const breakStartMinutes = parseInt(breakTime.startTime.split(':')[1]);
              const breakStartTotalHours = timeToHours(breakStartHours, breakStartMinutes);
              
              const breakDuration = breakEndTotalHours - breakStartTotalHours;
              pastBreakHours += Math.max(0, breakDuration);
            }
          });
          
          const effectiveHours = totalHours - pastBreakHours;
          percentCompleted = (effectiveHours / effectiveWorkHours) * 100;
        }
      }
    } else {
      // 如果不是同一天，显示100%
      percentCompleted = 100;
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
  }, [formData, startDateTime, endDateTime, isInBreakTime, workingHours]);
  
  // 转换为SalaryParams类型，以便传递给组件
  // 使用useMemo避免不必要的对象创建
  const salaryParams = useMemo<SalaryParamsType>(() => ({
    monthlySalary: formData.monthlySalary,
    workingDaysPerMonth: formData.workingDaysPerMonth,
    restType: formData.restType,
    workingDate: formData.workingDate,
    workingStartTime: formData.workingStartTime,
    workingEndTime: formData.workingEndTime,
    breakTimes: formData.breakTimes,
    restTime: formData.restTime
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