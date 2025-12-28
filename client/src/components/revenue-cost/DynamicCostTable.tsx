import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Modal,
  NumberInput,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Checkbox,
  SimpleGrid,
  UnstyledButton,
} from '@mantine/core'
import {
  IconTable,
  IconSettings,
  IconPackage,
  IconGasStation,
  IconUserDollar,
  IconTools,
  IconDots,
  IconPlus,
  IconEdit,
  IconTrash,
  IconClearAll,
  IconDownload
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, calculateTaxableIncome, calculateNonTaxIncome, type RevenueItem, type FuelPowerItem, type CostConfig } from '@/stores/revenueCostStore'
import { revenueCostApi, investmentApi } from '@/lib/api'
import WagesModal from './WagesModal'
import * as XLSX from 'xlsx'

// 格式化数字显示为2位小数，无千分号（不修改实际值，只用于显示）
const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  })
}

// 格式化数字显示为2位小数，不四舍五入，无千分号（不修改实际值，只用于显示）
const formatNumberNoRounding = (value: number): string => {
  // 处理负数
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // 将数字乘以100，截断整数部分，再除以100，实现不四舍五入保留2位小数
  const truncated = Math.trunc(absValue * 100) / 100;
  
  // 转换为字符串，确保有2位小数
  let result = truncated.toString();
  
  // 如果没有小数点或只有1位小数，补齐到2位
  if (!result.includes('.')) {
    result += '.00';
  } else {
    const decimalPart = result.split('.')[1];
    if (decimalPart.length === 1) {
      result += '0';
    } else if (decimalPart.length > 2) {
      result = result.split('.')[0] + '.' + decimalPart.substring(0, 2);
    }
  }
  
  // 添加负号
  if (isNegative) {
    result = '-' + result;
  }
  
  return result;
}

// 类型定义
interface CostItem {
  id: number;
  name: string;
  sourceType: 'percentage' | 'quantityPrice' | 'directAmount';
  linkedRevenueId?: string;
  percentage?: number;
  quantity?: number;
  unitPrice?: number;
  directAmount?: number;
  taxRate?: number;
}
interface WageItem {
  id: string
  name: string
  employees: number
  salaryPerEmployee: number // 万元/年
  welfareRate: number // 福利费率 %
  changeInterval?: number // 变化（年）- 工资调整的时间间隔
  changePercentage?: number // 幅度（%）- 每次调整时工资上涨的百分比
}

// 常量定义
const PERCENTAGE_MULTIPLIER = 100;
const FUEL_CONVERSION_FACTOR = 10000;
const DEFAULT_TAX_RATE = 13;

// 工具函数
const validateNumberInput = (value: unknown, min: number = 0, max: number = Infinity): number => {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    return min; // 返回最小值作为默认值
  }
  return num;
};

