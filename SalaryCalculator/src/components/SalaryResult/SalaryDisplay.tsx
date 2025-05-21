import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Statistic, Row, Col, Progress, Typography, Divider, Tag, Tooltip, List } from 'antd';
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
import { calculateRealtimeSalaryCached, parseWorkingStartDateTime, parseWorkingEndDateTime, isInAnyBreakTime, calculateBreakDuration } from '@/utils/salaryCalculator';
import { formatCurrency, formatCurrencySimple } from '@/utils/dateUtils';
import useInterval from '@/hooks/useInterval';
import './SalaryDisplay.css';

const { Title } = Typography;

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
      formData.workingDate,
      formData.workingStartTime
    );
  }, [formData.workingDate, formData.workingStartTime]);
  
  // 解析结束工作时间
  const endDateTime = useMemo(() => {
    return parseWorkingEndDateTime(
      formData.workingDate,
      formData.workingEndTime
    );
  }, [formData.workingDate, formData.workingEndTime]);
  
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
  
  // 格式化开始时间
  const formattedStartDateTime = useMemo(() => {
    return formatDateTime(startDateTime);
  }, [startDateTime, formatDateTime]);
  
  // 格式化结束时间
  const formattedEndDateTime = useMemo(() => {
    return formatDateTime(endDateTime);
  }, [endDateTime, formatDateTime]);
  
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
    
    // 今天已经过的休息时间
    let todayRestMs = 0;
    
    // 当前是否在休息时间内
    const currentlyInRest = isInAnyBreakTime(currentTime, formData.breakTimes);
    
    if (currentlyInRest) {
      // 如果当前在休息时间内，计算到目前为止的休息时间
      const currentBreak = formData.breakTimes.find(breakTime => {
        const [startHours, startMinutes] = breakTime.startTime.split(':').map(Number);
        const [endHours, endMinutes] = breakTime.endTime.split(':').map(Number);
        
        const breakStartTotalMinutes = startHours * 60 + startMinutes;
        const breakEndTotalMinutes = endHours * 60 + endMinutes;
        
        const nowTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        
        const isOvernight = breakEndTotalMinutes < breakStartTotalMinutes;
        
        return isOvernight
          ? nowTotalMinutes >= breakStartTotalMinutes || nowTotalMinutes <= breakEndTotalMinutes
          : nowTotalMinutes >= breakStartTotalMinutes && nowTotalMinutes <= breakEndTotalMinutes;
      });
      
      if (currentBreak) {
        const [startHours, startMinutes] = currentBreak.startTime.split(':').map(Number);
        const nowHours = currentTime.getHours();
        const nowMinutes = currentTime.getMinutes();
        
        const breakStartTotalMinutes = startHours * 60 + startMinutes;
        const nowTotalMinutes = nowHours * 60 + nowMinutes;
        
        // 确保计算的是当前休息的时间，而不是全部休息时间
        todayRestMs = (nowTotalMinutes - breakStartTotalMinutes) * 60 * 1000;
        
        // 处理跨天情况
        if (nowTotalMinutes < breakStartTotalMinutes) {
          todayRestMs = ((24 * 60) - breakStartTotalMinutes + nowTotalMinutes) * 60 * 1000;
        }
      }
    } else {
      // 如果当前不在休息时间内，计算已经过去的所有休息时间
      formData.breakTimes.forEach(breakTime => {
        const [endHours, endMinutes] = breakTime.endTime.split(':').map(Number);
        const breakEndTotalMinutes = endHours * 60 + endMinutes;
        const nowTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        
        // 如果休息时间已经结束
        if (breakEndTotalMinutes < nowTotalMinutes) {
          todayRestMs += calculateBreakDuration(breakTime.startTime, breakTime.endTime) * 60 * 1000;
        }
      });
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
  }, [workTimeInfo, startDateTime, currentTime, formData.restTime, formData.breakTimes]);
  
  // 计算当天工作结束时间 - 只在相关formData变化时重算
  const workEndTimeInfo = useMemo(() => {
    // 直接使用结束时间的小时和分钟
    const endHours = endDateTime.getHours();
    const endMinutes = endDateTime.getMinutes();
    
    // 格式化工作结束时间
    const formattedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    return { 
      endHours, 
      endMinutes, 
      formattedEndTime 
    };
  }, [endDateTime]);
  
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
  
  // 格式化休息时间信息 - 只在formData变化时更新
  const breakTimeFormatInfo = useMemo(() => {
    // 格式化单个休息时间段
    const formatBreakTime = (startTime: string, endTime: string, duration: number) => {
      const durationStr = duration >= 60 
        ? `${Math.floor(duration / 60)}小时${duration % 60 > 0 ? `${duration % 60}分钟` : ''}`
        : `${duration}分钟`;
      
      return `${startTime} - ${endTime} (${durationStr})`;
    };
    
    // 对所有休息时间进行格式化
    const breakTimeItems = formData.breakTimes.map(breakTime => {
      const duration = calculateBreakDuration(breakTime.startTime, breakTime.endTime);
      return formatBreakTime(breakTime.startTime, breakTime.endTime, duration);
    });
    
    // 计算总休息时间并格式化
    const totalRestMinutes = formData.restTime;
    const totalRestStr = totalRestMinutes >= 60 
      ? `${Math.floor(totalRestMinutes / 60)}小时${totalRestMinutes % 60 > 0 ? `${totalRestMinutes % 60}分钟` : ''}`
      : `${totalRestMinutes}分钟`;
    
    return {
      breakTimeItems,
      totalRestStr
    };
  }, [formData.breakTimes, formData.restTime]);
  
  // 检查当前是否在休息时间内
  const currentlyInRest = useMemo(() => {
    return isInAnyBreakTime(currentTime, formData.breakTimes);
  }, [currentTime, formData.breakTimes]);
  
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
                    <Tag icon={<ClockCircleOutlined />} color="green">结束工作时间</Tag>
                    <div>{formattedEndDateTime}</div>
                  </div>
                </Col>
                
                <Col xs={24}>
                  <div className="time-info-item">
                    <Tag icon={<CoffeeOutlined />} color="orange">休息时间段</Tag>
                    <Tooltip title="休息期间不计入工资统计">
                      <div>
                        <List
                          size="small"
                          dataSource={breakTimeFormatInfo.breakTimeItems}
                          renderItem={(item) => (
                            <List.Item style={{ padding: '4px 0' }}>
                              {item}
                            </List.Item>
                          )}
                          footer={
                            <div style={{ fontWeight: 'bold' }}>
                              总休息时间: {breakTimeFormatInfo.totalRestStr}
                            </div>
                          }
                        />
                      </div>
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