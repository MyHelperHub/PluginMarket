import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import SalaryCalculator from '@/components/SalaryCalculator';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <SalaryCalculator />
    </ConfigProvider>
  );
}

export default App;