const safeLocalStorageGet = (key: string): unknown | null => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    console.error(`Failed to parse localStorage item ${key}:`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set localStorage item ${key}:`, error);
    return false;
  }
};

// 计算工具函数
const calculateBaseAmount = (
  item: CostItem, 
  revenueItems: any[]
): number => {
  switch (item.sourceType) {
    case 'percentage':
      let revenueBase = 0;
      if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
        // 使用calculateTaxableIncome来获得所有收入项的含税收入总和
        revenueBase = revenueItems.reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
      } else {
        const linkedRevenue = revenueItems.find(r => r.id === item.linkedRevenueId);
        if (linkedRevenue) {
          // 使用calculateTaxableIncome来获得特定收入项的含税收入
          revenueBase = calculateTaxableIncome(linkedRevenue);
        }
      }
      return revenueBase * (item.percentage ?? 0) / PERCENTAGE_MULTIPLIER;
    case 'quantityPrice':
      return (item.quantity ?? 0) * (item.unitPrice ?? 0);
    case 'directAmount':
      return item.directAmount ?? 0;
    default:
      return 0;
  }
};

const calculateWithTax = (
  baseAmount: number, 
  taxRate: number, 
  productionRate: number = 1
): { withTax: number; inputTax: number; excludingTax: number } => {
  // baseAmount 是不含税金额
  const validTaxRate = validateNumberInput(taxRate, 0, 100);
  const taxRateDecimal = validTaxRate / PERCENTAGE_MULTIPLIER;
  
  // 正确的计算公式：
  // 含税金额 = 不含税金额 × (1 + 税率)
  const withTax = baseAmount * productionRate * (1 + taxRateDecimal);
  // 进项税额 = 不含税金额 × 税率
  const inputTax = baseAmount * productionRate * taxRateDecimal;
  // 不含税金额 = 含税金额 - 进项税额
  const excludingTax = baseAmount * productionRate;
  
  return {
    withTax,
    inputTax,
    excludingTax
  };
};

const handleApiError = (error: unknown, operation: string) => {
  console.error(`${operation} failed:`, error);
  const message = error instanceof Error ? error.message : '未知错误';
  notifications.show({
    title: `${operation}失败`,
    message: `${message}，请稍后重试`,
    color: 'red',
  });
};

/**
 * 动态成本表格组件
 */
interface DynamicCostTableProps {
  repaymentTableData?: Array<{
    序号: string
    项目: string
    合计: number | null
    分年数据: number[]
  }>
  depreciationData?: Array<{
    序号: string
    资产类别: string
    原值: number
    年折旧摊销额: number
    分年数据: number[]
  }>
}

const DynamicCostTable: React.FC<DynamicCostTableProps> = ({
  repaymentTableData = [],
  depreciationData = []
}) => {
  const { context, revenueItems, productionRates, costConfig, updateCostConfig, costTableData, setCostTableData, saveToBackend } = useRevenueCostStore()
  
  // 固定资产投资状态（用于修理费计算）
  const [fixedAssetsInvestment, setFixedAssetsInvestment] = useState(0)
  
  const [showCostDetailModal, setShowCostDetailModal] = useState(false)
  
  // 外购原材料费估算表弹窗状态
  const [showRawMaterialsModal, setShowRawMaterialsModal] = useState(false)

  // 辅助材料费用估算表弹窗状态
  const [showAuxiliaryMaterialsModal, setShowAuxiliaryMaterialsModal] = useState(false)
  // 外购燃料及动力费估算表弹窗状态
  const [showFuelPowerModal, setShowFuelPowerModal] = useState(false)
  // 修理费配置弹窗状态
  const [showRepairModal, setShowRepairModal] = useState(false)
  // 修理费临时配置状态（用于存储未保存的修改）
  const [tempRepairConfig, setTempRepairConfig] = useState<any>(null)
  // 其他费用配置弹窗状态
  const [showOtherModal, setShowOtherModal] = useState(false)
  // 其他费用临时配置状态（用于存储未保存的修改）
  const [tempOtherConfig, setTempOtherConfig] = useState<any>(null)
  
  // 工资及福利费配置弹窗状态
  const [showWagesModal, setShowWagesModal] = useState(false)
  
  // 原材料编辑弹窗状态
  const [showRawMaterialEditModal, setShowRawMaterialEditModal] = useState(false)
  const [currentRawMaterial, setCurrentRawMaterial] = useState<any>(null)
  const [rawMaterialIndex, setRawMaterialIndex] = useState<number | null>(null)
  
  // 燃料及动力费编辑弹窗状态
  const [showFuelPowerEditModal, setShowFuelPowerEditModal] = useState(false)
  const [currentFuelPowerItem, setCurrentFuelPowerItem] = useState<any>(null)
  const [fuelPowerItemIndex, setFuelPowerItemIndex] = useState<number | null>(null)
  
  // 获取默认成本配置
  const getDefaultCostConfig = (): CostConfig => ({
    // 外购原材料费配置
    rawMaterials: {
      applyProductionRate: true, // 是否应用达产率
      items: [
        { id: 1, name: '原材料1', sourceType: 'percentage', linkedRevenueId: 'total', percentage: 2, quantity: 0, unitPrice: 0, directAmount: 0, taxRate: 13 },
        { id: 2, name: '原材料2', sourceType: 'quantityPrice', percentage: 0, quantity: 100, unitPrice: 0.5, directAmount: 0, taxRate: 13 },
        { id: 3, name: '原材料3', sourceType: 'directAmount', percentage: 0, quantity: 0, unitPrice: 0, directAmount: 50, taxRate: 13 },
      ]
    },
    // 辅助材料费用配置
    auxiliaryMaterials: {
      type: 'percentage', // percentage, directAmount
      percentage: 1, // 营业收入的百分比
      directAmount: 0, // 直接金额
      applyProductionRate: true, // 是否应用达产率
      taxRate: 13, // 进项税率
    },
    // 外购燃料及动力费配置
    fuelPower: {
      applyProductionRate: true, // 是否应用达产率
      items: [
        { id: 1, name: '水费', specification: '', unit: 'm³', price: 2.99, consumption: 0, totalCost: 0, applyProductionRate: true },
        { id: 2, name: '电费', specification: '', unit: 'kWh', price: 0.65, consumption: 0, totalCost: 0, applyProductionRate: true },
        { id: 3, name: '汽油', specification: '', unit: 'L', price: 9453, consumption: 0, totalCost: 0, applyProductionRate: true },
        { id: 4, name: '柴油', specification: '', unit: 'L', price: 7783, consumption: 0, totalCost: 0, applyProductionRate: true },
        { id: 5, name: '天然气', specification: '', unit: 'm³', price: 3.75, consumption: 0, totalCost: 0, applyProductionRate: true },
      ]
    },
    // 工资及福利费配置
    wages: {
      employees: 10, // 人数
      salaryPerEmployee: 5, // 每人单价(万元)
      directAmount: 0, // 直接金额
      taxRate: 0, // 进项税率
    },
    // 修理费配置
    repair: {
      type: 'percentage', // percentage, directAmount
      percentageOfFixedAssets: 0.5, // 固定资产投资的百分比
      directAmount: 0, // 直接金额
      taxRate: 13, // 进项税率
      applyProductionRate: false,
    },
    // 其他费用配置
    otherExpenses: {
      type: 'directAmount', // percentage, directAmount
      directAmount: 0, // 直接金额
      applyProductionRate: false, // 默认关闭
    },
    // 折旧费配置
    depreciation: {
      type: 'percentage', // percentage, directAmount
      percentageOfFixedAssets: 5, // 固定资产投资的百分比
      directAmount: 0, // 直接金额
    },
    // 摊销费配置
    amortization: {
      type: 'percentage', // percentage, directAmount
      percentageOfFixedAssets: 2, // 固定资产投资的百分比
      directAmount: 0, // 直接金额
    },
    // 利息支出配置
    interest: {
      type: 'percentage', // percentage, directAmount
      percentage: 3, // 贷款利息率
      directAmount: 0, // 直接金额
    }
  });

  // 尝试从localStorage加载配置
  const loadConfigFromStorage = (): CostConfig => {
    const savedConfig = safeLocalStorageGet('costConfig');
    if (savedConfig && typeof savedConfig === 'object') {
      return { ...getDefaultCostConfig(), ...savedConfig };
    }
    return getDefaultCostConfig();
  };

  // 计算外购原材料费（除税）的函数
  const calculateRawMaterialsExcludingTax = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      // 计算指定年份的外购原材料费（除税）
      const productionRate = costConfig.rawMaterials.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate ?? 1)
        : 1;
      
      // 外购原材料（含税）
      let totalWithTax = 0;
      (costConfig.rawMaterials.items ?? []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems ?? []);
        const taxRate = Number(item.taxRate) ?? 0;
        const taxRateDecimal = taxRate / 100;
        // 根据用户反馈：baseAmount是含税金额
        totalWithTax += baseAmount * productionRate;
      });
      
      // 进项税额
      let totalInputTax = 0;
      (costConfig.rawMaterials.items ?? []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems ?? []);
        const taxRate = Number(item.taxRate) ?? 0;
        const taxRateDecimal = taxRate / 100;
        // 正确的进项税额计算公式：含税金额 / (1 + 税率) × 税率
        totalInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
      });
      
      // 外购原材料（除税） = 外购原材料（含税） - 进项税额
      return totalWithTax - totalInputTax;
    } else {
      // 计算所有年份的外购原材料费（除税）合计
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateRawMaterialsExcludingTax(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.rawMaterials, productionRates, revenueItems]);

  // 计算外购原材料（除税）的旧函数（保留用于兼容）
  const calculateRawMaterialsExcludingTaxOld = useMemo(() => {
    // 如果没有项目上下文，返回0
    if (!context) return 0;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 合计列 = 运营期各年数值的总和
    let totalSum = 0;
    
    // 遍历运营期各年
    years.forEach((year) => {
      const productionRate = costConfig.rawMaterials.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      
      // 计算该年的外购原材料（含税）总额
      let yearTotalWithTax = 0;
      // 计算该年的进项税额总额
      let yearTotalInputTax = 0;
      
      (costConfig.rawMaterials.items ?? []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems ?? []);
        
        // 根据用户反馈：外购原材料表中序号1、2、3、4的金额均为含税收入
        // baseAmount 现在是含税金额
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        
        // 计算该年的含税金额（应用达产率）
        const yearWithTax = baseAmount * productionRate;
        yearTotalWithTax += yearWithTax;
        
        // 计算该年的进项税额（应用达产率）- 正确公式：含税金额 / (1 + 税率) × 税率
        const yearInputTax = baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
        yearTotalInputTax += yearInputTax;
      });
      
      // 该年的外购原材料（除税） = 含税金额 - 进项税额
      const yearExcludingTax = yearTotalWithTax - yearTotalInputTax;
      
      // 累加到总合计
      totalSum += yearExcludingTax;
    });
    
    return totalSum;
  }, [context, costConfig.rawMaterials, productionRates, revenueItems]);

  // 计算总收入（用于多处复用）
  const totalRevenue = useMemo(() => {
    return (revenueItems ?? []).reduce((sum, item) => sum + calculateTaxableIncome(item), 0);
  }, [revenueItems]);

  // 计算工资及福利费合计的函数
  const calculateWagesTotal = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      // 计算指定年份的工资及福利费
      let yearWages = 0;
      
      // 如果有工资明细数据，使用明细数据计算
      if (costConfig.wages.items && costConfig.wages.items.length > 0) {
        costConfig.wages.items.forEach((item: any) => {
          // 计算该年的工资总额（考虑工资调整）
          let currentSalary = item.salaryPerEmployee || 0;
          
          // 根据调整周期和幅度计算第targetYear年的工资
          if (item.changeInterval && item.changePercentage) {
            const adjustmentTimes = Math.floor((targetYear - 1) / item.changeInterval);
            currentSalary = currentSalary * Math.pow(1 + item.changePercentage / 100, adjustmentTimes);
          }
          
          // 计算工资总额
          const yearlySubtotal = item.employees * currentSalary;
          // 计算福利费
          const yearlyWelfare = yearlySubtotal * (item.welfareRate || 0) / 100;
          // 合计
          yearWages += yearlySubtotal + yearlyWelfare;
        });
      } else {
        // 如果没有明细数据，使用directAmount
        yearWages = costConfig.wages.directAmount || 0;
      }
      
      return yearWages;
    } else {
      // 计算所有年份的工资及福利费合计
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateWagesTotal(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.wages]);

  // 计算外购燃料及动力（除税）的函数
  const calculateFuelPowerExcludingTax = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      // 计算指定年份的外购燃料及动力（除税）
      const productionRate = costConfig.fuelPower.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      let yearFuelPowerTotal = 0;  // 燃料、动力费总额
      let yearInputTaxTotal = 0;   // 进项税额总额
      
      (costConfig.fuelPower.items ?? []).forEach((item: FuelPowerItem) => {
        let consumption = item.consumption || 0;
        let amount = 0;
        // 对汽油和柴油进行特殊处理：单价×数量/10000
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price || 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price || 0) * productionRate;
        }
        yearFuelPowerTotal += amount;
        
        // 计算进项税额：含税金额 / (1 + 税率) × 税率
        const taxRate = (item.taxRate || 13) / 100;
        yearInputTaxTotal += amount * taxRate / (1 + taxRate);
      });
      
      // 外购燃料及动力（除税）= 燃料、动力费 - 进项税额
      return yearFuelPowerTotal - yearInputTaxTotal;
    } else {
      // 计算所有年份的外购燃料及动力（除税）合计
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateFuelPowerExcludingTax(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.fuelPower, productionRates]);

  // 计算运营期年份数组
  const operationYears = useMemo(() => {
    if (!context) return [];
    return Array.from({ length: context.operationYears }, (_, i) => i + 1);
  }, [context]);

  // 计算表格数据的useMemo
  const tableData = useMemo(() => {
    if (!context) return null;
    
    const years = operationYears;
    
    const rows: Array<{
      序号: string;
      成本项目: string;
      合计: number;
      运营期: number[];
    }> = [];
    
    // 1. 营业成本
    const row1 = { 序号: '1', 成本项目: '营业成本', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      let yearTotal = 0;
      
      // 1.1 外购原材料费（除税）
      yearTotal += calculateRawMaterialsExcludingTax(year, years);
      
      // 1.2 外购燃料及动力费（除税）
      yearTotal += calculateFuelPowerExcludingTax(year, years);
      
      // 1.3 工资及福利费
      yearTotal += calculateWagesTotal(year, years);
      
      // 1.4 修理费
      if (costConfig.repair.type === 'percentage') {
        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearTotal += costConfig.repair.directAmount || 0;
      }
      
      // 1.5 其他费用
      const productionRate = costConfig.otherExpenses.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      if (costConfig.otherExpenses.type === 'percentage') {
        const revenueBase = (revenueItems ?? []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
        yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
      } else {
        yearTotal += (costConfig.otherExpenses.directAmount || 0) * productionRate;
      }
      
      row1.运营期.push(yearTotal);
      row1.合计 += yearTotal;
    });
    rows.push(row1);
    
    // 1.1 外购原材料费
    const row1_1 = { 序号: '1.1', 成本项目: '外购原材料费', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const value = calculateRawMaterialsExcludingTax(year, years);
      row1_1.运营期.push(value);
      row1_1.合计 += value;
    });
    rows.push(row1_1);
    
    // 1.2 外购燃料及动力费
    const row1_2 = { 序号: '1.2', 成本项目: '外购燃料及动力费', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const value = calculateFuelPowerExcludingTax(year, years);
      row1_2.运营期.push(value);
      row1_2.合计 += value;
    });
    rows.push(row1_2);
    
    // 1.3 工资及福利费
    const row1_3 = { 序号: '1.3', 成本项目: '工资及福利费', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const value = calculateWagesTotal(year, years);
      row1_3.运营期.push(value);
      row1_3.合计 += value;
    });
    rows.push(row1_3);
    
    // 1.4 修理费
    const row1_4 = { 序号: '1.4', 成本项目: '修理费', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      let yearTotal = 0;
      if (costConfig.repair.type === 'percentage') {
        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearTotal += costConfig.repair.directAmount || 0;
      }
      row1_4.运营期.push(yearTotal);
      row1_4.合计 += yearTotal;
    });
    rows.push(row1_4);
    
    // 1.5 其他费用
    const row1_5 = { 序号: '1.5', 成本项目: '其他费用', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const productionRate = costConfig.otherExpenses.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      let yearTotal = 0;
      if (costConfig.otherExpenses.type === 'percentage') {
        const revenueBase = (revenueItems ?? []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
        yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
      } else {
        yearTotal += (costConfig.otherExpenses.directAmount || 0) * productionRate;
      }
      row1_5.运营期.push(yearTotal);
      row1_5.合计 += yearTotal;
    });
    rows.push(row1_5);
    
    // 2. 管理费用
    const row2 = { 序号: '2', 成本项目: '管理费用', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      row2.运营期.push(0);
    });
    rows.push(row2);
    
    // 3. 利息支出
    const row3 = { 序号: '3', 成本项目: '利息支出', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      let yearInterest = 0;
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
        yearInterest = interestRow.分年数据[year - 1];
      }
      row3.运营期.push(yearInterest);
      row3.合计 += yearInterest;
    });
    rows.push(row3);
    
    // 4. 折旧费
    const row4 = { 序号: '4', 成本项目: '折旧费', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const yearIndex = year - 1;
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
      row4.运营期.push(yearDepreciation);
      row4.合计 += yearDepreciation;
    });
    rows.push(row4);
    
    // 5. 摊销费
    const row5 = { 序号: '5', 成本项目: '摊销费', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const yearIndex = year - 1;
      const rowE = depreciationData.find(row => row.序号 === 'E');
      const yearAmortization = rowE?.分年数据[yearIndex] || 0;
      row5.运营期.push(yearAmortization);
      row5.合计 += yearAmortization;
    });
    rows.push(row5);
    
    // 6. 开发成本
    const row6 = { 序号: '6', 成本项目: '开发成本', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      row6.运营期.push(0);
    });
    rows.push(row6);
    
    // 7. 总成本费用合计
    const row7 = { 序号: '7', 成本项目: '总成本费用合计', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const yearIndex = year - 1;
      let yearTotal = 0;
      
      // 行1: 营业成本
      yearTotal += row1.运营期[yearIndex];
      
      // 行2: 管理费用
      yearTotal += row2.运营期[yearIndex];
      
      // 行3: 利息支出
      yearTotal += row3.运营期[yearIndex];
      
      // 行4: 折旧费
      yearTotal += row4.运营期[yearIndex];
      
      // 行5: 摊销费
      yearTotal += row5.运营期[yearIndex];
      
      // 行6: 开发成本
      yearTotal += row6.运营期[yearIndex];
      
      row7.运营期.push(yearTotal);
      row7.合计 += yearTotal;
    });
    rows.push(row7);
    
    return {
      rows: rows,
      updatedAt: new Date().toISOString()
    };
  }, [context, operationYears, costConfig, fixedAssetsInvestment, productionRates, revenueItems, repaymentTableData, depreciationData, calculateRawMaterialsExcludingTax, calculateFuelPowerExcludingTax, calculateWagesTotal]);

  // Card with actions grid 的数据
  const costItemsData = [
    { 
      title: '外购原材料费', 
      icon: IconPackage, 
      color: 'blue',
      onClick: () => setShowRawMaterialsModal(true)
    },
    { 
      title: '外购燃料及动力费', 
      icon: IconGasStation, 
      color: 'green',
      onClick: () => setShowFuelPowerModal(true)
    },
    { 
      title: '工资及福利费', 
      icon: IconUserDollar, 
      color: 'orange',
      onClick: () => setShowWagesModal(true)
    },
  ];

  // 渲染原材料编辑弹窗
  const renderRawMaterialEditModal = () => (
    <Modal
      opened={showRawMaterialEditModal}
      onClose={() => setShowRawMaterialEditModal(false)}
      title="编辑原材料"
      size="md"
    >
      {currentRawMaterial && (
        <Stack gap="md">
          <TextInput
            label="原材料名称"
            value={currentRawMaterial.name}
            onChange={(e) => setCurrentRawMaterial({...currentRawMaterial, name: e.target.value})}
            required
            withAsterisk
            error={!currentRawMaterial.name.trim() ? "请输入原材料名称" : undefined}
          />
          
          <Select
            label="费用计算方式"
            data={[
              { value: 'percentage', label: '根据收入的百分比' },
              { value: 'quantityPrice', label: '数量×单价' },
              { value: 'directAmount', label: '直接填金额' },
            ]}
            value={currentRawMaterial.sourceType}
            onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, sourceType: value})}
          />
          
          {currentRawMaterial.sourceType === 'percentage' && (
            <>
              <Select
                label="选择收入项目"
                data={[
                  { 
                    value: 'total', 
                    label: `整个项目年收入 (${totalRevenue.toFixed(2)}万元)`
                  },
                  ...(revenueItems ?? []).map((item: RevenueItem) => ({
                    value: item.id,
                    label: `${item.name} (年收入: ${calculateTaxableIncome(item).toFixed(2)}万元)`
                  }))                ]}
                placeholder="请选择收入项目"
                value={currentRawMaterial.linkedRevenueId || 'total'}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, linkedRevenueId: value || undefined})}
              />
              <NumberInput
                label="占收入的百分比 (%)"
                description="例如：输入1表示1%，输入0.01表示0.01%"
                value={currentRawMaterial.percentage}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, percentage: Number(value)})}
                min={0}
                max={80}
                decimalScale={2}
              />
            </>
          )}
          
          {currentRawMaterial.sourceType === 'quantityPrice' && (
            <>
              <NumberInput
                label="数量"
                value={currentRawMaterial.quantity}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, quantity: Number(value)})}
                min={0}
              />
              <NumberInput
                label="单价"
                value={currentRawMaterial.unitPrice}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, unitPrice: Number(value)})}
                min={0}
                decimalScale={2}
              />
            </>
          )}
          
          {currentRawMaterial.sourceType === 'directAmount' && (
            <NumberInput
              label="直接金额（万元）"
              value={currentRawMaterial.directAmount}
              onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, directAmount: Number(value)})}
              min={0}
              decimalScale={2}
            />
          )}
          
          <NumberInput
            label="进项税率 (%)"
            value={currentRawMaterial.taxRate}
            onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, taxRate: Number(value)})}
            min={0}
            max={100}
            decimalScale={2}
          />
          
          {/* 计算说明和金额显示 - 移动到进项税后方 */}
          {currentRawMaterial.sourceType === 'percentage' && (
            <>
              {currentRawMaterial.linkedRevenueId && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#E8F7FF',
                  borderRadius: '6px',
                  borderLeft: '3px solid #1E6FFF'
                }}>
                  <Text size="xs" c="#1E6FFF" fw={500}>
                    📄 计算说明：
                    {(() => {
                      const selectedRevenue = currentRawMaterial.linkedRevenueId === 'total' 
                        ? null 
                        : (revenueItems ?? []).find((item: RevenueItem) => item.id === currentRawMaterial.linkedRevenueId)
                      
                      if (selectedRevenue) {
                        const revenueAmount = calculateTaxableIncome(selectedRevenue).toFixed(2)
                        const materialAmount = (parseFloat(revenueAmount) * currentRawMaterial.percentage / 100).toFixed(2)
                        return `选择"${selectedRevenue.name}"作为基数（${revenueAmount}万元）× ${currentRawMaterial.percentage}% = ${materialAmount}万元`
                      }
                      const totalRevenueValue = totalRevenue.toFixed(2);
                      const totalMaterialAmount = (totalRevenue * currentRawMaterial.percentage / 100).toFixed(2);
                      return `选择整个项目年收入作为基数（${totalRevenueValue}万元）× ${currentRawMaterial.percentage}% = ${totalMaterialAmount}万元`;
                    })()}
                  </Text>
                </div>
              )}
              {/* 显示计算后的金额 */}
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#F0F8FF',
                borderRadius: '6px',
                border: '1px solid #B0D4FF',
                marginTop: '8px'
              }}>
                <Text size="sm" c="#1E6FFF" fw={600}>
                  金额：
                  {(() => {
                    // 计算总收入
                    let totalRevenue = 0;
                    let unit = '万元';
                    if (currentRawMaterial.linkedRevenueId === 'total') {
                      // 整个项目收入
                      totalRevenue = totalRevenue;
                    } else {
                      // 特定收入项
                      const selectedItem = (revenueItems ?? []).find((item: RevenueItem) => item.id === currentRawMaterial.linkedRevenueId);
                      if (selectedItem) {
                        totalRevenue = calculateTaxableIncome(selectedItem);
                        unit = '万元';
                      }
                    }
                    
                    // 应用百分比和达产率
                    const amount = totalRevenue * currentRawMaterial.percentage / 100;
                    return `${amount.toFixed(2)}${unit}`;
                  })()}
                </Text>
              </div>
            </>
          )}
          
          {currentRawMaterial.sourceType === 'quantityPrice' && (
            <>
              {/* 显示计算后的金额 */}
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#F0F8FF',
                borderRadius: '6px',
                border: '1px solid #B0D4FF',
                marginTop: '8px'
              }}>
                <Text size="sm" c="#1E6FFF" fw={600}>
                  金额：
                  {(() => {
                    // 计算金额 = 数量 × 单价
                    const amount = currentRawMaterial.quantity * currentRawMaterial.unitPrice;
                    return `${amount.toFixed(2)}万元`;
                  })()}
                </Text>
              </div>
            </>
          )}
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setShowRawMaterialEditModal(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                // 表单验证
                if (!currentRawMaterial.name.trim()) {
                  notifications.show({
                    title: '验证失败',
                    message: '请输入原材料名称',
                    color: 'red',
                  });
                  return;
                }
                
                if (rawMaterialIndex !== null) {
                  const newItems = [...(costConfig.rawMaterials.items ?? [])];
                  newItems[rawMaterialIndex] = currentRawMaterial;
                  updateCostConfig({
                    rawMaterials: {
                      ...costConfig.rawMaterials,
                      items: newItems
                    }
                  });
                  // 自动保存已由 Store 处理
                }
                setShowRawMaterialEditModal(false);
              }}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );

  // 渲染外购原材料费估算表
  const renderRawMaterialsModal = () => {
    if (!context) return <Text c="red">项目上下文未加载</Text>

    const years = operationYears;

    return (
      <Modal
        opened={showRawMaterialsModal}
        onClose={() => setShowRawMaterialsModal(false)}
        title={
          <Group justify="space-between" w="100%">
            <Text>📊 外购原材料费估算表</Text>
            <Tooltip label="添加原材料">
              <ActionIcon 
                variant="filled" 
                color="blue" 
                onClick={() => {
                  const newItem: CostItem = {
                    id: Date.now(),
                    name: `原材料${(costConfig.rawMaterials.items ?? []).length + 1}`,
                    sourceType: 'percentage',
                    linkedRevenueId: 'total',
                    percentage: 25,
                    quantity: 0,
                    unitPrice: 0,
                    directAmount: 0,
                    taxRate: 13
                  };
                  updateCostConfig({
                    rawMaterials: {
                      ...costConfig.rawMaterials,
                      items: [...(costConfig.rawMaterials.items ?? []), newItem]
                    }
                  });
                }}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>      
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <Table striped withTableBorder style={{ fontSize: '11px' }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
              <Table.Th colSpan={context.operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>操作</Table.Th>
            </Table.Tr>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              {years.map((year) => (
                <Table.Th key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {year}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* 表格内容 */}
            {tableData?.rows.slice(0, 6).map((row) => (
              <Table.Tr key={row.序号}>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{row.序号}</Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>{row.成本项目}</Table.Td>
                <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                  {formatNumberNoRounding(row.合计)}
                </Table.Td>
                {row.运营期.map((value, index) => (
                  <Table.Td key={index} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {formatNumberNoRounding(value)}
                  </Table.Td>
                ))}
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {row.序号 === '1.1' && (
                    <Group gap={4} justify="center">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => setShowRawMaterialsModal(true)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group justify="flex-end" mt="md">
          <Checkbox
            label="应用达产率"
            checked={costConfig.rawMaterials.applyProductionRate}
            onChange={(event) => updateCostConfig({
              rawMaterials: { 
                ...costConfig.rawMaterials, 
                applyProductionRate: event.currentTarget.checked 
              }
            })}
          />
        </Group>
      </Modal>
    );
  };

  // 计算固定资产投资金额：折旧与摊销估算表中A与D原值的合减去投资估算简表中"建设期利息"的数值
  const calculateFixedAssetsInvestment = useCallback(async () => {
    console.log('🔍 开始计算固定资产投资金额...');
    console.log('📊 折旧数据:', depreciationData);
    console.log('📋 项目上下文:', context);
    
    let fixedAssetsValue = 0;
    
    // 获取折旧与摊销估算表中A和D的原值
    if (depreciationData.length > 0) {
      console.log('✅ 找到折旧数据，行数:', depreciationData.length);
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      
      console.log('🔍 折旧行A:', rowA);
      console.log('🔍 折旧行D:', rowD);
      
      if (rowA && rowD) {
        // 使用原值字段计算固定资产投资
        fixedAssetsValue = (rowA.原值 || 0) + (rowD.原值 || 0);
        console.log('💰 计算固定资产原值:', rowA.原值, '+', rowD.原值, '=', fixedAssetsValue);
      } else {
        console.warn('⚠️ 未找到折旧行A或D');
      }
    } else {
      console.warn('⚠️ 折旧数据为空');
    }
    
    // 减去建设期利息
    // 尝试从投资估算数据中获取建设期利息
    let constructionInterest = 0;
    let interestSource = "未找到";
    
    // 尝试从投资估算API获取建设期利息
    try {
      if (context?.projectId) {
        console.log('🌐 尝试从API获取投资估算数据，项目ID:', context.projectId);
        const investmentResponse = await investmentApi.getByProjectId(context.projectId);
        
        if (investmentResponse.success) {
          console.log('✅ API请求成功，开始解析数据结构...');
          
          // 根据用户提供的数据结构，construction_interest在data.estimate层级
          if (investmentResponse.data?.estimate?.construction_interest !== undefined) {
            constructionInterest = parseFloat(investmentResponse.data.estimate.construction_interest);
            interestSource = "投资估算数据(data.estimate.construction_interest)";
            console.log('✅ 从投资估算数据获取建设期利息:', constructionInterest);
          } else {
            console.warn('⚠️ 投资估算数据中没有找到construction_interest字段');
            console.log('📋 data.estimate的可用字段:', Object.keys(investmentResponse.data?.estimate || {}));
          }
        } else {
          console.warn('⚠️ 投资估算API请求失败');
        }
      } else {
        console.warn('⚠️ 项目上下文或项目ID为空');
      }
    } catch (error) {
      console.error('❌ 获取投资估算数据失败:', error);
    }
    
    // 如果投资估算数据中没有找到，设置默认值为0
    if (constructionInterest === 0) {
      interestSource = "未找到建设期利息数据";
    }
    
    // 调试日志
    const finalInvestment = fixedAssetsValue - constructionInterest;
    console.log('📋 固定资产投资计算调试信息:', {
      折旧A原值: depreciationData.find(row => row.序号 === 'A')?.原值 || 0,
      折旧D原值: depreciationData.find(row => row.序号 === 'D')?.原值 || 0,
      固定资产原值合计: fixedAssetsValue,
      建设期利息: constructionInterest,
      建设期利息来源: interestSource,
      最终固定资产投资: finalInvestment
    });
    
    console.log('🎯 最终固定资产投资金额:', finalInvestment);
    
    return finalInvestment;
  }, [depreciationData, context]);
    
  // 渲染修理费配置弹窗
  const renderRepairModal = () => {
    // 初始化临时配置（当弹窗打开时）
    React.useEffect(() => {
      if (showRepairModal && !tempRepairConfig) {
        setTempRepairConfig({...costConfig.repair});
      }
    }, [showRepairModal, costConfig.repair, tempRepairConfig]);
    
    // 计算修理费金额（使用临时配置）
    const calculateRepairAmount = () => {
      const config = tempRepairConfig || costConfig.repair;
      if (config.type === 'percentage') {
        return fixedAssetsInvestment * (config.percentageOfFixedAssets || 0) / 100;
      } else {
        return config.directAmount || 0;
      }
    };
    
    // 保存修理费配置
    const handleSaveRepairConfig = () => {
      if (tempRepairConfig) {
        // 将临时配置更新到全局状态
        updateCostConfig({
          repair: tempRepairConfig
        });
        
        // 清除临时配置
        setTempRepairConfig(null);
        
        // 关闭弹窗
        setShowRepairModal(false);
        
        // 显示成功通知
        notifications.show({
          title: '保存成功',
          message: '修理费配置已保存',
          color: 'green',
        });
      }
    };
    
    // 取消编辑
    const handleCancelRepairConfig = () => {
      // 清除临时配置
      setTempRepairConfig(null);
      // 关闭弹窗
      setShowRepairModal(false);
    };
    
    const currentConfig = tempRepairConfig || costConfig.repair;
  
    return (
      <Modal
        opened={showRepairModal}
        onClose={handleCancelRepairConfig}
        title="修理费配置"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="费用类型"
            data={[
              {
                value: 'percentage',
                label: `按固定资产投资（${fixedAssetsInvestment.toFixed(2)}万元）的百分比`
              },
              { value: 'directAmount', label: '直接填金额' },
            ]}
            value={currentConfig.type}
            onChange={(value) => setTempRepairConfig({
              ...currentConfig,
              type: value as any
            })}
          />
          
          {currentConfig.type === 'percentage' && (
            <>
              <NumberInput
                label="固定资产投资的百分比 (%)"
                value={currentConfig.percentageOfFixedAssets}
                onChange={(value) => setTempRepairConfig({
                  ...currentConfig,
                  percentageOfFixedAssets: Number(value)
                })}
                min={0}
                max={100}
                decimalScale={2}
              />
              
              <NumberInput
                label="金额："
                value={calculateRepairAmount()}
                disabled
                description={`通过计算所得到的最终修理费（万元）`}
                decimalScale={2}
                styles={{
                  input: { backgroundColor: '#f8f9fa' }
                }}
              />
            </>
          )}
          
          {currentConfig.type === 'directAmount' && (
            <NumberInput
              label="直接金额（万元）"
              value={currentConfig.directAmount}
              onChange={(value) => setTempRepairConfig({
                ...currentConfig,
                directAmount: Number(value)
              })}
              min={0}
              decimalScale={2}
            />
          )}
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleCancelRepairConfig}>
              取消
            </Button>
            <Button
              onClick={handleSaveRepairConfig}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  };
    
  // 使用useEffect异步计算固定资产投资
  React.useEffect(() => {
    const calculateInvestment = async () => {
      const investment = await calculateFixedAssetsInvestment();
      setFixedAssetsInvestment(investment);
    };
    calculateInvestment();
  }, [calculateFixedAssetsInvestment]);

  /**
   * 生成总成本费用表数据
   */
  const generateCostTableData = () => {
    return tableData;
  };

  /**
   * 保存总成本费用表数据
   */
  const handleSaveCostTableData = async () => {
    if (!context) return;
    
    // 生成并保存表格数据
    const tableData = generateCostTableData();
    if (tableData) {
      setCostTableData(tableData);
      
      // 触发保存到后端
      const success = await saveToBackend();
      
      if (success) {
        notifications.show({
          title: '保存成功',
          message: '总成本费用表数据已保存',
          color: 'green',
        });
      } else {
        notifications.show({
          title: '保存失败',
          message: '总成本费用表数据保存失败',
          color: 'red',
        });
        return false; // 返回失败，不关闭弹窗
      }
    }
    
    return true;
  };

  // 导出总成本费用估算表为Excel
  const handleExportCostTable = useCallback(() => {
    if (!context) {
      notifications.show({
        title: '导出失败',
        message: '项目上下文未加载',
        color: 'red',
      });
      return;
    }

    const years = operationYears;

    // 准备Excel数据
    const excelData: any[] = [];
    
    // 添加表头
    const headerRow: any = { '序号': '', '成本项目': '', '合计': '' };
    years.forEach((year) => {
      headerRow[year.toString()] = year;
    });
    excelData.push(headerRow);

    // 使用tableData来生成Excel数据
    tableData?.rows.forEach((row) => {
      const excelRow: any = {
        '序号': row.序号,
        '成本项目': row.成本项目,
        '合计': row.合计
      };
      row.运营期.forEach((value, index) => {
        excelRow[(index + 1).toString()] = value;
      });
      excelData.push(excelRow);
    });

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '总成本费用估算表');

    // 导出文件
    XLSX.writeFile(wb, `总成本费用估算表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '总成本费用估算表已导出为Excel文件',
      color: 'green',
    });
  }, [context, operationYears, tableData]);

  // 根据费用项目名称获取数量标签
  const getQuantityLabel = useCallback((itemName: string) => {
    const labelMap: { [key: string]: string } = {
      '水费': '数量（万m³）',
      '电费': '数量（万kWh）',
      '汽油': '数量（吨）',
      '柴油': '数量（吨）',
      '天然气': '数量（万m³）'
    };
    
    return labelMap[itemName] || '数量';
  }, []);

  // 燃料及动力费编辑保存处理函数
  const handleFuelPowerSave = useCallback(() => {
    if (fuelPowerItemIndex !== null) {
      const newItems = [...(costConfig.fuelPower.items ?? [])];
      newItems[fuelPowerItemIndex] = currentFuelPowerItem;
      updateCostConfig({
        fuelPower: {
          ...costConfig.fuelPower,
          items: newItems
        }
      });
      // 自动保存已由 Store 处理
    }
    setShowFuelPowerEditModal(false);
  }, [fuelPowerItemIndex, costConfig.fuelPower.items, currentFuelPowerItem, updateCostConfig]);

  // 渲染燃料及动力费编辑弹窗
  const renderFuelPowerEditModal = () => (
    <Modal
      opened={showFuelPowerEditModal}
      onClose={() => setShowFuelPowerEditModal(false)}
      title="编辑燃料及动力费项目"
      size="md"
    >
      {currentFuelPowerItem && (
        <Stack gap="md">
          <TextInput
            label="费用项目名称"
            value={currentFuelPowerItem.name}
            disabled
            styles={{
              input: { backgroundColor: '#f8f9fa' }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <NumberInput
            label={getQuantityLabel(currentFuelPowerItem.name)}
            value={currentFuelPowerItem.consumption || 0}
            onChange={(value) => setCurrentFuelPowerItem({...currentFuelPowerItem, consumption: Number(value)})}
            min={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <NumberInput
            label="单价（元）"
            value={currentFuelPowerItem.price || 0}
            onChange={(value) => setCurrentFuelPowerItem({...currentFuelPowerItem, price: Number(value)})}
            min={0}
            decimalScale={4}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <NumberInput
            label="进项税率 (%)"
            value={13}
            disabled
            styles={{
              input: { backgroundColor: '#f8f9fa' }
            }}
            min={0}
            max={100}
            decimalScale={2}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setShowFuelPowerEditModal(false)}>
              取消
            </Button>
            <Button 
              onClick={handleFuelPowerSave}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );

  // 渲染外购燃料及动力费估算表
  const renderFuelPowerModal = () => {
    if (!context) return <Text c="red">项目上下文未加载</Text>

    const years = operationYears;

    return (
      <Modal
        opened={showFuelPowerModal}
        onClose={() => setShowFuelPowerModal(false)}
        title={
          <Text size="md">
            📊 外购燃料和动力费估算表
          </Text>
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <Table striped withTableBorder style={{ fontSize: '11px' }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
              <Table.Th colSpan={context.operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>操作</Table.Th>
            </Table.Tr>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              {years.map((year) => (
                <Table.Th key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {year}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* 燃料动力费表格内容 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>燃料、动力费</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {(() => {
                  let totalSum = 0;
                  years.forEach((year) => {
                    const productionRate = costConfig.fuelPower.applyProductionRate 
                      ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                    
                    let yearTotal = 0;
                    (costConfig.fuelPower.items ?? []).forEach((item: FuelPowerItem) => {
                      let consumption = item.consumption || 0;
                      if (['汽油', '柴油'].includes(item.name)) {
                        yearTotal += (item.price || 0) * consumption / 10000 * productionRate;
                      } else {
                        yearTotal += consumption * (item.price || 0) * productionRate;
                      }
                    });
                    totalSum += yearTotal;
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                const productionRate = costConfig.fuelPower.applyProductionRate 
                      ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                
                let yearTotal = 0;
                (costConfig.fuelPower.items ?? []).forEach((item: FuelPowerItem) => {
                  let consumption = item.consumption || 0;
                  if (['汽油', '柴油'].includes(item.name)) {
                    yearTotal += (item.price || 0) * consumption / 10000 * productionRate;
                  } else {
                    yearTotal += consumption * (item.price || 0) * productionRate;
                  }
                });
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {formatNumberNoRounding(yearTotal)}
                  </Table.Td>
                );
              })}
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        <Group justify="flex-end" mt="md">
          <Checkbox
            label="应用达产率"
            checked={costConfig.fuelPower.applyProductionRate}
            onChange={(event) => updateCostConfig({
              fuelPower: { 
                ...costConfig.fuelPower, 
                applyProductionRate: event.currentTarget.checked 
              }
            })}
          />
        </Group>
      </Modal>
    );
  };

  // 渲染辅助材料费用配置弹窗
  const renderAuxiliaryMaterialsModal = () => (
    <Modal
      opened={showAuxiliaryMaterialsModal}
      onClose={() => setShowAuxiliaryMaterialsModal(false)}
      title="辅助材料费用配置"
      size="md"
    >
      <Stack gap="md">
        <Select
          label="费用类型"
          data={[
            { value: 'percentage', label: '按营业收入的百分比' },
            { value: 'directAmount', label: '直接填金额' },
          ]}
          value={costConfig.auxiliaryMaterials.type}
          onChange={(value) => updateCostConfig({
            auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, type: value as any }
          })}
        />
        
        {costConfig.auxiliaryMaterials.type === 'percentage' && (
          <>
            <Select
              label="选择收入项目"
              data={[
                { value: 'total', label: '整个项目收入' },
                { value: 'item1', label: '收入项1' },
                { value: 'item2', label: '收入项2' },
              ]}
              placeholder="请选择收入项目"
            />
            <NumberInput
              label="营业收入的百分比 (%)"
              value={costConfig.auxiliaryMaterials.percentage}
              onChange={(value) => updateCostConfig({
                auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, percentage: Number(value) }
              })}
              min={0}
              max={100}
              decimalScale={2}
            />
          </>
        )}
        
        {costConfig.auxiliaryMaterials.type === 'directAmount' && (
          <NumberInput
            label="直接金额（万元）"
            value={costConfig.auxiliaryMaterials.directAmount}
            onChange={(value) => updateCostConfig({
              auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, directAmount: Number(value) }
            })}
            min={0}
            decimalScale={2}
          />
        )}
        
        <NumberInput
          label="进项税率 (%)"
          value={costConfig.auxiliaryMaterials.taxRate}
          onChange={(value) => updateCostConfig({
            auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, taxRate: Number(value) }
          })}
          min={0}
          max={100}
          decimalScale={2}
        />
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setShowAuxiliaryMaterialsModal(false)}>
            取消
          </Button>
          <Button onClick={() => setShowAuxiliaryMaterialsModal(false)} style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}>
            保存
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  // 渲染其他费用配置弹窗
  const renderOtherModal = () => {
    // 初始化临时配置（当弹窗打开时）
    React.useEffect(() => {
      if (showOtherModal && !tempOtherConfig) {
        setTempOtherConfig({...costConfig.otherExpenses});
      }
    }, [showOtherModal, costConfig.otherExpenses, tempOtherConfig]);
    
    // 保存其他费用配置
    const handleSaveOtherConfig = () => {
      if (tempOtherConfig) {
        // 将临时配置更新到全局状态
        updateCostConfig({
          otherExpenses: tempOtherConfig
        });
        
        // 清除临时配置
        setTempOtherConfig(null);
        
        // 关闭弹窗
        setShowOtherModal(false);
        
        // 显示成功通知
        notifications.show({
          title: '保存成功',
          message: '其他费用配置已保存',
          color: 'green',
        });
      }
    };
    
    // 取消编辑
    const handleCancelOtherConfig = () => {
      // 清除临时配置
      setTempOtherConfig(null);
      // 关闭弹窗
      setShowOtherModal(false);
    };
    
    const currentConfig = tempOtherConfig || costConfig.otherExpenses;
    
    return (
      <Modal
        opened={showOtherModal}
        onClose={handleCancelOtherConfig}
        title="其他费用配置"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="费用类型"
            value="直接填金额"
            disabled
            styles={{
              input: { backgroundColor: '#f8f9fa' }
            }}
          />
          
          <NumberInput
            label="直接金额（万元）"
            value={currentConfig.directAmount || 0}
            onChange={(value) => setTempOtherConfig({
              ...currentConfig,
              directAmount: Number(value)
            })}
            min={0}
            decimalScale={2}
          />
          
          <Checkbox
            label="应用达产率"
            checked={currentConfig.applyProductionRate}
            onChange={(event) => setTempOtherConfig({
              ...currentConfig,
              applyProductionRate: event.currentTarget.checked
            })}
          />
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleCancelOtherConfig}>
              取消
            </Button>
            <Button
              onClick={handleSaveOtherConfig}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  };
  
  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="md" fw={600} c="#1D2129">
            总成本费用配置
          </Text>
          <Group gap="xs">
            <Tooltip label="查看成本详表">
              <ActionIcon
                variant="light"
                color="cyan"
                size="lg"
                onClick={() => setShowCostDetailModal(true)}
              >
                <IconTable size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Card with actions grid */}
        <Card withBorder radius="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>成本配置项</Text>
          </Group>
          <SimpleGrid cols={3} mt="md">
            {costItemsData.map((item) => (
              <UnstyledButton 
                key={item.title} 
                onClick={item.onClick}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#165DFF'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
              >
                <item.icon color="#165DFF" size={32} />
                <Text size="xs" mt={7}>
                  {item.title}
                </Text>
              </UnstyledButton>
            ))}
            
            {/* 修理费配置按钮 */}
            <UnstyledButton 
              onClick={() => setShowRepairModal(true)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#165DFF'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            >
              <IconTools color="#165DFF" size={32} />
              <Text size="xs" mt={7}>
                修理费
              </Text>
            </UnstyledButton>
            
            {/* 其他费用配置按钮 */}
            <UnstyledButton 
              onClick={() => setShowOtherModal(true)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#165DFF'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            >
              <IconDots color="#165DFF" size={32} />
              <Text size="xs" mt={7}>
                其他费用
              </Text>
            </UnstyledButton>
          </SimpleGrid>
        </Card>
      </Stack>
      
      {/* 成本详表弹窗 */}
      <Modal
        opened={showCostDetailModal}
        onClose={async () => {
          const success = await handleSaveCostTableData();
          if (success) {
            setShowCostDetailModal(false);
          }
        }}
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 总成本费用估算表
            </Text>
            <Tooltip label="导出Excel">
              <ActionIcon
                variant="light"
                color="green"
                size={18}
                onClick={handleExportCostTable}
              >
                <IconDownload size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        {(() => {
          if (!context) return <Text c="red">项目上下文未加载</Text>

          const years = operationYears;

          return (
            <>
              <Table striped withTableBorder style={{ fontSize: '11px' }}>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                    <Table.Th colSpan={context.operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>操作</Table.Th>
                  </Table.Tr>
                  <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                    {years.map((year) => (
                      <Table.Th key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {year}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {tableData?.rows.map((row) => (
                    <Table.Tr key={row.序号}>
                      <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{row.序号}</Table.Td>
                      <Table.Td style={{ border: '1px solid #dee2e6' }}>{row.成本项目}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumber(row.合计)}
                      </Table.Td>
                      {row.运营期.map((value, index) => (
                        <Table.Td key={index} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {formatNumber(value)}
                        </Table.Td>
                      ))}
                      <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {row.序号 === '1.1' && (
                          <Group gap={4} justify="center">
                            <Tooltip label="编辑">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => setShowRawMaterialsModal(true)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        )}
                        {row.序号 === '1.2' && (
                          <Group gap={4} justify="center">
                            <Tooltip label="编辑">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => setShowFuelPowerModal(true)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        )}
                        {row.序号 === '1.3' && (
                          <Group gap={4} justify="center">
                            <Tooltip label="编辑">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => setShowWagesModal(true)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        )}
                        {row.序号 === '1.4' && (
                          <Group gap={4} justify="center">
                            <Tooltip label="编辑">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => setShowRepairModal(true)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        )}
                        {row.序号 === '1.5' && (
                          <Group gap={4} justify="center">
                            <Tooltip label="编辑">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => setShowOtherModal(true)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              
              {/* 添加说明文本 */}
              <Text size="sm" c="#666" mt="md">
                💡 进项税额根据各原材料独立税率分别计算后合计，不采用统一税率
              </Text>
            </>
          )
        })()}
      </Modal>
      
      {/* 外购原材料费估算表弹窗 */}
      {renderRawMaterialsModal()}
      
      {/* 外购燃料及动力费估算表弹窗 */}
      {renderFuelPowerModal()}
      
      {/* 辅助材料费用配置弹窗 */}
      {renderAuxiliaryMaterialsModal()}
      
      {/* 原材料编辑弹窗 */}
      {renderRawMaterialEditModal()}
      
      {/* 燃料及动力费编辑弹窗 */}
      {renderFuelPowerEditModal()}
      
      {/* 修理费配置弹窗 */}
      {renderRepairModal()}
      
      {/* 其他费用配置弹窗 */}
      {renderOtherModal()}
      
      {/* 工资及福利费配置弹窗 */}
      <WagesModal 
        opened={showWagesModal}
        onClose={() => setShowWagesModal(false)}
        costConfig={costConfig}
        updateCostConfig={updateCostConfig}
      />
    </>
  )
}

export default DynamicCostTable
