import { useEffect, useState } from 'react';
import { Form, InputNumber, DatePicker, Radio, Switch, Card, Tooltip, TimePicker, Row, Col, Button, List, message } from 'antd';
import { 
  DollarOutlined, 
  CalendarOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type { BreakTime, SalaryFormData } from '@/types/salary';
import { calculateWorkingDaysPerMonth, calculateTotalBreakMinutes, isTimeInWorkRange } from '@/utils/salaryCalculator';
import './SalaryForm.css';

interface SalaryFormProps {
  onValuesChange: (values: SalaryFormData) => void;
}

// 将字符串时间转为总分钟数
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 将分钟数转为小时和分钟
const minutesToTime = (totalMinutes: number): { hours: number, minutes: number } => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return { hours, minutes };
};

// 检查两个时间段是否重叠
const isTimeOverlap = (
  startA: number, 
  endA: number, 
  startB: number, 
  endB: number
): boolean => {
  // 由于没有跨天需求，直接使用标准的重叠判断
  // 两个时间段重叠的条件：一个时间段的开始时间小于另一个时间段的结束时间，
  // 并且这个时间段的结束时间大于另一个时间段的开始时间
  return Math.max(startA, startB) < Math.min(endA, endB);
};

const SalaryForm = ({ onValuesChange }: SalaryFormProps) => {
  const [form] = Form.useForm();
  const [useCustomWorkingDays, setUseCustomWorkingDays] = useState(false);
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([
    { id: uuidv4(), startTime: '12:00', endTime: '13:00' }
  ]);
  
  const initialValues: SalaryFormData = {
    monthlySalary: 10000,
    workingDaysPerMonth: null,
    restType: 'two',
    workingDate: new Date(),
    workingStartTime: '09:00',
    workingEndTime: '18:00',
    breakTimes: [{ id: uuidv4(), startTime: '12:00', endTime: '13:00' }],
    restTime: 60, // 默认休息1小时
    useCustomWorkingDays: false
  };
  
  // 计算默认工作天数并设置
  useEffect(() => {
    if (!useCustomWorkingDays) {
      const restType = form.getFieldValue('restType');
      const workingDays = calculateWorkingDaysPerMonth(restType);
      form.setFieldValue('workingDaysPerMonth', workingDays);
    }
  }, [form, useCustomWorkingDays]);
  
  // 获取当前工作时间范围
  const getWorkingTimeRange = () => {
    const workStartTime = form.getFieldValue('workingStartTime')?.format('HH:mm') || '09:00';
    const workEndTime = form.getFieldValue('workingEndTime')?.format('HH:mm') || '18:00';
    
    return {
      start: timeToMinutes(workStartTime),
      end: timeToMinutes(workEndTime),
    };
  };
  
  // 获取禁用的小时
  const getDisabledHours = (breakId: string, type: 'start' | 'end', currentTime?: string): number[] => {
    const workTime = getWorkingTimeRange();
    const disabledHours = [];
    
    // 工作时间范围之外的小时禁用
    for (let i = 0; i < 24; i++) {
      const workStartHour = Math.floor(workTime.start / 60);
      const workEndHour = Math.floor(workTime.end / 60);
      
      if (i < workStartHour || i > workEndHour) {
        disabledHours.push(i);
      }
    }
    
    // 获取当前正在编辑的时间段的值
    let currentBreakStart = 0;
    let currentBreakEnd = 0;
    
    if (currentTime) {
      // 如果有当前值，使用当前值
      if (type === 'start') {
        currentBreakStart = timeToMinutes(currentTime);
        const endTime = breakTimes.find(b => b.id === breakId)?.endTime;
        currentBreakEnd = endTime ? timeToMinutes(endTime) : currentBreakStart + 60;
      } else {
        currentBreakEnd = timeToMinutes(currentTime);
        const startTime = breakTimes.find(b => b.id === breakId)?.startTime;
        currentBreakStart = startTime ? timeToMinutes(startTime) : currentBreakEnd - 60;
      }
    } else {
      // 否则使用已保存的值
      const breakTime = breakTimes.find(b => b.id === breakId);
      if (breakTime) {
        currentBreakStart = timeToMinutes(breakTime.startTime);
        currentBreakEnd = timeToMinutes(breakTime.endTime);
      }
    }
    
    // 检查其他休息时间是否有重叠
    for (const breakTime of breakTimes) {
      if (breakTime.id === breakId) continue; // 跳过当前编辑的休息时间
      
      const otherBreakStart = timeToMinutes(breakTime.startTime);
      const otherBreakEnd = timeToMinutes(breakTime.endTime);
      
      // 检查每个小时是否和其他休息时间重叠
      for (let i = 0; i < 24; i++) {
        const hourStart = i * 60;
        const hourEnd = (i + 1) * 60 - 1;
        
        // 检查当前小时是否和其他休息时间重叠
        if (type === 'start') {
          // 对于开始时间，测试以这个小时为起点，到当前设置的结束时间是否与其他休息时间重叠
          const testStart = hourStart;
          const testEnd = currentBreakEnd;
          
          if (isTimeOverlap(testStart, testEnd, otherBreakStart, otherBreakEnd)) {
            disabledHours.push(i);
          }
        } else {
          // 对于结束时间，测试从当前设置的开始时间到这个小时是否与其他休息时间重叠
          const testStart = currentBreakStart;
          const testEnd = hourEnd;
          
          if (isTimeOverlap(testStart, testEnd, otherBreakStart, otherBreakEnd)) {
            disabledHours.push(i);
          }
        }
      }
    }
    
    return disabledHours;
  };
  
  // 获取禁用的分钟
  const getDisabledMinutes = (hour: number, breakId: string, type: 'start' | 'end', currentTime?: string): number[] => {
    const workTime = getWorkingTimeRange();
    const disabledMinutes = [];
    
    // 处理工作时间边界
    const workStartHour = Math.floor(workTime.start / 60);
    const workStartMinute = workTime.start % 60;
    const workEndHour = Math.floor(workTime.end / 60);
    const workEndMinute = workTime.end % 60;
    
    // 工作时间范围边界的分钟禁用
    if (hour === workStartHour) {
      // 当前小时是工作开始小时，禁用开始分钟之前的分钟
      for (let i = 0; i < workStartMinute; i++) {
        disabledMinutes.push(i);
      }
    } else if (hour === workEndHour) {
      // 当前小时是工作结束小时，禁用结束分钟之后的分钟
      for (let i = workEndMinute + 1; i < 60; i++) {
        disabledMinutes.push(i);
      }
    }
    
    // 获取当前正在编辑的时间段的值
    let currentBreakStart = 0;
    let currentBreakEnd = 0;
    
    if (currentTime) {
      // 如果有当前值，使用当前值
      if (type === 'start') {
        currentBreakStart = timeToMinutes(currentTime);
        const endTime = breakTimes.find(b => b.id === breakId)?.endTime;
        currentBreakEnd = endTime ? timeToMinutes(endTime) : currentBreakStart + 60;
      } else {
        currentBreakEnd = timeToMinutes(currentTime);
        const startTime = breakTimes.find(b => b.id === breakId)?.startTime;
        currentBreakStart = startTime ? timeToMinutes(startTime) : currentBreakEnd - 60;
      }
    } else {
      // 否则使用已保存的值
      const breakTime = breakTimes.find(b => b.id === breakId);
      if (breakTime) {
        currentBreakStart = timeToMinutes(breakTime.startTime);
        currentBreakEnd = timeToMinutes(breakTime.endTime);
      }
    }
    
    // 处理时间重叠
    for (const breakTime of breakTimes) {
      if (breakTime.id === breakId) continue; // 跳过当前编辑的休息时间
      
      const otherBreakStart = timeToMinutes(breakTime.startTime);
      const otherBreakEnd = timeToMinutes(breakTime.endTime);
      
      // 检查每个分钟是否和其他休息时间重叠
      for (let i = 0; i < 60; i += 5) { // 按5分钟步进，与TimePicker的minuteStep一致
        const minuteStart = hour * 60 + i;
        const minuteEnd = hour * 60 + i + 4; // 考虑5分钟的间隔
        
        // 检查当前分钟是否和其他休息时间重叠
        if (type === 'start') {
          // 对于开始时间，测试以这个分钟为起点，到当前设置的结束时间是否与其他休息时间重叠
          const testStart = minuteStart;
          const testEnd = currentBreakEnd;
          
          if (isTimeOverlap(testStart, testEnd, otherBreakStart, otherBreakEnd)) {
            disabledMinutes.push(i);
            // 同时禁用这个5分钟块内的所有分钟
            for (let j = 1; j < 5; j++) {
              if (i + j < 60 && !disabledMinutes.includes(i + j)) {
                disabledMinutes.push(i + j);
              }
            }
          }
        } else {
          // 对于结束时间，测试从当前设置的开始时间到这个分钟是否与其他休息时间重叠
          const testStart = currentBreakStart;
          const testEnd = minuteEnd;
          
          if (isTimeOverlap(testStart, testEnd, otherBreakStart, otherBreakEnd)) {
            disabledMinutes.push(i);
            // 同时禁用这个5分钟块内的所有分钟
            for (let j = 1; j < 5; j++) {
              if (i + j < 60 && !disabledMinutes.includes(i + j)) {
                disabledMinutes.push(i + j);
              }
            }
          }
        }
      }
    }
    
    return disabledMinutes;
  };
  
  // 生成disabledTime函数
  const getDisabledTime = (breakId: string, type: 'start' | 'end') => {
    return (date: Dayjs) => {
      // 获取当前所选时间
      const currentValue = date ? date.format('HH:mm') : undefined;
      
      return {
        disabledHours: () => getDisabledHours(breakId, type, currentValue),
        disabledMinutes: (selectedHour: number) => 
          getDisabledMinutes(selectedHour, breakId, type, currentValue),
      };
    };
  };
  
  // 添加一个新的休息时间段
  const addBreakTime = () => {
    if (breakTimes.length >= 5) {
      message.warning('最多只能添加5个休息时间');
      return;
    }
    
    // 获取工作时间范围
    const workTime = getWorkingTimeRange();
    const workStartMinutes = workTime.start;
    const workEndMinutes = workTime.end;
    
    // 创建一个时间占用图 (每15分钟为一个刻度)
    const totalWorkMinutes = workEndMinutes - workStartMinutes;
    const timeSlots = new Array(Math.ceil(totalWorkMinutes / 15) + 1).fill(false);
    
    // 标记已被占用的时间段
    for (const breakTime of breakTimes) {
      const breakStartMinutes = timeToMinutes(breakTime.startTime);
      const breakEndMinutes = timeToMinutes(breakTime.endTime);
      
      // 将休息时间段起始点转换为相对于工作时间起始点的偏移
      const startSlot = Math.max(0, Math.floor((breakStartMinutes - workStartMinutes) / 15));
      const endSlot = Math.min(timeSlots.length - 1, Math.ceil((breakEndMinutes - workStartMinutes) / 15));
      
      for (let i = startSlot; i <= endSlot; i++) {
        timeSlots[i] = true;
      }
    }
    
    // 寻找至少4个连续空闲槽位 (60分钟)
    const requiredSlots = 4; // 1小时 = 4个15分钟的时间段
    let freeStartSlot = -1;
    
    for (let i = 0; i < timeSlots.length - requiredSlots + 1; i++) {
      let consecutive = 0;
      for (let j = 0; j < requiredSlots; j++) {
        if (!timeSlots[i + j]) {
          consecutive++;
        } else {
          break;
        }
      }
      
      if (consecutive === requiredSlots) {
        freeStartSlot = i;
        break;
      }
    }
    
    let newStartTime = '12:00'; // 默认值
    let newEndTime = '13:00'; // 默认值
    
    if (freeStartSlot !== -1) {
      // 找到了空闲时间段
      // 计算开始时间（相对于工作开始时间的偏移）
      const startMinutes = workStartMinutes + freeStartSlot * 15;
      
      // 计算结束时间 (开始时间 + 60分钟)
      const endMinutes = Math.min(startMinutes + 60, workEndMinutes);
      
      // 转换为小时和分钟
      const startTime = minutesToTime(startMinutes);
      const endTime = minutesToTime(endMinutes);
      
      // 格式化为 "HH:mm" 字符串
      newStartTime = `${String(startTime.hours).padStart(2, '0')}:${String(startTime.minutes).padStart(2, '0')}`;
      newEndTime = `${String(endTime.hours).padStart(2, '0')}:${String(endTime.minutes).padStart(2, '0')}`;
    } else {
      // 如果找不到适合的时间段，显示提示消息
      message.warning('没有找到足够的空闲时间段，请先调整现有休息时间');
      return;
    }
    
    // 创建新的休息时间
    const newBreakTime: BreakTime = {
      id: uuidv4(),
      startTime: newStartTime,
      endTime: newEndTime
    };
    
    // 添加到列表中
    const newBreakTimes = [...breakTimes, newBreakTime];
    setBreakTimes(newBreakTimes);
    
    // 计算并更新总休息时间
    updateTotalRestTime(newBreakTimes);
    
    // 触发表单变化事件，通知父组件
    handleBreakTimesChange(newBreakTimes);
  };
  
  // 删除一个休息时间段
  const removeBreakTime = (id: string) => {
    const newBreakTimes = breakTimes.filter(item => item.id !== id);
    setBreakTimes(newBreakTimes);
    
    // 计算并更新总休息时间
    updateTotalRestTime(newBreakTimes);
    
    // 触发表单变化事件，通知父组件
    handleBreakTimesChange(newBreakTimes);
  };
  
  // 更新休息时间段
  const updateBreakTime = (id: string, field: 'startTime' | 'endTime', value: dayjs.Dayjs | null) => {
    if (!value) return;
    
    const timeValue = value.format('HH:mm');
    const workingStartTime = form.getFieldValue('workingStartTime').format('HH:mm');
    const workingEndTime = form.getFieldValue('workingEndTime').format('HH:mm');
    
    // 检查是否在工作时间范围内
    if (!isTimeInWorkRange(timeValue, workingStartTime, workingEndTime)) {
      message.warning('休息时间必须在工作时间范围内');
      return;
    }
    
    // 获取当前正在编辑的休息时间
    const currentBreak = breakTimes.find(item => item.id === id);
    if (!currentBreak) return;
    
    // 创建更新后的休息时间
    const updatedBreak = { 
      ...currentBreak, 
      [field]: timeValue 
    };
    
    // 如果是更新开始时间，确保开始时间早于结束时间
    if (field === 'startTime') {
      const startMinutes = timeToMinutes(timeValue);
      const endMinutes = timeToMinutes(updatedBreak.endTime);
      
      if (startMinutes >= endMinutes) {
        // 如果开始时间不早于结束时间，自动调整结束时间
        const newEndMinutes = Math.min(startMinutes + 60, 24 * 60 - 1);
        const newEndTime = minutesToTime(newEndMinutes);
        updatedBreak.endTime = `${String(newEndTime.hours).padStart(2, '0')}:${String(newEndTime.minutes).padStart(2, '0')}`;
        message.info('已自动调整结束时间，使其在开始时间后1小时');
      }
    }
    
    // 如果是更新结束时间，确保结束时间晚于开始时间
    if (field === 'endTime') {
      const startMinutes = timeToMinutes(updatedBreak.startTime);
      const endMinutes = timeToMinutes(timeValue);
      
      if (endMinutes <= startMinutes) {
        message.warning('结束时间必须晚于开始时间');
        return;
      }
    }
    
    // 检查更新后的休息时间是否与其他休息时间重叠
    const updatedBreakStart = timeToMinutes(updatedBreak.startTime);
    const updatedBreakEnd = timeToMinutes(updatedBreak.endTime);
    
    for (const breakTime of breakTimes) {
      if (breakTime.id === id) continue; // 跳过当前正在编辑的休息时间
      
      const otherBreakStart = timeToMinutes(breakTime.startTime);
      const otherBreakEnd = timeToMinutes(breakTime.endTime);
      
      // 检查是否有重叠
      if (isTimeOverlap(updatedBreakStart, updatedBreakEnd, otherBreakStart, otherBreakEnd)) {
        message.error('休息时间不能与其他休息时间重叠');
        return;
      }
    }
    
    // 更新休息时间数组
    const newBreakTimes = breakTimes.map(item => {
      if (item.id === id) {
        return updatedBreak;
      }
      return item;
    });
    
    setBreakTimes(newBreakTimes);
    
    // 计算并更新总休息时间
    updateTotalRestTime(newBreakTimes);
    
    // 触发表单变化事件，通知父组件
    handleBreakTimesChange(newBreakTimes);
  };
  
  // 计算并更新总休息时间
  const updateTotalRestTime = (breaks: BreakTime[]) => {
    const totalRestMinutes = calculateTotalBreakMinutes(breaks);
    form.setFieldValue('restTime', totalRestMinutes);
  };
  
  // 当休息时间变化时通知父组件
  const handleBreakTimesChange = (newBreakTimes: BreakTime[]) => {
    const allValues = form.getFieldsValue();
    const totalRestMinutes = calculateTotalBreakMinutes(newBreakTimes);
    
    // 合并并格式化所有值
    const formattedValues = {
      ...allValues,
      workingDate: allValues.workingDate ? 
        allValues.workingDate.toDate() : 
        new Date(),
      workingStartTime: allValues.workingStartTime ? 
        allValues.workingStartTime.format('HH:mm') : 
        '09:00',
      workingEndTime: allValues.workingEndTime ? 
        allValues.workingEndTime.format('HH:mm') : 
        '18:00',
      breakTimes: newBreakTimes,
      restTime: totalRestMinutes,
      useCustomWorkingDays
    };
    
    onValuesChange(formattedValues);
  };
  
  // 处理表单值变化
  const handleValuesChange = (_: any, allValues: any) => {
    // 转换日期格式
    const formattedValues = {
      ...allValues,
      workingDate: allValues.workingDate ? 
        allValues.workingDate.toDate() : 
        new Date(),
      workingStartTime: allValues.workingStartTime ? 
        allValues.workingStartTime.format('HH:mm') : 
        '09:00',
      workingEndTime: allValues.workingEndTime ? 
        allValues.workingEndTime.format('HH:mm') : 
        '18:00',
      breakTimes: breakTimes,
      restTime: calculateTotalBreakMinutes(breakTimes),
      useCustomWorkingDays
    };
    
    // 当休息类型改变时，如果不使用自定义工作日，则重新计算
    if (!useCustomWorkingDays) {
      const workingDays = calculateWorkingDaysPerMonth(allValues.restType);
      form.setFieldValue('workingDaysPerMonth', workingDays);
      formattedValues.workingDaysPerMonth = workingDays;
    }
    
    onValuesChange(formattedValues);
  };
  
  // 处理自定义工作日切换
  const handleCustomWorkingDaysChange = (checked: boolean) => {
    setUseCustomWorkingDays(checked);
    
    if (!checked) {
      const restType = form.getFieldValue('restType');
      const workingDays = calculateWorkingDaysPerMonth(restType);
      form.setFieldValue('workingDaysPerMonth', workingDays);
      
      // 通知父组件值变化
      const allValues = form.getFieldsValue();
      handleValuesChange(null, {
        ...allValues,
        workingDaysPerMonth: workingDays
      });
    }
  };

  return (
    <Card 
      title="工资计算设置" 
      className="salary-form-card"
      bordered={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...initialValues,
          workingDate: dayjs(),
          workingStartTime: dayjs('09:00', 'HH:mm'),
          workingEndTime: dayjs('18:00', 'HH:mm'),
          restTime: calculateTotalBreakMinutes(initialValues.breakTimes),
        }}
        onValuesChange={handleValuesChange}
        className="salary-form"
      >
        <Form.Item
          label="月工资"
          name="monthlySalary"
          rules={[{ required: true, message: '请输入月工资' }]}
        >
          <InputNumber
            prefix={<DollarOutlined />}
            min={0}
            max={100000}
            step={100}
            style={{ width: '100%' }}
            addonAfter="元"
          />
        </Form.Item>
        
        <Form.Item
          label="休息类型"
          name="restType"
          rules={[{ required: true, message: '请选择休息类型' }]}
        >
          <Radio.Group>
            <Radio.Button value="one">单休</Radio.Button>
            <Radio.Button value="two">双休</Radio.Button>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item label="自定义每月工作天数">
          <Switch 
            checked={useCustomWorkingDays} 
            onChange={handleCustomWorkingDaysChange}
          />
        </Form.Item>
        
        <Form.Item
          label={
            <span>
              每月工作天数 
              <Tooltip title="每月实际工作天数，可自定义或根据休息类型自动计算">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          name="workingDaysPerMonth"
          rules={[{ required: true, message: '请输入每月工作天数' }]}
        >
          <InputNumber
            disabled={!useCustomWorkingDays}
            prefix={<CalendarOutlined />}
            min={1}
            max={31}
            style={{ width: '100%' }}
            addonAfter="天"
          />
        </Form.Item>
        
        <Form.Item
          label="工作日期"
          name="workingDate"
          rules={[{ required: true, message: '请选择工作日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label={
            <span>
              工作时间设置
              <Tooltip title="每天的工作时间范围">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
        >
          <Row gutter={8} align="middle">
            <Col span={11}>
              <Form.Item
                name="workingStartTime"
                rules={[{ required: true, message: '请选择开始时间' }]}
                noStyle
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={5}
                  placeholder="开始时间"
                  prefix={<ClockCircleOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={2} style={{ textAlign: 'center' }}>
              至
            </Col>
            <Col span={11}>
              <Form.Item
                name="workingEndTime"
                rules={[{ required: true, message: '请选择结束时间' }]}
                noStyle
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={5}
                  placeholder="结束时间"
                  prefix={<ClockCircleOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              休息时间设置
              <Tooltip title="午休等非工作时间，在此时间段内不计入工资计算">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
        >
          <List
            size="small"
            dataSource={breakTimes}
            renderItem={(breakTime) => (
              <List.Item>
                <Row gutter={8} style={{ width: '100%' }} align="middle">
                  <Col span={10}>
                    <TimePicker 
                      value={dayjs(breakTime.startTime, 'HH:mm')}
                      format="HH:mm"
                      style={{ width: '100%' }}
                      minuteStep={5}
                      placeholder="开始时间"
                      onChange={(value) => updateBreakTime(breakTime.id, 'startTime', value)}
                      disabledTime={getDisabledTime(breakTime.id, 'start')}
                    />
                  </Col>
                  <Col span={2} style={{ textAlign: 'center' }}>
                    至
                  </Col>
                  <Col span={10}>
                    <TimePicker 
                      value={dayjs(breakTime.endTime, 'HH:mm')}
                      format="HH:mm"
                      style={{ width: '100%' }}
                      minuteStep={5}
                      placeholder="结束时间"
                      onChange={(value) => updateBreakTime(breakTime.id, 'endTime', value)}
                      disabledTime={getDisabledTime(breakTime.id, 'end')}
                    />
                  </Col>
                  <Col span={2} style={{ textAlign: 'center' }}>
                    <Button 
                      type="link" 
                      danger 
                      icon={<DeleteOutlined />} 
                      disabled={breakTimes.length <= 0}
                      onClick={() => removeBreakTime(breakTime.id)}
                    />
                  </Col>
                </Row>
              </List.Item>
            )}
            footer={
              <div style={{ textAlign: 'center' }}>
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={addBreakTime}
                  disabled={breakTimes.length >= 5}
                  block
                >
                  添加休息时间
                </Button>
              </div>
            }
          />
          
          <Form.Item
            name="restTime"
            hidden={true}
          >
            <InputNumber />
          </Form.Item>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SalaryForm; 