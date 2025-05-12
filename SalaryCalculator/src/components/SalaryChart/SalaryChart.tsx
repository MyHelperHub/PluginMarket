import { useEffect, useState } from 'react';
import { Card } from 'antd';
import './SalaryChart.css';
import type { SalaryParamsType } from '@/utils/salaryCalculator';
import { formatCurrency } from '@/utils/dateUtils';

interface SalaryChartProps {
  formData: SalaryParamsType;
  salaryStats: {
    dailySalary: number;
    totalEarnedSalary: number;
    remainingSalary: number;
  };
}

const SalaryChart = ({ formData, salaryStats }: SalaryChartProps) => {
  const [chartData, setChartData] = useState<{ earned: number, remaining: number }>({
    earned: salaryStats.totalEarnedSalary,
    remaining: salaryStats.remainingSalary
  });
  
  useEffect(() => {
    setChartData({
      earned: salaryStats.totalEarnedSalary,
      remaining: salaryStats.remainingSalary
    });
  }, [salaryStats]);
  
  const earnedPercentage = (chartData.earned / (chartData.earned + chartData.remaining)) * 100;

  return (
    <Card
      title="本月工资进度"
      className="salary-chart-card"
      bordered={false}
    >
      <div className="chart-container">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${earnedPercentage}%` }}
          >
            <span className="progress-text">
              {earnedPercentage > 10 ? `${earnedPercentage.toFixed(2)}%` : ''}
            </span>
          </div>
          {earnedPercentage < 90 && (
            <span className="remaining-text">
              {`${(100 - earnedPercentage).toFixed(2)}%`}
            </span>
          )}
        </div>
        
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color legend-earned"></div>
            <div className="legend-label">已赚取: {formatCurrency(chartData.earned)}</div>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-remaining"></div>
            <div className="legend-label">未赚取: {formatCurrency(chartData.remaining)}</div>
          </div>
        </div>
        
        <div className="chart-info">
          <div className="info-item">
            <div className="info-label">日薪资:</div>
            <div className="info-value">{formatCurrency(salaryStats.dailySalary)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">月薪资:</div>
            <div className="info-value">
              {formatCurrency(chartData.earned + chartData.remaining)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SalaryChart; 