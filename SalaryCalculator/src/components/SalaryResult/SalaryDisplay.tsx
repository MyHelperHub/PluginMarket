import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Card, Statistic, Row, Col, Progress, Typography, Divider, Tag, Tooltip } from 'antd';
import { 
  DollarOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined,
  RiseOutlined,
  CoffeeOutlined,
  FieldTimeOutlined,
  PercentageOutlined,
  ScheduleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import type { SalaryParamsType } from '@/utils/salaryCalculator';
import { calculateRealtimeSalaryCached, parseWorkingStartDateTime } from '@/utils/salaryCalculator';
import { formatCurrency, formatCurrencySimple } from '@/utils/dateUtils';
import useInterval from '@/hooks/useInterval';
import './SalaryDisplay.css';

const { Text, Title } = Typography;

interface SalaryDisplayProps {
  formData: SalaryParamsType;
  salaryStats: {
    dailySalary: number;
    hourlySalary: number;
    minuteSalary: number;
    secondSalary: number;
    totalEarnedSalary: number;
    remainingSalary: number;
    percentCompleted: number;
  };
}

const SalaryDisplay = ({ formData, salaryStats }: SalaryDisplayProps) => {
  const [currentSalary, setCurrentSalary] = useState(salaryStats.totalEarnedSalary);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 解析开始工作时间 - 只在formData改变时重新计算
  const startDateTime = useMemo(() => {
    return parseWorkingStartDateTime(
      formData.workingStartDate,
      formData.workingStartTime
    );
  }, [formData.workingStartDate, formData.workingStartTime]);
  
  // 格式化时间方法
  const formatDateTime = useCallback((date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);
  
  // 格式化时间
  const formattedStartDateTime = useMemo(() => {
    return formatDateTime(startDateTime);
  }, [startDateTime, formatDateTime]);
  
  // 更新当前工资和时间的函数
  const updateSalaryAndTime = useCallback(() => {
    const salary = calculateRealtimeSalaryCached(formData);
    setCurrentSalary(salary);
    setCurrentTime(new Date());
  }, [formData]);
  
  // 使用React推荐的useInterval自定义Hook替代setInterval，更新频率为1秒一次
  useInterval(updateSalaryAndTime, 1000);
  
  // 首次渲染时立即更新一次
  useEffect(() => {
    updateSalaryAndTime();
  }, [updateSalaryAndTime]);

  // 计算已工作时间 - 避免频繁重算
  const workTimeInfo = useMemo(() => {
    // 计算已工作时间（毫秒）
    const workedTimeMs = Math.max(0, currentTime.getTime() - startDateTime.getTime());
    // 转换为天、小时、分钟
    const workedDays = Math.floor(workedTimeMs / (1000 * 60 * 60 * 24));
    const workedHours = Math.floor((workedTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const workedMinutes = Math.floor((workedTimeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // 格式化已工作时间字符串
    const workedTimeStr = `${workedDays}天 ${workedHours}小时 ${workedMinutes}分钟`;
    
    return {
      workedTimeMs,
      workedDays,
      workedHours,
      workedMinutes,
      workedTimeStr
    };
  }, [currentTime, startDateTime]);
  
  // 创建休息时间对象 - 只在formData变化时重算
  const restTimeObjects = useMemo(() => {
    const restStartTime = new Date();
    const [restStartHours, restStartMinutes] = formData.restStartTime.split(':').map(Number);
    restStartTime.setHours(restStartHours, restStartMinutes, 0, 0);
    
    const restEndTime = new Date();
    const [restEndHours, restEndMinutes] = formData.restEndTime.split(':').map(Number);
    restEndTime.setHours(restEndHours, restEndMinutes, 0, 0);
    
    return {
      restStartTime,
      restEndTime,
      restStartHours,
      restStartMinutes,
      restEndHours,
      restEndMinutes
    };
  }, [formData.restStartTime, formData.restEndTime]);
  
  // 计算有效工作时间 - 避免频繁重算
  const effectiveWorkTimeInfo = useMemo(() => {
    // 当前总工作时间
    const totalWorkMs = workTimeInfo.workedTimeMs;
    
    // 开始工作日期的日期部分
    const startDate = startDateTime.getDate();
    const startMonth = startDateTime.getMonth();
    const startYear = startDateTime.getFullYear();
    
    // 当前日期
    const nowDate = currentTime.getDate();
    const nowMonth = currentTime.getMonth();
    const nowYear = currentTime.getFullYear();
    
    // 计算总天数差 - 使用更准确的方法
    let daysDiff = 0;
    
    // 创建日期副本并设置为日期的开始（去掉时间部分）
    const startDateClone = new Date(startYear, startMonth, startDate);
    const nowDateClone = new Date(nowYear, nowMonth, nowDate);
    
    // 计算毫秒差再除以一天的毫秒数
    const msDiff = nowDateClone.getTime() - startDateClone.getTime();
    daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    
    // 计算每天的休息时间（毫秒）
    const restMsPerDay = formData.restTime * 60 * 1000;
    
    // 计算总休息时间（毫秒）
    let totalRestMs = daysDiff * restMsPerDay;
    
    // 如果是同一天开始工作，或者是工作的第一天
    const isWorkStartDay = startDate === nowDate && startMonth === nowMonth && startYear === nowYear;
    
    // 今天已经过的休息时间
    let todayRestMs = 0;
    
    const nowHours = currentTime.getHours();
    const nowMinutes = currentTime.getMinutes();
    const nowTotalMinutes = nowHours * 60 + nowMinutes;
    
    const startHours = startDateTime.getHours();
    const startMinutes = startDateTime.getMinutes();
    const startTotalMinutes = startHours * 60 + startMinutes;
    
    const { restStartHours, restStartMinutes, restEndHours, restEndMinutes } = restTimeObjects;
    const restStartTotalMinutes = restStartHours * 60 + restStartMinutes;
    const restEndTotalMinutes = restEndHours * 60 + restEndMinutes;
    
    // 如果当前时间在休息结束之后，且开始工作时间在休息开始之前
    if (nowTotalMinutes > restEndTotalMinutes && startTotalMinutes < restStartTotalMinutes) {
      todayRestMs = formData.restTime * 60 * 1000; // 全部休息时间
    } 
    // 如果当前时间在休息时间内
    else if (isInRestTime()) {
      // 如果开始工作时间在休息开始之后
      if (startTotalMinutes > restStartTotalMinutes) {
        // 从工作开始到现在的时间都是休息时间
        todayRestMs = (nowTotalMinutes - startTotalMinutes) * 60 * 1000;
      } else {
        // 从休息开始到现在的时间是休息时间
        todayRestMs = (nowTotalMinutes - restStartTotalMinutes) * 60 * 1000;
      }
      
      // 确保休息时间不超过总设定的休息时间
      todayRestMs = Math.min(todayRestMs, formData.restTime * 60 * 1000);
    } 
    // 如果当前时间在休息开始之前，没有休息时间
    else if (nowTotalMinutes < restStartTotalMinutes) {
      todayRestMs = 0;
    }
    
    // 计算总的有效工作时间
    const effectiveWorkMs = totalWorkMs - totalRestMs - todayRestMs;
    
    // 换算为更易读的时间单位
    const effectiveDays = Math.floor(effectiveWorkMs / (1000 * 60 * 60 * 24));
    const effectiveHours = Math.floor((effectiveWorkMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const effectiveMinutes = Math.floor((effectiveWorkMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // 格式化为字符串
    const effectiveTimeStr = `${effectiveDays}天 ${effectiveHours}小时 ${effectiveMinutes}分钟`;
    
    return {
      effectiveWorkMs,
      effectiveDays,
      effectiveHours,
      effectiveMinutes,
      effectiveTimeStr
    };
  }, [workTimeInfo, startDateTime, currentTime, formData.restTime, restTimeObjects, isInRestTime]);
  
  // 计算当天工作结束时间 - 只在相关formData变化时重算
  const workEndTimeInfo = useMemo(() => {
    // 直接使用小时和分钟计算，而不是创建新的Date对象
    const startHours = startDateTime.getHours();
    const startMinutes = startDateTime.getMinutes();
    
    // 工作时长(小时) + 休息时间(分钟转小时)
    const totalWorkDuration = formData.hoursPerDay + (formData.restTime / 60);
    
    // 计算结束小时和分钟
    let endHours = startHours + Math.floor(totalWorkDuration);
    let endMinutes = startMinutes + Math.round((totalWorkDuration % 1) * 60);
    
    // 处理分钟进位
    if (endMinutes >= 60) {
      endHours += Math.floor(endMinutes / 60);
      endMinutes %= 60;
    }
    
    // 处理24小时制
    if (endHours >= 24) {
      endHours %= 24;
    }
    
    // 格式化工作结束时间
    const formattedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    return { 
      endHours, 
      endMinutes, 
      formattedEndTime 
    };
  }, [startDateTime, formData.hoursPerDay, formData.restTime]);
  
  // 计算剩余工作时间 - 每次更新currentTime时更新
  const remainingTimeInfo = useMemo(() => {
    const { endHours, endMinutes } = workEndTimeInfo;
    let remainingWorkHours = 0;
    let remainingWorkMinutes = 0;
    
    const nowHours = currentTime.getHours();
    const nowMinutes = currentTime.getMinutes();
    
    // 将时间转换为分钟进行比较
    const nowTotalMinutes = nowHours * 60 + nowMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // 检查当前时间是否早于结束时间
    if (nowTotalMinutes < endTotalMinutes) {
      // 计算剩余分钟
      const remainingMinutes = endTotalMinutes - nowTotalMinutes;
      
      // 转换为小时和分钟
      remainingWorkHours = Math.floor(remainingMinutes / 60);
      remainingWorkMinutes = remainingMinutes % 60;
    }
    
    return { remainingWorkHours, remainingWorkMinutes };
  }, [currentTime, workEndTimeInfo]);
  
  // 格式化休息时间范围 - 只在formData变化时更新
  const restTimeFormatInfo = useMemo(() => {
    const { restStartHours, restStartMinutes, restEndHours, restEndMinutes } = restTimeObjects;
    
    // 直接格式化时间字符串，不创建Date对象
    const formatTimeString = (hours: number, minutes: number) => {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    const restStartTimeStr = formatTimeString(restStartHours, restStartMinutes);
    const restEndTimeStr = formatTimeString(restEndHours, restEndMinutes);
    
    const restTimeRangeStr = `${restStartTimeStr} - ${restEndTimeStr}`;
    
    return { restTimeRangeStr };
  }, [restTimeObjects]);
  
  // 计算并格式化休息时长 - 只在restTime变化时重算
  const restDurationInfo = useMemo(() => {
    const formatRestDuration = () => {
      const durationMinutes = formData.restTime;
      if (durationMinutes >= 60) {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
      }
      return `${durationMinutes}分钟`;
    };
    
    return { restDurationStr: formatRestDuration() };
  }, [formData.restTime]);
  
  // 检查当前是否在休息时间内 - 使用useCallback以便在其他计算中引用
  function isInRestTime(): boolean {
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const { restStartHours, restStartMinutes, restEndHours, restEndMinutes } = restTimeObjects;
    const restStartTotalMinutes = restStartHours * 60 + restStartMinutes;
    const restEndTotalMinutes = restEndHours * 60 + restEndMinutes;
    
    // 处理休息时间跨天的情况
    if (restEndTotalMinutes < restStartTotalMinutes) {
      // 跨天情况：检查是否在今天的休息开始后或明天的休息结束前
      return currentTotalMinutes >= restStartTotalMinutes || 
             currentTotalMinutes <= restEndTotalMinutes;
    }
    
    // 普通情况：直接判断是否在休息时间范围内
    return currentTotalMinutes >= restStartTotalMinutes && 
           currentTotalMinutes <= restEndTotalMinutes;
  }
  
  // 计算当前是否在休息时间
  const currentlyInRest = useMemo(() => {
    return isInRestTime();
  }, [currentTime]);
  
  // 渲染组件
  return (
    <Card
      title="实时工资统计"
      className="salary-display-card"
      bordered={false}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div className="main-salary-display">
            <Title level={2} className="salary-title">当前已赚取</Title>
            <div className="current-salary">
              {formatCurrencySimple(currentSalary)}
              {currentlyInRest && (
                <Tag color="orange" style={{ marginLeft: 8 }}>休息中</Tag>
              )}
            </div>
            <div className="progress-container">
              <div className="progress-label">
                <span>今日工作进度 <Tooltip title={`包含${formData.restTime}分钟休息时间`}><QuestionCircleOutlined /></Tooltip></span>
                <span className="progress-percentage">{salaryStats.percentCompleted.toFixed(2)}%</span>
              </div>
              <Progress
                percent={salaryStats.percentCompleted}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                format={() => ''}
                strokeWidth={12}
              />
              <div className="work-hours-info">
                <Tooltip title={`今日工作结束时间（包含${formData.restTime}分钟休息时间）`}>
                  <span className="end-time">
                    <ScheduleOutlined /> 下班时间: {workEndTimeInfo.formattedEndTime}
                  </span>
                </Tooltip>
                {(remainingTimeInfo.remainingWorkHours > 0 || remainingTimeInfo.remainingWorkMinutes > 0) && (
                  <Tooltip title="距离下班还剩时间">
                    <span className="remaining-time">
                      <ClockCircleOutlined /> 剩余: {remainingTimeInfo.remainingWorkHours}小时{remainingTimeInfo.remainingWorkMinutes}分钟
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>

            <Divider orientation="left">工作时间详情</Divider>
            
            <div className="work-time-info">
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12}>
                  <div className="time-info-item">
                    <Tag icon={<ClockCircleOutlined />} color="blue">开始工作时间</Tag>
                    <div>{formattedStartDateTime}</div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="time-info-item">
                    <Tag icon={<CoffeeOutlined />} color="orange">休息时间</Tag>
                    <Tooltip title="休息期间不计入工资统计">
                      <div>{restTimeFormatInfo.restTimeRangeStr} ({restDurationInfo.restDurationStr})</div>
                    </Tooltip>
                  </div>
                </Col>
                
                <Col xs={24} sm={12}>
                  <div className="time-info-item">
                    <Tag icon={<ClockCircleOutlined />} color="purple">已工作时长</Tag>
                    <Tooltip title="从开始工作到现在的总时长">
                      <div>{workTimeInfo.workedTimeStr}</div>
                    </Tooltip>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="time-info-item">
                    <Tag icon={<FieldTimeOutlined />} color="green">有效工作时长</Tag>
                    <Tooltip title="总工作时长减去休息时间">
                      <div>{effectiveWorkTimeInfo.effectiveTimeStr}</div>
                    </Tooltip>
                  </div>
                </Col>
                
                <Col xs={24} sm={12}>
                  <div className="time-info-item">
                    <Tag icon={<PercentageOutlined />} color="cyan">当天工作进度</Tag>
                    <div>{salaryStats.percentCompleted.toFixed(2)}%</div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="time-info-item">
                    <Tag icon={<DollarOutlined />} color="gold">时薪收入</Tag>
                    <div>{formatCurrency(salaryStats.hourlySalary)} / 小时</div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="日薪"
            value={salaryStats.dailySalary}
            precision={4}
            prefix={<CalendarOutlined />}
            suffix="元/天"
            className="salary-stat"
          />
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="时薪"
            value={salaryStats.hourlySalary}
            precision={4}
            prefix={<ClockCircleOutlined />}
            suffix="元/时"
            className="salary-stat"
          />
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="分钟薪资"
            value={salaryStats.minuteSalary}
            precision={4}
            prefix={<ClockCircleOutlined />}
            suffix="元/分"
            className="salary-stat"
          />
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="秒薪"
            value={salaryStats.secondSalary}
            precision={4}
            prefix={<RiseOutlined />}
            suffix="元/秒"
            className="salary-stat"
          />
        </Col>
      </Row>
    </Card>
  );
};

export default SalaryDisplay; 