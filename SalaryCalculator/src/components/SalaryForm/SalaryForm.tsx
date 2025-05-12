import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Radio, Switch, Card, Tooltip, TimePicker, Row, Col } from 'antd';
import { 
  DollarOutlined, 
  CalendarOutlined, 
  FieldTimeOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SalaryFormData } from '@/types/salary';
import { calculateWorkingDaysPerMonth } from '@/utils/salaryCalculator';
import './SalaryForm.css';

interface SalaryFormProps {
  onValuesChange: (values: SalaryFormData) => void;
}

const SalaryForm = ({ onValuesChange }: SalaryFormProps) => {
  const [form] = Form.useForm();
  const [useCustomWorkingDays, setUseCustomWorkingDays] = useState(false);
  
  const initialValues: SalaryFormData = {
    monthlySalary: 10000,
    workingDaysPerMonth: null,
    restType: 'two',
    hoursPerDay: 8,
    workingStartDate: new Date(),
    workingStartTime: '09:00',
    restTime: 60, // 默认休息1小时
    restStartTime: '12:00', // 默认休息开始时间
    restEndTime: '13:00', // 默认休息结束时间
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
  
  // 处理表单值变化
  const handleValuesChange = (_: any, allValues: any) => {
    // 转换日期格式
    const formattedValues = {
      ...allValues,
      workingStartDate: allValues.workingStartDate ? 
        allValues.workingStartDate.toDate() : 
        new Date(),
      workingStartTime: allValues.workingStartTime ? 
        allValues.workingStartTime.format('HH:mm') : 
        '09:00',
      restStartTime: allValues.restStartTime ? 
        allValues.restStartTime.format('HH:mm') : 
        '12:00',
      restEndTime: allValues.restEndTime ? 
        allValues.restEndTime.format('HH:mm') : 
        '13:00',
      useCustomWorkingDays
    };
    
    // 计算休息时长（从开始时间到结束时间的分钟数）
    if (allValues.restStartTime && allValues.restEndTime) {
      const startMinutes = allValues.restStartTime.hour() * 60 + allValues.restStartTime.minute();
      const endMinutes = allValues.restEndTime.hour() * 60 + allValues.restEndTime.minute();
      
      // 处理跨天情况（结束时间小于开始时间）
      const durationMinutes = endMinutes < startMinutes 
        ? (24 * 60 - startMinutes) + endMinutes 
        : endMinutes - startMinutes;
      
      // 确保休息时长至少为5分钟
      const validRestTime = Math.max(5, durationMinutes);
      
      formattedValues.restTime = validRestTime;
      form.setFieldValue('restTime', validRestTime);
    }
    
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
          workingStartDate: dayjs(),
          workingStartTime: dayjs('09:00', 'HH:mm'),
          restStartTime: dayjs('12:00', 'HH:mm'),
          restEndTime: dayjs('13:00', 'HH:mm'),
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
          label="每天工作时长"
          name="hoursPerDay"
          rules={[{ required: true, message: '请输入每天工作时长' }]}
        >
          <InputNumber
            prefix={<FieldTimeOutlined />}
            min={1}
            max={24}
            style={{ width: '100%' }}
            addonAfter="小时"
          />
        </Form.Item>
        
        <Form.Item
          label="开始工作日期"
          name="workingStartDate"
          rules={[{ required: true, message: '请选择开始工作日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label={
            <span>
              开始工作时间
              <Tooltip title="每天开始工作的时间">
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          name="workingStartTime"
          rules={[{ required: true, message: '请选择开始工作时间' }]}
        >
          <TimePicker 
            format="HH:mm"
            style={{ width: '100%' }}
            minuteStep={5}
            prefix={<ClockCircleOutlined />}
          />
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
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item
                name="restStartTime"
                rules={[{ required: true, message: '请选择休息开始时间' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={5}
                  placeholder="开始时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="restEndTime"
                rules={[{ required: true, message: '请选择休息结束时间' }]}
              >
                <TimePicker 
                  format="HH:mm"
                  style={{ width: '100%' }}
                  minuteStep={5}
                  placeholder="结束时间"
                />
              </Form.Item>
            </Col>
          </Row>
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