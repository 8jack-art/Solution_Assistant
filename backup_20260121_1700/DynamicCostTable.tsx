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
  IconDownload,
  IconReceipt,
  IconCoin,
  IconX
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, calculateTaxableIncome, calculateNonTaxIncome, type RevenueItem, type FuelPowerItem, type CostConfig } from '@/stores/revenueCostStore'
import { revenueCostApi, investmentApi, projectApi } from '@/lib/api'
import * as XLSXStyle from 'xlsx-js-style'
import WagesModal from './WagesModal'

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
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
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
      return revenueBase * (item.percentage || 0) / PERCENTAGE_MULTIPLIER;
    case 'quantityPrice':
      return (item.quantity || 0) * (item.unitPrice || 0);
    case 'directAmount':
      return item.directAmount || 0;
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
  
  // 管理费用配置弹窗状态
  const [showManagementModal, setShowManagementModal] = useState(false)
  // 管理费用临时配置状态
  const [tempManagementConfig, setTempManagementConfig] = useState<any>(null)
  
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
      expenseType: 'directAmount', // 费用类型: directAmount=直接填金额, landTransfer=土地流转费
      name: '其他费用', // 费用名称
      directAmount: 0, // 直接金额
      acreage: 0, // 亩数（土地流转费类型使用）
      unitPrice: 0, // 单价（万元/亩，土地流转费类型使用）
      taxRate: 9, // 费用税率（默认9%）
      applyProductionRate: false, // 默认关闭
      remark: '', // 备注字段
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
    },
    // 管理费用配置
    management: {
      directAmount: 0, // 直接金额
      applyProductionRate: false, // 是否应用达产率
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
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      // 外购原材料（含税）
      let totalWithTax = 0;
      (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        // 根据用户反馈：baseAmount是含税金额
        totalWithTax += baseAmount * productionRate;
      });
      
      // 进项税额
      let totalInputTax = 0;
      (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        const taxRate = Number(item.taxRate) || 0;
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
        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      
      // 计算该年的外购原材料（含税）总额
      let yearTotalWithTax = 0;
      // 计算该年的进项税额总额
      let yearTotalInputTax = 0;
      
      (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        
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
    return (revenueItems || []).reduce((sum, item) => sum + calculateTaxableIncome(item), 0);
  }, [revenueItems]);

  // ============================================
  // 【大模型编程规范重构】外购原材料费估算表数据前置计算
  // ============================================
  const rawMaterialsTableData = useMemo(() => {
    if (!context) return null;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 计算各年的达产率
    const getProductionRate = (year: number) => 
      costConfig.rawMaterials.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === year)?.rate ?? 1)
        : 1;
    
    // 计算单个原材料项目的年度金额
    const calculateItemYearAmount = (item: CostItem, year: number) => {
      const productionRate = getProductionRate(year);
      if (item.sourceType === 'percentage') {
        let revenueBase = 0;
        if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
          revenueBase = (revenueItems || []).reduce(
            (sum, revItem) => sum + calculateTaxableIncome(revItem), 
            0
          );
        } else {
          const revItem = revenueItems?.find(r => r.id === item.linkedRevenueId);
          if (revItem) {
            revenueBase = calculateTaxableIncome(revItem);
          }
        }
        return (revenueBase * (item.percentage ?? 0) / 100) * productionRate;
      } else if (item.sourceType === 'quantityPrice') {
        return ((item.quantity ?? 0) * (item.unitPrice ?? 0)) * productionRate;
      } else {
        return (item.directAmount ?? 0) * productionRate;
      }
    };
    
    // 计算单个原材料项目的合计金额
    const calculateItemTotalAmount = (item: CostItem) => {
      return years.reduce((sum, year) => sum + calculateItemYearAmount(item, year), 0);
    };
    
    // 计算所有原材料的年度总额
    const calculateYearTotal = (year: number) => {
      return (costConfig.rawMaterials.items || []).reduce(
        (sum, item) => sum + calculateItemYearAmount(item, year),
        0
      );
    };
    
    // 计算所有原材料的合计总额
    const calculateTotalAmount = () => {
      return years.reduce((sum, year) => sum + calculateYearTotal(year), 0);
    };
    
    // 计算年度进项税额
    const calculateYearInputTax = (year: number) => {
      const productionRate = getProductionRate(year);
      return (costConfig.rawMaterials.items || []).reduce((sum, item) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        const taxRate = Number(item.taxRate) ?? 0;
        const taxRateDecimal = taxRate / 100;
        return sum + baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
      }, 0);
    };
    
    // 计算进项税额合计
    const calculateTotalInputTax = () => {
      return years.reduce((sum, year) => sum + calculateYearInputTax(year), 0);
    };
    
    // 计算年度外购原材料（除税）
    const calculateYearExcludingTax = (year: number) => {
      const productionRate = getProductionRate(year);
      let totalWithTax = 0;
      let totalInputTax = 0;
      
      (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        const taxRate = Number(item.taxRate) ?? 0;
        const taxRateDecimal = taxRate / 100;
        totalWithTax += baseAmount * productionRate;
        totalInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
      });
      
      return totalWithTax - totalInputTax;
    };
    
    // 计算外购原材料（除税）合计
    const calculateTotalExcludingTax = () => {
      return years.reduce((sum, year) => sum + calculateYearExcludingTax(year), 0);
    };
    
    // 构建表格行数据
    const rows = [
      {
        id: '1',
        rowKey: 'row-1',
        serialNumber: '1',
        name: '外购原材料',
        total: calculateTotalAmount(),
        years: years.map(year => ({
          year,
          value: calculateYearTotal(year)
        }))
      },
      ...(costConfig.rawMaterials.items || []).map((item: CostItem, idx: number) => ({
        id: `item-${item.id}`,
        rowKey: `row-1.${idx + 1}`,
        serialNumber: `1.${idx + 1}`,
        name: item.name,
        total: calculateItemTotalAmount(item),
        years: years.map(year => ({
          year,
          value: calculateItemYearAmount(item, year)
        }))
      })),
      {
        id: '2',
        rowKey: 'row-2',
        serialNumber: '2',
        name: '辅助材料费用',
        total: 0,
        years: years.map(year => ({
          year,
          value: 0
        }))
      },
      {
        id: '3',
        rowKey: 'row-3',
        serialNumber: '3',
        name: '其他',
        total: 0,
        years: years.map(year => ({
          year,
          value: 0
        }))
      },
      {
        id: '4',
        rowKey: 'row-4',
        serialNumber: '4',
        name: '进项税额',
        total: calculateTotalInputTax(),
        years: years.map(year => ({
          year,
          value: calculateYearInputTax(year)
        }))
      },
      {
        id: '5',
        rowKey: 'row-5',
        serialNumber: '5',
        name: '外购原材料（除税）',
        total: calculateTotalExcludingTax(),
        years: years.map(year => ({
          year,
          value: calculateYearExcludingTax(year)
        }))
      }
    ];
    
    return {
      rows,
      years,
      applyProductionRate: costConfig.rawMaterials.applyProductionRate,
      yearsData: years.map(year => ({
        year,
        productionRate: getProductionRate(year),
        total: calculateYearTotal(year),
        inputTax: calculateYearInputTax(year),
        excludingTax: calculateYearExcludingTax(year)
      }))
    };
  }, [context, costConfig.rawMaterials, productionRates, revenueItems]);

  // ============================================
  // 【大模型编程规范重构】外购燃料和动力费估算表数据前置计算
  // ============================================
  const fuelPowerTableData = useMemo(() => {
    if (!context) return null;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 计算各年的达产率
    const getProductionRate = (year: number) => 
      costConfig.fuelPower.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === year)?.rate ?? 1)
        : 1;
    
    // 计算单个燃料项目的年度金额
    const calculateItemYearAmount = (item: FuelPowerItem, year: number) => {
      const productionRate = getProductionRate(year);
      const consumption = item.consumption ?? 0;
      if (['汽油', '柴油'].includes(item.name)) {
        return ((item.price ?? 0) * consumption / 10000) * productionRate;
      } else {
        return consumption * (item.price ?? 0) * productionRate;
      }
    };
    
    // 计算单个燃料项目的合计金额
    const calculateItemTotalAmount = (item: FuelPowerItem) => {
      return years.reduce((sum, year) => sum + calculateItemYearAmount(item, year), 0);
    };
    
    // 计算所有燃料的年度总额
    const calculateYearTotal = (year: number) => {
      return (costConfig.fuelPower.items || []).reduce(
        (sum, item) => sum + calculateItemYearAmount(item, year),
        0
      );
    };
    
    // 计算所有燃料的合计总额
    const calculateTotalAmount = () => {
      return years.reduce((sum, year) => sum + calculateYearTotal(year), 0);
    };
    
    // 计算年度进项税额
    const calculateYearInputTax = (year: number) => {
      const productionRate = getProductionRate(year);
      return (costConfig.fuelPower.items || []).reduce((sum, item) => {
        const consumption = item.consumption ?? 0;
        let amount = 0;
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price ?? 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price ?? 0) * productionRate;
        }
        const taxRate = (item.taxRate ?? 13) / 100;
        return sum + amount * taxRate / (1 + taxRate);
      }, 0);
    };
    
    // 计算进项税额合计
    const calculateTotalInputTax = () => {
      return years.reduce((sum, year) => sum + calculateYearInputTax(year), 0);
    };
    
    // 计算年度外购燃料及动力（除税）
    const calculateYearExcludingTax = (year: number) => {
      return calculateYearTotal(year) - calculateYearInputTax(year);
    };
    
    // 计算外购燃料及动力（除税）合计
    const calculateTotalExcludingTax = () => {
      return years.reduce((sum, year) => sum + calculateYearExcludingTax(year), 0);
    };
    
    // 构建表格行数据
    const rows = [
      {
        id: '1',
        rowKey: 'row-1',
        serialNumber: '1',
        name: '燃料、动力费',
        total: calculateTotalAmount(),
        years: years.map(year => ({
          year,
          value: calculateYearTotal(year)
        }))
      },
      ...(costConfig.fuelPower.items || []).map((item: FuelPowerItem, idx: number) => ({
        id: `item-${item.id}`,
        rowKey: `row-1.${idx + 1}`,
        serialNumber: `1.${idx + 1}`,
        name: item.name,
        total: calculateItemTotalAmount(item),
        years: years.map(year => ({
          year,
          value: calculateItemYearAmount(item, year)
        }))
      })),
      {
        id: '2',
        rowKey: 'row-2',
        serialNumber: '2',
        name: '进项税额',
        total: calculateTotalInputTax(),
        years: years.map(year => ({
          year,
          value: calculateYearInputTax(year)
        }))
      },
      {
        id: '3',
        rowKey: 'row-3',
        serialNumber: '3',
        name: '外购燃料及动力（除税）',
        total: calculateTotalExcludingTax(),
        years: years.map(year => ({
          year,
          value: calculateYearExcludingTax(year)
        }))
      }
    ];
    
    return {
      rows,
      years,
      applyProductionRate: costConfig.fuelPower.applyProductionRate,
      yearsData: years.map(year => ({
        year,
        productionRate: getProductionRate(year),
        total: calculateYearTotal(year),
        inputTax: calculateYearInputTax(year),
        excludingTax: calculateYearExcludingTax(year)
      }))
    };
  }, [context, costConfig.fuelPower, productionRates]);

  // ============================================
  // 【大模型编程规范重构】工资及福利费用估算表数据前置计算
  // ============================================
  const wagesTableData = useMemo(() => {
    if (!context) return null;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 计算指定年份的工资及福利费
    const calculateYearWages = (year: number) => {
      let yearWages = 0;
      
      if (costConfig.wages.items && costConfig.wages.items.length > 0) {
        costConfig.wages.items.forEach((item: any) => {
          let currentSalary = item.salaryPerEmployee ?? 0;
          
          if (item.changeInterval && item.changePercentage) {
            const adjustmentTimes = Math.floor((year - 1) / item.changeInterval);
            currentSalary = currentSalary * Math.pow(1 + item.changePercentage / 100, adjustmentTimes);
          }
          
          const yearlySubtotal = item.employees * currentSalary;
          const yearlyWelfare = yearlySubtotal * (item.welfareRate ?? 0) / 100;
          yearWages += yearlySubtotal + yearlyWelfare;
        });
      } else {
        yearWages = costConfig.wages.directAmount ?? 0;
      }
      
      return yearWages;
    };
    
    // 计算所有年份的工资及福利费合计
    const calculateTotalWages = () => {
      return years.reduce((sum, year) => sum + calculateYearWages(year), 0);
    };
    
    // 构建表格行数据
    const rows = [
      {
        id: '1',
        rowKey: 'row-1',
        serialNumber: '1',
        name: '工资及福利费',
        total: calculateTotalWages(),
        years: years.map(year => ({
          year,
          value: calculateYearWages(year)
        }))
      }
    ];
    
    return {
      rows,
      years,
      yearsData: years.map(year => ({
        year,
        value: calculateYearWages(year)
      }))
    };
  }, [context, costConfig.wages]);

  // ============================================
  // 【大模型编程规范重构】总成本费用估算表数据前置计算
  // ============================================
  
  // 计算工资及福利费合计的函数（需要放在totalCostTableData之前）
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
  }, [costConfig.wages, productionRates]);

  // 计算外购燃料及动力（除税）的函数（需要放在totalCostTableData之前）
  const calculateFuelPowerExcludingTax = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      // 计算指定年份的外购燃料及动力（除税）
      const productionRate = costConfig.fuelPower.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      let yearFuelPowerTotal = 0;  // 燃料、动力费总额
      let yearInputTaxTotal = 0;   // 进项税额总额
      
      (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
        const consumption = item.consumption || 0;
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

  // 计算管理费用的函数（需要放在totalCostTableData之前）
  const calculateManagementExpenses = useCallback((targetYear?: number, yearsArray?: number[]) => {
    // 防御性检查：如果 management 配置不存在，使用默认值
    const managementConfig = costConfig.management || { directAmount: 0, applyProductionRate: false };
    
    if (targetYear !== undefined) {
      // 计算指定年份的管理费用
      const productionRate = managementConfig.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      const directAmount = managementConfig.directAmount || 0;
      return directAmount * productionRate;
    } else {
      // 计算所有年份的管理费用合计
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateManagementExpenses(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.management, productionRates]);

  const totalCostTableData = useMemo(() => {
    if (!context) return null;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 获取各年的达产率
    const getProductionRate = (year: number) => 
      productionRates?.find(p => p.yearIndex === year)?.rate ?? 1;
    
    // 计算营业成本各组成部分
    const calculateRawMaterials = (year: number) => 
      calculateRawMaterialsExcludingTax(year, years);
    
    const calculateFuelPower = (year: number) => 
      calculateFuelPowerExcludingTax(year, years);
    
    const calculateWages = (year: number) => 
      calculateWagesTotal(year, years);
    
    const calculateRepair = () => {
      if (costConfig.repair.type === 'percentage') {
        return fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets ?? 0) / 100;
      }
      return costConfig.repair.directAmount ?? 0;
    };
    
    const calculateOtherExpenses = (year: number) => {
      // 土地流转费类型：固定金额，不应用达产率
      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
      
      // 土地流转费：亩数 × 单价，不应用达产率
      if (isLandTransfer) {
        const acreage = costConfig.otherExpenses.acreage ?? 0;
        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
        const landTransferAmount = acreage * unitPrice; // 亩数 × 单价 = 费用金额（万元）
        
        // 土地流转费税率为0%，所以含税金额 = 不含税金额，不应用达产率
        return landTransferAmount;
      }
      
      // 其他类型：应用达产率
      const productionRate = costConfig.otherExpenses.applyProductionRate 
        ? getProductionRate(year) 
        : 1;
      
      if (costConfig.otherExpenses.type === 'percentage') {
        const revenueBase = (revenueItems || []).reduce(
          (sum, revItem) => sum + calculateTaxableIncome(revItem), 
          0
        );
        return revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRate;
      }
      
      // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
      // 其他费用金额是含税金额，需要计算除税金额
      const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
      const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
      // 进项税额 = 含税金额 / (1 + 税率) × 税率
      const inputTax = directAmount * taxRate / (1 + taxRate);
      // 其他费用（除税）= 含税金额 - 进项税额
      return directAmount - inputTax;
    };
    
    // 计算营业成本
    const calculateOperatingCost = (year: number) => {
      return (
        calculateRawMaterials(year) +
        calculateFuelPower(year) +
        calculateWages(year) +
        calculateRepair() +
        calculateOtherExpenses(year)
      );
    };
    
    // 计算营业成本合计
    const calculateOperatingCostTotal = () => {
      return years.reduce((sum, year) => sum + calculateOperatingCost(year), 0);
    };
    
    // 计算利息支出
    const calculateInterest = (year: number) => {
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
        return interestRow.分年数据[year - 1];
      }
      return 0;
    };
    
    // 计算利息支出合计
    const calculateInterestTotal = () => {
      return years.reduce((sum, year) => sum + calculateInterest(year), 0);
    };
    
    // 计算折旧费
    const calculateDepreciation = (year: number) => {
      const yearIndex = year - 1;
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      return ((rowA?.分年数据[yearIndex] ?? 0) + (rowD?.分年数据[yearIndex] ?? 0));
    };
    
    // 计算折旧费合计
    const calculateDepreciationTotal = () => {
      return years.reduce((sum, year) => sum + calculateDepreciation(year), 0);
    };
    
    // 计算摊销费
    const calculateAmortization = (year: number) => {
      const yearIndex = year - 1;
      const rowE = depreciationData.find(row => row.序号 === 'E');
      return rowE?.分年数据[yearIndex] ?? 0;
    };
    
    // 计算摊销费合计
    const calculateAmortizationTotal = () => {
      return years.reduce((sum, year) => sum + calculateAmortization(year), 0);
    };
    
    // 计算总成本费用合计
    const calculateTotalCost = (year: number) => {
      return (
        calculateOperatingCost(year) +
        calculateManagementExpenses(year, years) +
        calculateInterest(year) +
        calculateDepreciation(year) +
        calculateAmortization(year)
      );
    };
    
    // 计算总成本费用合计的合计
    const calculateTotalCostTotal = () => {
      return years.reduce((sum, year) => sum + calculateTotalCost(year), 0);
    };
    
    // 构建表格行数据
    const rows = [
      {
        id: '1',
        rowKey: 'row-1',
        serialNumber: '1',
        name: '营业成本',
        total: calculateOperatingCostTotal(),
        years: years.map(year => ({
          year,
          value: calculateOperatingCost(year)
        }))
      },
      {
        id: '1.1',
        rowKey: 'row-1.1',
        serialNumber: '1.1',
        name: '外购原材料费',
        total: calculateRawMaterialsExcludingTax(undefined, years),
        years: years.map(year => ({
          year,
          value: calculateRawMaterials(year)
        }))
      },
      {
        id: '1.2',
        rowKey: 'row-1.2',
        serialNumber: '1.2',
        name: '外购燃料及动力费',
        total: calculateFuelPowerExcludingTax(undefined, years),
        years: years.map(year => ({
          year,
          value: calculateFuelPower(year)
        }))
      },
      {
        id: '1.3',
        rowKey: 'row-1.3',
        serialNumber: '1.3',
        name: '工资及福利费',
        total: calculateWagesTotal(undefined, years),
        years: years.map(year => ({
          year,
          value: calculateWages(year)
        }))
      },
      {
        id: '1.4',
        rowKey: 'row-1.4',
        serialNumber: '1.4',
        name: '修理费',
        total: calculateRepair() * years.length,
        years: years.map(year => ({
          year,
          value: calculateRepair()
        }))
      },
      {
        id: '1.5',
        rowKey: 'row-1.5',
        serialNumber: '1.5',
        name: '其他费用',
        total: years.reduce((sum, year) => sum + calculateOtherExpenses(year), 0),
        years: years.map(year => ({
          year,
          value: calculateOtherExpenses(year)
        }))
      },
      {
        id: '2',
        rowKey: 'row-2',
        serialNumber: '2',
        name: '管理费用',
        total: calculateManagementExpenses(undefined, years),
        years: years.map(year => ({
          year,
          value: calculateManagementExpenses(year, years)
        }))
      },
      {
        id: '3',
        rowKey: 'row-3',
        serialNumber: '3',
        name: '利息支出',
        total: calculateInterestTotal(),
        years: years.map(year => ({
          year,
          value: calculateInterest(year)
        }))
      },
      {
        id: '4',
        rowKey: 'row-4',
        serialNumber: '4',
        name: '折旧费',
        total: calculateDepreciationTotal(),
        years: years.map(year => ({
          year,
          value: calculateDepreciation(year)
        }))
      },
      {
        id: '5',
        rowKey: 'row-5',
        serialNumber: '5',
        name: '摊销费',
        total: calculateAmortizationTotal(),
        years: years.map(year => ({
          year,
          value: calculateAmortization(year)
        }))
      },
      {
        id: '6',
        rowKey: 'row-6',
        serialNumber: '6',
        name: '开发成本',
        total: 0,
        years: years.map(year => ({
          year,
          value: 0
        }))
      },
      {
        id: '7',
        rowKey: 'row-7',
        serialNumber: '7',
        name: '总成本费用合计',
        total: calculateTotalCostTotal(),
        years: years.map(year => ({
          year,
          value: calculateTotalCost(year)
        }))
      }
    ];
    
    return {
      rows,
      years,
      operatingCostData: years.map(year => ({
        year,
        rawMaterials: calculateRawMaterials(year),
        fuelPower: calculateFuelPower(year),
        wages: calculateWages(year),
        repair: calculateRepair(),
        otherExpenses: calculateOtherExpenses(year),
        operatingCost: calculateOperatingCost(year),
        interest: calculateInterest(year),
        depreciation: calculateDepreciation(year),
        amortization: calculateAmortization(year),
        totalCost: calculateTotalCost(year)
      }))
    };
  }, [
    context, 
    costConfig.repair, 
    costConfig.otherExpenses, 
    costConfig.management,
    fixedAssetsInvestment, 
    productionRates, 
    revenueItems,
    repaymentTableData,
    depreciationData,
    calculateRawMaterialsExcludingTax
  ]);

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
      centered
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
            allowDeselect={false}
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
                  ...(revenueItems || []).map((item: RevenueItem) => ({
                    value: item.id,
                    label: `${item.name} (年收入: ${calculateTaxableIncome(item).toFixed(2)}万元)`
                  }))                ]}
                placeholder="请选择收入项目"
                value={currentRawMaterial.linkedRevenueId || 'total'}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, linkedRevenueId: value || undefined})}
                allowDeselect={false}
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
            <SimpleGrid cols={3}>
              <NumberInput
                label="数量"
                value={currentRawMaterial.quantity}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, quantity: Number(value)})}
                min={0}
              />
              <TextInput
                label="单位"
                value={currentRawMaterial.unit || ''}
                onChange={(e) => setCurrentRawMaterial({...currentRawMaterial, unit: e.target.value})}
                placeholder="如：吨、件、kg等"
              />
              <NumberInput
                label="单价（万元）"
                value={currentRawMaterial.unitPrice}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, unitPrice: Number(value)})}
                min={0}
                decimalScale={4}
              />
            </SimpleGrid>
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
                        : (revenueItems || []).find((item: RevenueItem) => item.id === currentRawMaterial.linkedRevenueId)
                      
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
                    let revenueBase = 0;
                    let unit = '万元';
                    if (currentRawMaterial.linkedRevenueId === 'total') {
                      // 整个项目收入 - 使用外层计算好的 totalRevenue 变量
                      revenueBase = totalRevenue;
                    } else {
                      // 特定收入项
                      const selectedItem = (revenueItems || []).find((item: RevenueItem) => item.id === currentRawMaterial.linkedRevenueId);
                      if (selectedItem) {
                        revenueBase = calculateTaxableIncome(selectedItem);
                        unit = '万元';
                      }
                    }
                    
                    // 应用百分比
                    const amount = revenueBase * currentRawMaterial.percentage / 100;
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
                  const newItems = [...(costConfig.rawMaterials.items || [])];
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
  const renderRawMaterialsModal = () => (
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
                  name: `原材料${(costConfig.rawMaterials.items || []).length + 1}`,
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
                    items: [...(costConfig.rawMaterials.items || []), newItem]
                  }
                });
              }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>      }
      size="calc(100vw - 100px)"
      centered
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      {(() => {
        if (!context) return <Text c="red">项目上下文未加载</Text>

        const operationYears = context.operationYears
        const years = Array.from({ length: operationYears }, (_, i) => i + 1)

        return (
          <>
            <Table striped withTableBorder style={{ fontSize: '11px' }}>
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                  <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
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
                {/* 1. 外购原材料 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 序号1合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach((year) => {
                        const productionRate = costConfig.rawMaterials.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        // 计算该年的外购原材料总额
                        let yearTotal = 0;
                        (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
                          if (item.sourceType === 'percentage') {
                            // 根据收入百分比计算
                            let revenueBase = 0;
                            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                              // 整个项目收入
                              revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                            } else {
                              // 特定收入项
                              const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                              if (revItem) {
                                revenueBase = calculateTaxableIncome(revItem);
                              }
                            }
                            yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                          } else if (item.sourceType === 'quantityPrice') {
                            // 数量×单价
                            yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                          } else if (item.sourceType === 'directAmount') {
                            // 直接金额
                            yearTotal += (item.directAmount || 0) * productionRate;
                          }
                        });
                        
                        // 累加到总合计
                        totalSum += yearTotal;
                      });
                      
                      return formatNumberNoRounding(totalSum);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const productionRate = costConfig.rawMaterials.applyProductionRate 
                      ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                    
                    // 序号1 = 合计其下辖子项（1.1, 1.2, 1.3...）该年的值
                    let yearTotal = 0;
                    (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
                      if (item.sourceType === 'percentage') {
                        // 根据收入百分比计算
                        let revenueBase = 0;
                        if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                          // 整个项目收入
                          revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                        } else {
                          // 特定收入项
                          const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                          if (revItem) {
                            revenueBase = calculateTaxableIncome(revItem);
                          }
                        }
                        yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                      } else if (item.sourceType === 'quantityPrice') {
                        // 数量×单价
                        yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                      } else if (item.sourceType === 'directAmount') {
                        // 直接金额
                        yearTotal += (item.directAmount || 0) * productionRate;
                      }
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumberNoRounding(yearTotal)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为1的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 1.1, 1.2, 1.3... 原材料项 */}
                {(costConfig.rawMaterials.items || []).map((item: CostItem, idx: number) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.{idx + 1}</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>
                      {item.name}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 该原材料项目合计列 = 运营期各年数值的总和
                        let totalSum = 0;
                        
                        // 遍历运营期各年
                        years.forEach((year) => {
                          const productionRate = costConfig.rawMaterials.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          // 计算该年的原材料项目金额
                          let yearAmount = 0;
                          if (item.sourceType === 'percentage') {
                            // 根据收入百分比计算
                            let revenueBase = 0;
                            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                              // 整个项目收入
                              revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                            } else {
                              // 特定收入项
                              const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                              if (revItem) {
                                revenueBase = calculateTaxableIncome(revItem);
                              }
                            }
                            yearAmount = revenueBase * (item.percentage || 0) / 100 * productionRate;
                          } else if (item.sourceType === 'quantityPrice') {
                            // 数量×单价
                            yearAmount = (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                          } else if (item.sourceType === 'directAmount') {
                            // 直接金额
                            yearAmount = (item.directAmount || 0) * productionRate;
                          }
                          
                          // 累加到总合计
                          totalSum += yearAmount;
                        });
                        
                        return formatNumberNoRounding(totalSum);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      // 计算该年的金额
                      let yearTotal = 0;
                      if (item.sourceType === 'percentage') {
                        // 根据收入百分比计算
                        let revenueBase = 0;
                        if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                            // 整个项目收入
                            revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                          } else {
                          // 特定收入项
                          const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                          if (revItem) {
                            revenueBase = calculateTaxableIncome(revItem);
                          }
                        }
                        yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                      } else if (item.sourceType === 'quantityPrice') {
                        // 数量×单价
                        yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                      } else if (item.sourceType === 'directAmount') {
                        // 直接金额
                        yearTotal += (item.directAmount || 0) * productionRate;
                      }
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {formatNumberNoRounding(yearTotal)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => {
                              setCurrentRawMaterial({...item});
                              setRawMaterialIndex(idx);
                              setShowRawMaterialEditModal(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="删除">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => {
                              const newItems = (costConfig.rawMaterials.items || []).filter((_: CostItem, i: number) => i !== idx);
                              updateCostConfig({
                                rawMaterials: {
                                  ...costConfig.rawMaterials,
                                  items: newItems
                                }
                              });
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                
                {/* 2. 辅助材料费用 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>辅助材料费用</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 辅助材料费用合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach(() => {
                        // 当前辅助材料费用各年都是0.00
                        totalSum += 0.00;
                      });
                      
                      return formatNumberNoRounding(totalSum);
                    })()}
                  </Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                </Table.Tr>                
                {/* 3. 其他 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>其他</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 其他费用合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach(() => {
                        // 当前其他费用各年都是0.00
                        totalSum += 0.00;
                      });
                      
                      return formatNumberNoRounding(totalSum);
                    })()}
                  </Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号3的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 4. 进项税额 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>进项税额</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 进项税额合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach((year) => {
                        // 计算该年的进项税总额
                        let yearInputTax = 0;
                        (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
                          const baseAmount = calculateBaseAmount(item, revenueItems || []);
                          // 应用达产率
                          const productionRate = costConfig.rawMaterials.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          // 正确的进项税计算公式：含税金额 / (1 + 税率) × 税率
                          const taxRate = Number(item.taxRate) || 0;
                          const taxRateDecimal = taxRate / 100;
                          yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                        });
                        
                        // 累加到总合计
                        totalSum += yearInputTax;
                      });
                      
                      return formatNumberNoRounding(totalSum);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    // 计算该年的进项税总额
                    let yearInputTax = 0;
                    (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
                      const baseAmount = calculateBaseAmount(item, revenueItems || []);
                      // 应用达产率
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      // 正确的进项税计算公式：含税金额 / (1 + 税率) × 税率
                      const taxRate = Number(item.taxRate) || 0;
                      const taxRateDecimal = taxRate / 100;
                      yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumberNoRounding(yearInputTax)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为3的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 5. 外购原材料（除税） */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料（除税）</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {formatNumberNoRounding(calculateRawMaterialsExcludingTax(undefined, years))}
                  </Table.Td>
                  {years.map((year) => {
                    // 计算该年的外购原材料（除税）
                    const productionRate = costConfig.rawMaterials.applyProductionRate 
                      ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                    
                    // 外购原材料（含税）
                    let totalWithTax = 0;
                    (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
                      const baseAmount = calculateBaseAmount(item, revenueItems || []);
                      const taxRate = Number(item.taxRate) || 0;
                      const taxRateDecimal = taxRate / 100;
                      // 根据用户反馈：baseAmount是含税金额
                      totalWithTax += baseAmount * productionRate;
                    });
                    
                    // 进项税额
                    let totalInputTax = 0;
                    (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
                      const baseAmount = calculateBaseAmount(item, revenueItems || []);
                      const taxRate = Number(item.taxRate) || 0;
                      const taxRateDecimal = taxRate / 100;
                      // 正确的进项税额计算公式：含税金额 / (1 + 税率) × 税率
                      totalInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                    });
                    
                    // 外购原材料（除税） = 外购原材料（含税） - 进项税额
                    const excludingTax = totalWithTax - totalInputTax;
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumberNoRounding(excludingTax)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为5的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
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
            </>
          )
        })()}
      </Modal>
  );
  // 计算固定资产投资金额：折旧与摊销估算表中A与D原值的合减去投资估算简表中"建设期利息"的数值
  const calculateFixedAssetsInvestment = async (): Promise<number> => {
    let fixedAssetsValue = 0;
    
    // 获取折旧与摊销估算表中A和D的原值
    if (depreciationData.length > 0) {
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      
      if (rowA && rowD) {
        // 使用原值字段计算固定资产投资
        fixedAssetsValue = (rowA.原值 || 0) + (rowD.原值 || 0);
      }
    }
    
    // 减去建设期利息
    let constructionInterest = 0;
    
    // 尝试从投资估算API获取建设期利息
    try {
      if (context?.projectId) {
        console.log('[DEBUG] 获取建设期利息，项目ID:', context.projectId);
        const investmentResponse = await investmentApi.getByProjectId(context.projectId);
        
        console.log('[DEBUG] 投资估算API响应:', {
          success: investmentResponse.success,
          hasData: !!investmentResponse.data,
          hasEstimate: !!investmentResponse.data?.estimate,
          hasConstructionInterest: investmentResponse.data?.estimate?.construction_interest !== undefined
        });
        
        if (investmentResponse.success) {
          // 根据用户提供的数据结构，construction_interest在data.estimate层级
          if (investmentResponse.data?.estimate?.construction_interest !== undefined) {
            constructionInterest = parseFloat(investmentResponse.data.estimate.construction_interest);
            console.log('[DEBUG] 建设期利息值:', constructionInterest);
          }
        }
      }
    } catch (error) {
      console.warn('[DEBUG] 获取建设期利息失败:', error);
      // 静默处理错误
    }
    
    return fixedAssetsValue - constructionInterest;
  };
    
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
          centered
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
                  label="修理费金额（万元）"
                  value={calculateRepairAmount()}
                  disabled
                  description="自动计算：固定资产投资 × 百分比"
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
      console.log('[DEBUG] 固定资产投资计算 useEffect 触发:', {
        depreciationDataLength: depreciationData?.length,
        projectId: context?.projectId
      });
      
      const calculateInvestment = async () => {
        console.log('[DEBUG] 开始计算固定资产投资...');
        const investment = await calculateFixedAssetsInvestment();
        console.log('[DEBUG] 固定资产投资计算完成:', investment);
        setFixedAssetsInvestment(investment);
      };
      calculateInvestment();
    }, [depreciationData, context?.projectId]);

  /**
   * 生成总成本费用表数据
   */
  const generateCostTableData = () => {
    if (!context) {
      return null;
    }
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
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
      const rawMaterials = calculateRawMaterialsExcludingTax(year, years);
      yearTotal += rawMaterials;
      
      // 1.2 外购燃料及动力费（除税）
      const fuelPower = calculateFuelPowerExcludingTax(year, years);
      yearTotal += fuelPower;
      
      // 1.3 工资及福利费
      const wages = calculateWagesTotal(year, years);
      yearTotal += wages;
      
      // 1.4 修理费
      if (costConfig.repair.type === 'percentage') {
        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearTotal += costConfig.repair.directAmount || 0;
      }
      
      // 1.5 其他费用（统一使用函数计算，自动应用税率）
      // 土地流转费类型：固定金额，不应用达产率
      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
      if (isLandTransfer) {
        // 土地流转费：亩数 × 单价，不应用达产率
        const acreage = costConfig.otherExpenses.acreage ?? 0;
        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
        const landTransferAmount = acreage * unitPrice; // 亩数 × 单价 = 费用金额（万元）
        yearTotal += landTransferAmount;
      } else {
        const productionRate = costConfig.otherExpenses.applyProductionRate
          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
          : 1;
        
        if (costConfig.otherExpenses.type === 'percentage') {
          const revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
          yearTotal += revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRate;
        } else {
          // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
          const inputTax = directAmount * taxRate / (1 + taxRate);
          yearTotal += directAmount - inputTax;
        }
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
    
    // 1.5 其他费用（统一使用函数计算，自动应用税率）
    const row1_5 = { 序号: '1.5', 成本项目: '其他费用', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      // 土地流转费类型：固定金额，不应用达产率
      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
      
      let yearTotal = 0;
      if (isLandTransfer) {
        // 土地流转费：亩数 × 单价，不应用达产率
        const acreage = costConfig.otherExpenses.acreage ?? 0;
        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
        const landTransferAmount = acreage * unitPrice; // 亩数 × 单价 = 费用金额（万元）
        yearTotal += landTransferAmount;
      } else {
        const productionRate = costConfig.otherExpenses.applyProductionRate
          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
          : 1;
        
        if (costConfig.otherExpenses.type === 'percentage') {
          const revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
          yearTotal += revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRate;
        } else {
          // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
          const inputTax = directAmount * taxRate / (1 + taxRate);
          yearTotal += directAmount - inputTax;
        }
      }
      
      row1_5.运营期.push(yearTotal);
      row1_5.合计 += yearTotal;
    });
    rows.push(row1_5);
    
    // 2. 管理费用
    const row2 = { 序号: '2', 成本项目: '管理费用', 合计: 0, 运营期: [] as number[] };
    years.forEach((year) => {
      const yearManagement = calculateManagementExpenses(year, years);
      row2.运营期.push(yearManagement);
      row2.合计 += yearManagement;
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
    
    const result = {
      rows: rows,
      updatedAt: new Date().toISOString()
    };
    
    return result;
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

  // 计算外购原材料费（含税）的函数
  const calculateRawMaterialsWithTax = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      const productionRate = costConfig.rawMaterials.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      // 外购原材料（除税）
      const excludingTax = calculateRawMaterialsExcludingTax(targetYear, yearsArray);
      
      // 进项税额
      let totalInputTax = 0;
      (costConfig.rawMaterials.items || []).forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        totalInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
      });
      
      // 含税金额 = 除税金额 + 进项税额
      return excludingTax + totalInputTax;
    } else {
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateRawMaterialsWithTax(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.rawMaterials, productionRates, revenueItems]);

  // 计算外购燃料及动力费（含税）的函数
  const calculateFuelPowerWithTax = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      const productionRate = costConfig.fuelPower.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      // 外购燃料及动力（除税）
      const excludingTax = calculateFuelPowerExcludingTax(targetYear, yearsArray);
      
      // 进项税额
      let totalInputTax = 0;
      (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
        const consumption = item.consumption || 0;
        let amount = 0;
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price || 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price || 0) * productionRate;
        }
        const taxRate = (item.taxRate || 13) / 100;
        totalInputTax += amount * taxRate / (1 + taxRate);
      });
      
      // 含税金额 = 除税金额 + 进项税额
      return excludingTax + totalInputTax;
    } else {
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateFuelPowerWithTax(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.fuelPower, productionRates]);

  // 计算其他费用（含税）的函数
  const calculateOtherExpensesWithTax = useCallback((year: number) => {
    // 土地流转费类型：固定金额，不应用达产率
    const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
    
    // 土地流转费：亩数 × 单价，税率为0%，不应用达产率
    if (isLandTransfer) {
      const acreage = costConfig.otherExpenses.acreage ?? 0;
      const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
      const landTransferAmount = acreage * unitPrice; // 亩数 × 单价 = 费用金额（万元）
      // 土地流转费税率为0%，含税金额 = 不含税金额，不应用达产率
      return landTransferAmount;
    }
    
    // 其他费用：应用达产率
    const productionRate = costConfig.otherExpenses.applyProductionRate
      ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
      : 1;
    
    const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
    const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
    const inputTax = directAmount * taxRate / (1 + taxRate);
    const excludingTax = directAmount - inputTax;
    return excludingTax + inputTax;
  }, [costConfig.otherExpenses, productionRates]);

  // 导出总成本费用估算表为Excel（不含税版本）
  // 使用 xlsx-js-style 库，支持样式设置和单元格合并
  const handleExportCostTable = () => {
    if (!context) {
      notifications.show({
        title: '导出失败',
        message: '项目上下文未加载',
        color: 'red',
      });
      return;
    }

    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);

    // 准备Excel数据（使用数组形式，确保列顺序正确）
    console.log('🔍 [Excel导出] context值:', context);
    console.log('🔍 [Excel导出] constructionYears:', context?.constructionYears);
    const constructionYears = context?.constructionYears || 0;
    const totalYearColumns = constructionYears + operationYears;

    // 第二行表头：年度列使用连续自然数列（建设期从1开始，运营期续接）
    const yearHeaders: string[] = [];
    for (let i = 1; i <= totalYearColumns; i++) {
      yearHeaders.push(i.toString());
    }

    // 第一行表头：序号、成本项目、合计、"计算期"
    const headerRow1: any[] = ['序号', '成本项目', '合计'];
    // 添加"计算期"占位（后续需要合并单元格）
    headerRow1.push('计算期');
    // 填充剩余位置（使"计算期"横跨所有年度列）
    for (let i = 1; i < totalYearColumns; i++) {
      headerRow1.push('');
    }

    // 第二行表头：序号、成本项目、合计、各年度编号
    const headerRow2: any[] = ['序号', '成本项目', '合计', ...yearHeaders];

    const excelData: any[] = [headerRow1, headerRow2];
    
    // 建设期成本数据为0（显示为空字符串以保持数据展示的清晰性）
    const constructionZeros = Array(constructionYears).fill('');

    // 1. 营业成本
    const row1Data: number[] = [];
    let totalRow1 = 0;
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
      // 土地流转费类型：固定金额，不应用达产率
      const isLandTransferOther = costConfig.otherExpenses.expenseType === 'landTransfer';
      if (isLandTransferOther) {
        const acreage = costConfig.otherExpenses.acreage ?? 0;
        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
        const landTransferAmount = acreage * unitPrice;
        yearTotal += landTransferAmount;
      } else {
        const productionRateOther = costConfig.otherExpenses.applyProductionRate
          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
          : 1;
        if (costConfig.otherExpenses.type === 'percentage') {
          const revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
          yearTotal += revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRateOther;
        } else {
          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRateOther;
          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
          const inputTax = directAmount * taxRate / (1 + taxRate);
          yearTotal += directAmount - inputTax;
        }
      }
      
      row1Data.push(yearTotal);
      totalRow1 += yearTotal;
    });
    const row1: any = ['1', '营业成本', totalRow1, ...constructionZeros, ...row1Data];
    excelData.push(row1);

    // 1.1 外购原材料费
    const row1_1: any = ['1.1', '外购原材料费', 0, ...constructionZeros];
    let totalRow1_1 = 0;
    years.forEach((year) => {
      const value = calculateRawMaterialsExcludingTax(year, years);
      row1_1.push(value);
      totalRow1_1 += value;
    });
    row1_1[2] = totalRow1_1;
    excelData.push(row1_1);

    // 1.2 外购燃料及动力费
    const row1_2: any = ['1.2', '外购燃料及动力费', 0, ...constructionZeros];
    let totalRow1_2 = 0;
    years.forEach((year) => {
      const value = calculateFuelPowerExcludingTax(year, years);
      row1_2.push(value);
      totalRow1_2 += value;
    });
    row1_2[2] = totalRow1_2;
    excelData.push(row1_2);

    // 1.3 工资及福利费
    const row1_3: any = ['1.3', '工资及福利费', 0, ...constructionZeros];
    let totalRow1_3 = 0;
    years.forEach((year) => {
      const value = calculateWagesTotal(year, years);
      row1_3.push(value);
      totalRow1_3 += value;
    });
    row1_3[2] = totalRow1_3;
    excelData.push(row1_3);

    // 1.4 修理费
    const row1_4: any = ['1.4', '修理费', 0, ...constructionZeros];
    let totalRow1_4 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      if (costConfig.repair.type === 'percentage') {
        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearTotal += costConfig.repair.directAmount || 0;
      }
      row1_4.push(yearTotal);
      totalRow1_4 += yearTotal;
    });
    row1_4[2] = totalRow1_4;
    excelData.push(row1_4);

    // 1.5 其他费用
    const row1_5: any = ['1.5', costConfig.otherExpenses.name || '其他费用', 0, ...constructionZeros];
    let totalRow1_5 = 0;
    years.forEach((year) => {
      // 土地流转费类型：固定金额，不应用达产率
      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
      
      let yearTotal = 0;
      if (isLandTransfer) {
        const acreage = costConfig.otherExpenses.acreage ?? 0;
        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
        const landTransferAmount = acreage * unitPrice; // 亩数 × 单价 = 费用金额（万元）
        yearTotal += landTransferAmount;
      } else {
        const productionRate = costConfig.otherExpenses.applyProductionRate
          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
          : 1;
        
        if (costConfig.otherExpenses.type === 'percentage') {
          const revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
          yearTotal += revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRate;
        } else {
          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
          const inputTax = directAmount * taxRate / (1 + taxRate);
          yearTotal += directAmount - inputTax;
        }
      }
      row1_5.push(yearTotal);
      totalRow1_5 += yearTotal;
    });
    row1_5[2] = totalRow1_5;
    excelData.push(row1_5);

    // 2. 管理费用
    const row2: any = ['2', '管理费用', 0, ...constructionZeros];
    let totalRow2 = 0;
    years.forEach((year) => {
      const yearManagement = calculateManagementExpenses(year, years);
      row2.push(yearManagement);
      totalRow2 += yearManagement;
    });
    row2[2] = totalRow2;
    excelData.push(row2);

    // 3. 利息支出
    const row3: any = ['3', '利息支出', 0, ...constructionZeros];
    let totalRow3 = 0;
    years.forEach((year) => {
      let yearInterest = 0;
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
        yearInterest = interestRow.分年数据[year - 1];
      }
      row3.push(yearInterest);
      totalRow3 += yearInterest;
    });
    row3[2] = totalRow3;
    excelData.push(row3);

    // 4. 折旧费
    const row4: any = ['4', '折旧费', 0, ...constructionZeros];
    let totalRow4 = 0;
    years.forEach((year) => {
      const yearIndex = year - 1;
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
      row4.push(yearDepreciation);
      totalRow4 += yearDepreciation;
    });
    row4[2] = totalRow4;
    excelData.push(row4);

    // 5. 摊销费
    const row5: any = ['5', '摊销费', 0, ...constructionZeros];
    let totalRow5 = 0;
    years.forEach((year) => {
      const yearIndex = year - 1;
      const rowE = depreciationData.find(row => row.序号 === 'E');
      const yearAmortization = rowE?.分年数据[yearIndex] || 0;
      row5.push(yearAmortization);
      totalRow5 += yearAmortization;
    });
    row5[2] = totalRow5;
    excelData.push(row5);

    // 6. 开发成本
    const row6: any = ['6', '开发成本', 0, ...constructionZeros];
    years.forEach(() => {
      row6.push('');
    });
    row6[2] = 0;
    excelData.push(row6);

    // 7. 总成本费用合计
    const row7: any = ['7', '总成本费用合计', 0, ...constructionZeros];
    let totalRow7 = 0;
    totalRow7 += totalRow1; // 营业成本
    totalRow7 += totalRow2; // 管理费用
    totalRow7 += totalRow3; // 利息支出
    totalRow7 += totalRow4; // 折旧费
    totalRow7 += totalRow5; // 摊销费
    
    years.forEach((year) => {
      const yearIndex = year - 1;
      let yearTotal = 0;
      
      // 行1: 营业成本
      let yearRow1 = 0;
      yearRow1 += calculateRawMaterialsExcludingTax(year, years);
      yearRow1 += calculateFuelPowerExcludingTax(year, years);
      yearRow1 += calculateWagesTotal(year, years);
      if (costConfig.repair.type === 'percentage') {
        yearRow1 += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearRow1 += costConfig.repair.directAmount || 0;
      }
      // 1.5 其他费用
      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
      if (isLandTransfer) {
        const acreage = costConfig.otherExpenses.acreage ?? 0;
        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
        const landTransferAmount = acreage * unitPrice;
        yearRow1 += landTransferAmount;
      } else {
        const productionRateOther = costConfig.otherExpenses.applyProductionRate
          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
          : 1;
        if (costConfig.otherExpenses.type === 'percentage') {
          const revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
          yearRow1 += revenueBase * (costConfig.otherExpenses.percentage ?? 0) / 100 * productionRateOther;
        } else {
          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRateOther;
          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
          const inputTax = directAmount * taxRate / (1 + taxRate);
          yearRow1 += directAmount - inputTax;
        }
      }
      yearTotal += yearRow1;
      
      // 行2: 管理费用
      yearTotal += row2[3 + constructionYears + yearIndex];
      
      // 行3: 利息支出
      let yearInterest = 0;
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
        yearInterest = interestRow.分年数据[year - 1];
      }
      yearTotal += yearInterest;
      
      // 行4: 折旧费
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
      yearTotal += yearDepreciation;
      
      // 行5: 摊销费
      const rowE = depreciationData.find(row => row.序号 === 'E');
      const yearAmortization = rowE?.分年数据[yearIndex] || 0;
      yearTotal += yearAmortization;
      
      row7.push(yearTotal);
    });
    row7[2] = totalRow7;
    excelData.push(row7);

    // 创建工作簿和工作表
    const ws = XLSXStyle.utils.aoa_to_sheet(excelData);
    
    // 设置列宽
    const cols: any[] = [
      { wch: 3 }, // 序号
      { wch: 18 }, // 成本项目
      { wch: 7 }, // 合计
    ];
    // 添加建设期列宽
    for (let i = 0; i < constructionYears; i++) {
      cols.push({ wch: 7 }); // 建设期列
    }
    years.forEach(() => {
      cols.push({ wch: 7 }); // 年度列
    });
    ws['!cols'] = cols;

    // 设置合并单元格（双层列头）
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },  // "序号"跨2行
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },  // "成本项目"跨2行
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },  // "合计"跨2行
      { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + totalYearColumns - 1 } }  // "计算期"横向跨所有年度列
    ];

    // 设置表头样式（加粗，居中，带边框，字体大小12）
    const headerStyle = {
      font: { bold: true, sz: 8 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // 设置数值单元格样式（居中，带边框，字体大小11）
    const cellStyle = {
      font: { sz: 8 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // 设置成本项目列样式（左对齐，带边框，字体大小11）
    const nameCellStyle = {
      font: { sz: 8 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // 遍历所有单元格设置样式
    const range = XLSXStyle.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        // 表头行加粗并居中
        if (R === 0 || R === 1) {
          ws[cellAddress].s = headerStyle;
        } else {
          // 成本项目列（C=1）左对齐，其他列居中
          if (C === 1) {
            ws[cellAddress].s = nameCellStyle;
          } else {
            // 判断是否为运营期列（建设期列之后的列）
            // 列结构：0=序号, 1=成本项目, 2=合计, 3..3+constructionYears-1=建设期, 之后=运营期
            const operationYearStartCol = 3 + constructionYears;
            const isOperationYearColumn = C >= operationYearStartCol;
            
            // 对于运营期数值列，检查值是否为0，如果是则显示为空字符串
            if (isOperationYearColumn && typeof ws[cellAddress].v === 'number' && ws[cellAddress].v === 0) {
              ws[cellAddress].v = '';
              ws[cellAddress].t = 's';  // 设置为字符串类型
              ws[cellAddress].s = cellStyle;  // 应用样式但保留边框
            } else {
              ws[cellAddress].s = cellStyle;
              // 设置数值格式为2位小数
              if (typeof ws[cellAddress].v === 'number') {
                ws[cellAddress].z = '0.00';
              }
            }
          }
        }
      }
    }

    // 使用 xlsx-js-style 的 book_new
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, '总成本费用估算表');

    // 导出文件
    XLSXStyle.writeFile(wb, `总成本费用估算表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '总成本费用估算表已导出为Excel文件',
      color: 'green',
    });
  };

  // 导出总成本费用估算表为Excel（含税版本）
  // 使用 xlsx-js-style 库，支持样式设置和单元格合并
  const handleExportCostTableWithTax = () => {
    if (!context) {
      notifications.show({
        title: '导出失败',
        message: '项目上下文未加载',
        color: 'red',
      });
      return;
    }

    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);

    // 准备Excel数据（使用数组形式，确保列顺序正确）
    console.log('🔍 [Excel导出-含税] context值:', context);
    console.log('🔍 [Excel导出-含税] constructionYears:', context?.constructionYears);
    const constructionYears = context?.constructionYears || 0;
    const totalYearColumns = constructionYears + operationYears;

    // 第二行表头：年度列使用连续自然数列（建设期从1开始，运营期续接）
    const yearHeaders: string[] = [];
    for (let i = 1; i <= totalYearColumns; i++) {
      yearHeaders.push(i.toString());
    }

    // 第一行表头：序号、成本项目、合计、"计算期"
    const headerRow1: any[] = ['序号', '成本项目', '合计'];
    // 添加"计算期"占位（后续需要合并单元格）
    headerRow1.push('计算期');
    // 填充剩余位置（使"计算期"横跨所有年度列）
    for (let i = 1; i < totalYearColumns; i++) {
      headerRow1.push('');
    }

    // 第二行表头：序号、成本项目、合计、各年度编号
    const headerRow2: any[] = ['序号', '成本项目', '合计', ...yearHeaders];

    const excelData: any[] = [headerRow1, headerRow2];
    
    // 建设期成本数据为0（显示为空字符串以保持数据展示的清晰性）
    const constructionZeros = Array(constructionYears).fill('');

    // 1. 营业成本
    const row1Data: number[] = [];
    let totalRow1 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      // 1.1 外购原材料费（含税）
      yearTotal += calculateRawMaterialsWithTax(year, years);
      
      // 1.2 外购燃料及动力费（含税）
      yearTotal += calculateFuelPowerWithTax(year, years);
      
      // 1.3 工资及福利费（含税，不变）
      yearTotal += calculateWagesTotal(year, years);
      
      // 1.4 修理费（含税，不变）
      if (costConfig.repair.type === 'percentage') {
        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearTotal += costConfig.repair.directAmount || 0;
      }
      
      // 1.5 其他费用（含税）
      yearTotal += calculateOtherExpensesWithTax(year);
      
      row1Data.push(yearTotal);
      totalRow1 += yearTotal;
    });
    const row1: any = ['1', '营业成本', totalRow1, ...constructionZeros, ...row1Data];
    excelData.push(row1);

    // 1.1 外购原材料费
    const row1_1: any = ['1.1', '外购原材料费', 0, ...constructionZeros];
    let totalRow1_1 = 0;
    years.forEach((year) => {
      const value = calculateRawMaterialsWithTax(year, years);
      row1_1.push(value);
      totalRow1_1 += value;
    });
    row1_1[2] = totalRow1_1;
    excelData.push(row1_1);

    // 1.2 外购燃料及动力费
    const row1_2: any = ['1.2', '外购燃料及动力费', 0, ...constructionZeros];
    let totalRow1_2 = 0;
    years.forEach((year) => {
      const value = calculateFuelPowerWithTax(year, years);
      row1_2.push(value);
      totalRow1_2 += value;
    });
    row1_2[2] = totalRow1_2;
    excelData.push(row1_2);

    // 1.3 工资及福利费
    const row1_3: any = ['1.3', '工资及福利费', 0, ...constructionZeros];
    let totalRow1_3 = 0;
    years.forEach((year) => {
      const value = calculateWagesTotal(year, years);
      row1_3.push(value);
      totalRow1_3 += value;
    });
    row1_3[2] = totalRow1_3;
    excelData.push(row1_3);

    // 1.4 修理费
    const row1_4: any = ['1.4', '修理费', 0, ...constructionZeros];
    let totalRow1_4 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      if (costConfig.repair.type === 'percentage') {
        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearTotal += costConfig.repair.directAmount || 0;
      }
      row1_4.push(yearTotal);
      totalRow1_4 += yearTotal;
    });
    row1_4[2] = totalRow1_4;
    excelData.push(row1_4);

    // 1.5 其他费用
    const row1_5: any = ['1.5', costConfig.otherExpenses.name || '其他费用', 0, ...constructionZeros];
    let totalRow1_5 = 0;
    years.forEach((year) => {
      const value = calculateOtherExpensesWithTax(year);
      row1_5.push(value);
      totalRow1_5 += value;
    });
    row1_5[2] = totalRow1_5;
    excelData.push(row1_5);

    // 2. 管理费用
    const row2: any = ['2', '管理费用', 0, ...constructionZeros];
    let totalRow2 = 0;
    years.forEach((year) => {
      const yearManagement = calculateManagementExpenses(year, years);
      row2.push(yearManagement);
      totalRow2 += yearManagement;
    });
    row2[2] = totalRow2;
    excelData.push(row2);

    // 3. 利息支出
    const row3: any = ['3', '利息支出', 0, ...constructionZeros];
    let totalRow3 = 0;
    years.forEach((year) => {
      let yearInterest = 0;
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
        yearInterest = interestRow.分年数据[year - 1];
      }
      row3.push(yearInterest);
      totalRow3 += yearInterest;
    });
    row3[2] = totalRow3;
    excelData.push(row3);

    // 4. 折旧费
    const row4: any = ['4', '折旧费', 0, ...constructionZeros];
    let totalRow4 = 0;
    years.forEach((year) => {
      const yearIndex = year - 1;
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
      row4.push(yearDepreciation);
      totalRow4 += yearDepreciation;
    });
    row4[2] = totalRow4;
    excelData.push(row4);

    // 5. 摊销费
    const row5: any = ['5', '摊销费', 0, ...constructionZeros];
    let totalRow5 = 0;
    years.forEach((year) => {
      const yearIndex = year - 1;
      const rowE = depreciationData.find(row => row.序号 === 'E');
      const yearAmortization = rowE?.分年数据[yearIndex] || 0;
      row5.push(yearAmortization);
      totalRow5 += yearAmortization;
    });
    row5[2] = totalRow5;
    excelData.push(row5);

    // 6. 开发成本
    const row6: any = ['6', '开发成本', 0, ...constructionZeros];
    years.forEach(() => {
      row6.push('');
    });
    row6[2] = 0;
    excelData.push(row6);

    // 7. 总成本费用合计
    const row7: any = ['7', '总成本费用合计', 0, ...constructionZeros];
    let totalRow7 = 0;
    totalRow7 += totalRow1; // 营业成本
    totalRow7 += totalRow2; // 管理费用
    totalRow7 += totalRow3; // 利息支出
    totalRow7 += totalRow4; // 折旧费
    totalRow7 += totalRow5; // 摊销费
    
    years.forEach((year) => {
      const yearIndex = year - 1;
      let yearTotal = 0;
      
      // 行1: 营业成本
      let yearRow1 = 0;
      yearRow1 += calculateRawMaterialsWithTax(year, years);
      yearRow1 += calculateFuelPowerWithTax(year, years);
      yearRow1 += calculateWagesTotal(year, years);
      if (costConfig.repair.type === 'percentage') {
        yearRow1 += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        yearRow1 += costConfig.repair.directAmount || 0;
      }
      yearRow1 += calculateOtherExpensesWithTax(year);
      yearTotal += yearRow1;
      
      // 行2: 管理费用
      yearTotal += row2[3 + constructionYears + yearIndex];
      
      // 行3: 利息支出
      let yearInterest = 0;
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
        yearInterest = interestRow.分年数据[year - 1];
      }
      yearTotal += yearInterest;
      
      // 行4: 折旧费
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
      yearTotal += yearDepreciation;
      
      // 行5: 摊销费
      const rowE = depreciationData.find(row => row.序号 === 'E');
      const yearAmortization = rowE?.分年数据[yearIndex] || 0;
      yearTotal += yearAmortization;
      
      row7.push(yearTotal);
    });
    row7[2] = totalRow7;
    excelData.push(row7);

    // 创建工作簿和工作表
    const ws = XLSXStyle.utils.aoa_to_sheet(excelData);
    
    // 设置列宽
    const cols: any[] = [
      { wch: 3 }, // 序号
      { wch: 18 }, // 成本项目
      { wch: 7 }, // 合计
    ];
    // 添加建设期列宽
    for (let i = 0; i < constructionYears; i++) {
      cols.push({ wch: 7 }); // 建设期列
    }
    years.forEach(() => {
      cols.push({ wch: 7 }); // 年度列
    });
    ws['!cols'] = cols;

    // 设置合并单元格（双层列头）
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },  // "序号"跨2行
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },  // "成本项目"跨2行
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },  // "合计"跨2行
      { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + totalYearColumns - 1 } }  // "计算期"横向跨所有年度列
    ];

    // 设置表头样式（加粗，居中，带边框，字体大小12）
    const headerStyle = {
      font: { bold: true, sz: 8 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // 设置数值单元格样式（居中，带边框，字体大小11）
    const cellStyle = {
      font: { sz: 8 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // 设置成本项目列样式（左对齐，带边框，字体大小11）
    const nameCellStyle = {
      font: { sz: 8 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // 遍历所有单元格设置样式
    const range = XLSXStyle.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSXStyle.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        // 表头行加粗并居中
        if (R === 0 || R === 1) {
          ws[cellAddress].s = headerStyle;
        } else {
          // 成本项目列（C=1）左对齐，其他列居中
          if (C === 1) {
            ws[cellAddress].s = nameCellStyle;
          } else {
            // 判断是否为运营期列（建设期列之后的列）
            // 列结构：0=序号, 1=成本项目, 2=合计, 3..3+constructionYears-1=建设期, 之后=运营期
            const operationYearStartCol = 3 + constructionYears;
            const isOperationYearColumn = C >= operationYearStartCol;
            
            // 对于运营期数值列，检查值是否为0，如果是则显示为空字符串
            if (isOperationYearColumn && typeof ws[cellAddress].v === 'number' && ws[cellAddress].v === 0) {
              ws[cellAddress].v = '';
              ws[cellAddress].t = 's';  // 设置为字符串类型
              ws[cellAddress].s = cellStyle;  // 应用样式但保留边框
            } else {
              ws[cellAddress].s = cellStyle;
              // 设置数值格式为2位小数
              if (typeof ws[cellAddress].v === 'number') {
                ws[cellAddress].z = '0.00';
              }
            }
          }
        }
      }
    }

    // 使用 xlsx-js-style 的 book_new
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, '含税总成本费用估算表');

    // 导出文件
    XLSXStyle.writeFile(wb, `含税总成本费用估算表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '含税总成本费用估算表已导出为Excel文件',
      color: 'green',
    });
  };

  // 根据费用项目名称获取数量标签
  const getQuantityLabel = (itemName: string) => {
    const labelMap: { [key: string]: string } = {
      '水费': '数量（万m³）',
      '电费': '数量（万kWh）',
      '汽油': '数量（吨）',
      '柴油': '数量（吨）',
      '天然气': '数量（万m³）'
    };
    
    return labelMap[itemName] || '数量';
  };

  // 燃料及动力费编辑保存处理函数
  const handleFuelPowerSave = () => {
    if (fuelPowerItemIndex !== null) {
      const newItems = [...(costConfig.fuelPower.items || [])];
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
  };


  // 渲染燃料及动力费编辑弹窗
  const renderFuelPowerEditModal = () => (
    <Modal
      opened={showFuelPowerEditModal}
      onClose={() => setShowFuelPowerEditModal(false)}
      title="编辑燃料及动力费项目"
      size="md"
      centered
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
  const renderFuelPowerModal = () => (
    <Modal
      opened={showFuelPowerModal}
      onClose={() => setShowFuelPowerModal(false)}
      title={
        <Text size="md">
          📊 外购燃料和动力费估算表
        </Text>
      }
      size="calc(100vw - 100px)"
      centered
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      {(() => {
        if (!context) return <Text c="red">项目上下文未加载</Text>

        const operationYears = context.operationYears
        const years = Array.from({ length: operationYears }, (_, i) => i + 1)

        return (
          <>
            <Table striped withTableBorder style={{ fontSize: '11px' }}>
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                  <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
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
                {/* 1. 燃料、动力费 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>燃料、动力费</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 序号1合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      years.forEach((year) => {
                        const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        let yearTotal = 0;
                        (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                          const consumption = item.consumption || 0;
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
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
                    const yearProductionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                    
                    let yearTotal = 0;
                    (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                      const consumption = item.consumption || 0;
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      if (['汽油', '柴油'].includes(item.name)) {
                        yearTotal += (item.price || 0) * consumption / 10000 * yearProductionRate;
                      } else {
                        yearTotal += consumption * (item.price || 0) * yearProductionRate;
                      }
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumberNoRounding(yearTotal)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为1的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 1.1, 1.2, 1.3... 燃料及动力费项目 */}
                {(costConfig.fuelPower.items || []).map((item: FuelPowerItem, idx: number) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.{idx + 1}</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>
                      {item.name}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 该燃料项目合计列 = 运营期各年数值的总和
                        let totalSum = 0;
                        
                        years.forEach((year) => {
                          const productionRate = costConfig.fuelPower.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
                          if (['汽油', '柴油'].includes(item.name)) {
                            totalSum += (item.price || 0) * (item.consumption || 0) / 10000 * productionRate;
                          } else {
                            totalSum += (item.consumption || 0) * (item.price || 0) * productionRate;
                          }
                        });
                        
                        return formatNumberNoRounding(totalSum);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                      
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      let yearTotal = 0;
                      if (['汽油', '柴油'].includes(item.name)) {
                        yearTotal = (item.price || 0) * (item.consumption || 0) / 10000 * productionRate;
                      } else {
                        yearTotal = (item.consumption || 0) * (item.price || 0) * productionRate;
                      }
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {formatNumberNoRounding(yearTotal)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => {
                              setCurrentFuelPowerItem({...item});
                              setFuelPowerItemIndex(idx);
                              setShowFuelPowerEditModal(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="清空数量">
                          <ActionIcon
                            variant="light"
                            color="orange"
                            size="sm"
                            onClick={() => {
                              const updatedItems = [...(costConfig.fuelPower.items || [])];
                              updatedItems[idx] = {...item, consumption: 0};
                              updateCostConfig({
                                fuelPower: {
                                  ...costConfig.fuelPower,
                                  items: updatedItems
                                }
                              });
                            }}
                          >
                            <IconClearAll size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                
                {/* 2. 进项税额 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>进项税额</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 进项税额合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      years.forEach((year) => {
                        const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        let yearInputTax = 0;
                        (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                          const consumption = item.consumption || 0;
                          let amount = 0;
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
                          if (['汽油', '柴油'].includes(item.name)) {
                            amount = (item.price || 0) * consumption / 10000 * productionRate;
                          } else {
                            amount = consumption * (item.price || 0) * productionRate;
                          }
                          const taxRate = (item.taxRate || 13) / 100;
                          // 根据用户反馈：燃料动力费金额均为含税收入，使用正确公式：含税金额 / (1 + 税率) × 税率
                          yearInputTax += amount * taxRate / (1 + taxRate);
                        });
                        
                        totalSum += yearInputTax;
                      });
                      
                      return formatNumberNoRounding(totalSum);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const yearProductionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                    
                    let yearInputTax = 0;
                    (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                      const consumption = item.consumption || 0;
                      let amount = 0;
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      if (['汽油', '柴油'].includes(item.name)) {
                        amount = (item.price || 0) * consumption / 10000 * yearProductionRate;
                      } else {
                        amount = consumption * (item.price || 0) * yearProductionRate;
                      }
                      const taxRate = (item.taxRate || 13) / 100;
                      // 根据用户反馈：燃料动力费金额均为含税收入，使用正确公式：含税金额 / (1 + 税率) × 税率
                      yearInputTax += amount * taxRate / (1 + taxRate);
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumberNoRounding(yearInputTax)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为2的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                
                
                {/* 3. 外购燃料及动力（除税） */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>外购燃料及动力（除税）</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 外购燃料及动力（除税）合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      years.forEach((year) => {
                        const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        let yearFuelPowerTotal = 0;  // 燃料、动力费总额
                        let yearInputTaxTotal = 0;   // 进项税额总额
                        
                        (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                          const consumption = item.consumption || 0;
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
                        totalSum += (yearFuelPowerTotal - yearInputTaxTotal);
                      });
                      
                      return formatNumberNoRounding(totalSum);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                    
                    let yearFuelPowerTotal = 0;  // 燃料、动力费总额
                    let yearInputTaxTotal = 0;   // 进项税额总额
                    
                    (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                      const consumption = item.consumption || 0;
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
                    const yearTotal = yearFuelPowerTotal - yearInputTaxTotal;
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {formatNumberNoRounding(yearTotal)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为4的行不允许编辑 */}
                  </Table.Td>
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
          </>
        )
        })()}
      </Modal>
  );

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

// ============================================
  // 土地流转费相关工具函数
  // ============================================
  
  /**
   * 格式化土地流转费单价显示
   * 当单价小于1万元时，采用元为单位显示
   * 例如：0.75万元/亩·年 → "7500元/亩·年"
   * @param unitPrice 单价（万元/亩·年）
   * @returns 格式化后的单价显示字符串
   */
  const formatLandTransferUnitPrice = (unitPrice: number): string => {
    if (!unitPrice || unitPrice === 0) {
      return '0元/亩·年';
    }
    
    // 当单价小于1万元时，转换为元显示
    if (unitPrice < 1) {
      const yuanPrice = unitPrice * 10000; // 万元转元
      // 使用en-US locale避免添加空格
      return `${yuanPrice.toLocaleString('en-US')}元/亩·年`;
    }
    
    // 单价大于等于1万元时，保持万元显示
    return `${unitPrice.toLocaleString('en-US')}万元/亩·年`;
  };
  
  /**
   * 计算运营期土地成本合计
   * 公式：数量 × 单价 × 运营期数
   * 单价始终以万元为单位进行计算，结果保留2位小数
   * @param acreage 数量（亩）
   * @param unitPrice 单价（万元/亩）
   * @param operationYears 运营期年数
   * @returns 运营期土地成本合计（万元）
   */
  const calculateLandTransferTotalCost = (acreage: number, unitPrice: number, operationYears: number): number => {
    const validAcreage = acreage ?? 0;
    const validUnitPrice = unitPrice ?? 0;
    const validYears = operationYears ?? 0;
    
    // 计算：亩数 × 单价（万元） × 运营期数
    const totalCost = validAcreage * validUnitPrice * validYears;
    
    // 保留2位小数
    return Math.round(totalCost * 100) / 100;
  };
  
  /**
   * 生成土地流转费备注
   * 格式："项目流转{数量}亩土地，按{单价}元/亩·年估算。则运营期土地成本合计为{合计}万元。"
   * @param acreage 数量（亩）
   * @param unitPrice 单价（万元/亩）
   * @param operationYears 运营期年数
   * @returns 格式化的备注字符串
   */
  const generateLandTransferRemark = (acreage: number, unitPrice: number, operationYears: number): string => {
    const validAcreage = acreage ?? 0;
    const validUnitPrice = unitPrice ?? 0;
    
    // 根据单价决定显示格式
    let priceDisplay = '';
    if (validUnitPrice < 1 && validUnitPrice > 0) {
      // 小于1万元时用元显示
      const yuanPrice = validUnitPrice * 10000;
      priceDisplay = `${yuanPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}元/亩·年`;
    } else {
      // 大于等于1万元时用万元显示
      priceDisplay = `${validUnitPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}万元/亩·年`;
    }
    
    // 计算运营期土地成本合计
    const totalCost = calculateLandTransferTotalCost(validAcreage, validUnitPrice, operationYears);
    
    return `项目流转${validAcreage.toLocaleString('en-US')}亩土地，按${priceDisplay}估算。则运营期土地成本合计为${totalCost.toLocaleString('en-US')}万元。`;
  };

  // 检测费用名称是否需要备注（该函数已废弃，备注显示现在基于expenseType判断）

  // 渲染其他费用配置弹窗
  const renderOtherModal = () => {
    // 用于跟踪是否已获取土地信息
    const [landInfoFetched, setLandInfoFetched] = useState(false);
    // 用于跟踪上一次的费用类型，确保在切换到土地流转费时触发获取
    const prevExpenseTypeRef = React.useRef<string | undefined>();
    // 用于跟踪最新的 expenseType，确保使用最新值（避免闭包陷阱）
    const latestExpenseTypeRef = React.useRef<string | undefined>();
    // 用于跟踪是否正在获取土地信息（防止在获取过程中被重置）
    const isFetchingLandInfoRef = React.useRef(false);
    // 用于跟踪已完成的获取操作（避免重复获取）
    const hasFetchedForCurrentTypeRef = React.useRef(false);
    
    // 初始化临时配置（当弹窗打开时）- 只在弹窗打开时执行一次
    React.useEffect(() => {
      if (!showOtherModal) return;
      
      // 重置所有状态和refs（只在弹窗打开时执行一次）
      setLandInfoFetched(false);
      prevExpenseTypeRef.current = undefined;
      hasFetchedForCurrentTypeRef.current = false;
      isFetchingLandInfoRef.current = false;
      
      // 从 tempOtherConfig 或 costConfig 获取当前的 expenseType
      const currentExpenseType = tempOtherConfig?.expenseType || costConfig.otherExpenses.expenseType || 'directAmount';
      // 同步更新 latestExpenseTypeRef
      latestExpenseTypeRef.current = currentExpenseType;
      
      if (!tempOtherConfig) {
        // 首次打开弹窗
        const newConfig = {...costConfig.otherExpenses};
        // 确保expenseType有默认值
        if (!newConfig.expenseType) {
          newConfig.expenseType = 'directAmount';
        }
        // 确保土地流转费类型的taxRate为0
        if (newConfig.expenseType === 'landTransfer') {
          newConfig.taxRate = 0;
          // 土地流转费类型：清空remark（后面会根据acreage和unitPrice生成）
          newConfig.remark = '';
        }
        setTempOtherConfig(newConfig);
      }
      
      // 当切换到土地流转费类型时，自动设置税率为0并生成备注
      const initExpenseType = tempOtherConfig?.expenseType || costConfig.otherExpenses.expenseType || 'directAmount';
      
      if (initExpenseType === 'landTransfer') {
        // 获取运营期年数
        const operationYears = context?.operationYears || 0;
        
        setTempOtherConfig((prev: any) => {
          const acreage = prev.acreage ?? 0;
          const unitPrice = prev.unitPrice ?? 0;
          
          // 生成格式化的备注
          const remark = generateLandTransferRemark(acreage, unitPrice, operationYears);
          
          return {
            ...prev,
            taxRate: 0,
            remark
          };
        });
      }
    }, [showOtherModal, costConfig.otherExpenses.expenseType, context?.operationYears]);
    
    // 从用地信息模块获取亩数和单价数据
    // 使用标志位来避免竞态条件和重复请求
    React.useEffect(() => {
      // 使用 latestExpenseTypeRef 获取最新的 expenseType（避免闭包陷阱）
      // 同时也直接从 tempOtherConfig 获取当前值，确保获取最新值
      const currentExpenseType = latestExpenseTypeRef.current || tempOtherConfig?.expenseType || costConfig.otherExpenses.expenseType;
      
      // 条件：弹窗打开、当前是土地流转费类型、之前不是土地流转费类型、未获取过土地信息、有项目ID
      // 并且当前类型还没有完成过获取
      const shouldFetch = showOtherModal &&
                          currentExpenseType === 'landTransfer' &&
                          prevExpenseTypeRef.current !== 'landTransfer' &&
                          !hasFetchedForCurrentTypeRef.current &&
                          !isFetchingLandInfoRef.current &&
                          context?.projectId;
      
      if (shouldFetch) {
        // 获取数据前，更新 ref
        prevExpenseTypeRef.current = 'landTransfer';
        
        const fetchLandInfo = async () => {
          // 设置获取中标志，防止在获取过程中被重置
          isFetchingLandInfoRef.current = true;
          
          try {
            // 从 projectApi 获取项目信息，其中包含土地数据
            const response = await projectApi.getById(context.projectId!);
            
            if (response.success && response.data?.project) {
              const project = response.data.project;
              
              // 从项目信息中获取土地数据
              const landArea = project.land_area || 0;
              const landUnitPrice = project.land_unit_price || 0;
              
              // 如果获取到有效数据，自动填充到临时配置
              if (landArea > 0 || landUnitPrice > 0) {
                // 获取运营期年数用于生成备注
                const operationYears = context?.operationYears || 0;
                
                setTempOtherConfig((prev: any) => {
                  const newAcreage = (prev.acreage === 0 || prev.acreage === undefined) ? landArea : prev.acreage;
                  const newUnitPrice = (prev.unitPrice === 0 || prev.unitPrice === undefined) ? landUnitPrice : prev.unitPrice;
                  
                  // 同步生成备注
                  const newRemark = generateLandTransferRemark(newAcreage, newUnitPrice, operationYears);
                  
                  return {
                    ...prev,
                    acreage: newAcreage,
                    unitPrice: newUnitPrice,
                    remark: newRemark
                  };
                });
              }
            }
          } catch (error) {
            // 静默处理错误
          } finally {
            // 标记当前类型已完成获取
            hasFetchedForCurrentTypeRef.current = true;
            // 清除获取中标志
            isFetchingLandInfoRef.current = false;
            // 设置landInfoFetched为true，表示已完成获取
            setLandInfoFetched(true);
          }
        };
        
        fetchLandInfo();
      } else {
        // 如果不满足获取条件，但当前是土地流转费且之前不是，标记为已完成（避免重复检查）
        if (currentExpenseType === 'landTransfer') {
          prevExpenseTypeRef.current = 'landTransfer';
        }
      }
      
      // 更新 latestExpenseTypeRef 以保持同步（使用 tempOtherConfig 的最新值）
      if (tempOtherConfig?.expenseType) {
        latestExpenseTypeRef.current = tempOtherConfig.expenseType;
      }
      
    }, [showOtherModal, tempOtherConfig?.expenseType, costConfig.otherExpenses.expenseType, context?.projectId]);
    
    // 保存配置
    const handleSaveOtherConfig = () => {
      if (tempOtherConfig) {
        // 将临时配置更新到全局状态，如果名称为空则使用默认值"其他费用"
        updateCostConfig({
          otherExpenses: {
            ...tempOtherConfig,
            name: tempOtherConfig.name?.trim() || '其他费用'
          }
        });
        
        // 清除临时配置
        setTempOtherConfig(null);
        
        // 关闭弹窗
        setShowOtherModal(false);
        
        // 显示成功通知
        const savedName = tempOtherConfig.name?.trim() || '其他费用';
        notifications.show({
          title: '保存成功',
          message: `其他费用配置已保存（${savedName}）`,
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
    
    // 是否为土地流转费类型（必须在使用前声明）
    const isLandTransfer = currentConfig.expenseType === 'landTransfer';
    
    // 检测是否显示备注输入框 - 只在"土地流转费"类型时显示
    const showRemarkField = isLandTransfer;
    
    // 当切换到"直接填金额"类型时，清空备注
    React.useEffect(() => {
      if (!showOtherModal) return;
      
      // 使用 ref 来追踪最新的 expenseType，避免闭包陷阱
      const currentExpenseType = tempOtherConfig?.expenseType || costConfig.otherExpenses.expenseType;
      const isCurrentlyLandTransfer = currentExpenseType === 'landTransfer';
      
      if (!isCurrentlyLandTransfer && tempOtherConfig?.remark) {
        // 切换到非土地流转费类型时，清空备注
        setTempOtherConfig((prev: any) => ({
          ...prev,
          remark: ''
        }));
      }
    }, [showOtherModal, tempOtherConfig?.expenseType]);
    
    // 计算土地流转费金额（亩数 × 单价）
    const landTransferAmount = (currentConfig.acreage ?? 0) * (currentConfig.unitPrice ?? 0);
    
    return (
      <Modal
        opened={showOtherModal}
        onClose={handleCancelOtherConfig}
        title="其他费用配置"
        size="md"
        centered
      >
        <Stack gap="md">
          <SimpleGrid cols={2}>
            <TextInput
              label="费用名称"
              value={currentConfig.name ?? '其他费用'}
              disabled={isLandTransfer}
              onChange={(e) => {
                // 土地流转费类型时不允许修改名称
                if (!isLandTransfer) {
                  setTempOtherConfig({
                    ...currentConfig,
                    name: e.target.value
                  });
                }
              }}
              styles={{
                input: { backgroundColor: isLandTransfer ? '#f8f9fa' : undefined }
              }}
              rightSection={
                !isLandTransfer && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setTempOtherConfig({
                      ...currentConfig,
                      name: ''
                    })}
                    title="清除"
                    style={{ marginLeft: '-3px' }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                )
              }
            />
            
            {/* 费用类型下拉选择 */}
            <Select
              label="费用类型"
              data={[
                { value: 'directAmount', label: '直接填金额' },
                { value: 'landTransfer', label: '土地流转费' },
              ]}
              value={currentConfig.expenseType || 'directAmount'}
              onChange={(value) => {
                const newExpenseType = value as 'directAmount' | 'landTransfer';
                // 切换费用类型时，更新配置
                setTempOtherConfig({
                  ...currentConfig,
                  expenseType: newExpenseType,
                  // 土地流转费类型：自动设置名称为"土地流转费"且不可修改
                  // 直接填金额类型：自动设置名称为"其他费用"
                  name: newExpenseType === 'landTransfer' ? '土地流转费' : '其他费用',
                  // 土地流转费类型：税率固定为0%
                  taxRate: newExpenseType === 'landTransfer' ? 0 : currentConfig.taxRate,
                  // 如果切换到土地流转费，自动应用达产率；切换到直接填金额时，不应用达产率
                  applyProductionRate: newExpenseType === 'landTransfer' ? true : false
                });
              }}
              allowDeselect={false}
            />
          </SimpleGrid>
          
          {/* 当选择"直接填金额"时显示：直接金额输入框 */}
          {!isLandTransfer && (
            <SimpleGrid cols={2}>
              <NumberInput
                label="直接金额（万元）"
                value={currentConfig.directAmount || 0}
                onChange={(value) => setTempOtherConfig({
                  ...currentConfig,
                  directAmount: Number(value)
                })}
                min={0}
                decimalScale={2}
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setTempOtherConfig({
                      ...currentConfig,
                      directAmount: 0
                    })}
                    title="清除"
                    style={{ marginLeft: '-3px' }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                }
              />
              
              <NumberInput
                label="费用税率 (%)"
                value={currentConfig.taxRate ?? 9}
                onChange={(value) => setTempOtherConfig({
                  ...currentConfig,
                  taxRate: Number(value)
                })}
                min={0}
                max={100}
                decimalScale={2}
                allowNegative={false}
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setTempOtherConfig({
                      ...currentConfig,
                      taxRate: 0
                    })}
                    title="清除"
                    style={{ marginLeft: '-3px' }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                }
              />
            </SimpleGrid>
          )}
          
          {/* 当选择"土地流转费"时显示：数量和单价输入框（从用地信息模块获取） */}
          {isLandTransfer && (
            <>
              <SimpleGrid cols={2}>
                <NumberInput
                  label="数量（亩）"
                  value={currentConfig.acreage ?? 0}
                  onChange={(value) => {
                    const newAcreage = Number(value);
                    const operationYears = context?.operationYears || 0;
                    
                    // 更新配置
                    setTempOtherConfig({
                      ...currentConfig,
                      acreage: newAcreage
                    });
                    
                    // 重新生成备注（仅当有亩数和单价时）
                    if (newAcreage > 0 && currentConfig.unitPrice && currentConfig.unitPrice > 0) {
                      const newRemark = generateLandTransferRemark(newAcreage, currentConfig.unitPrice, operationYears);
                      setTempOtherConfig((prev: any) => ({
                        ...prev,
                        acreage: newAcreage,
                        remark: newRemark
                      }));
                    }
                  }}
                  min={0}
                  decimalScale={2}
                  rightSection={
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => setTempOtherConfig({
                        ...currentConfig,
                        acreage: 0
                      })}
                      title="清除"
                      style={{ marginLeft: '-3px' }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  }
                />
                
                <NumberInput
                  label="单价（万元/亩）"
                  value={currentConfig.unitPrice ?? 0}
                  onChange={(value) => {
                    const newUnitPrice = Number(value);
                    const operationYears = context?.operationYears || 0;
                    
                    // 更新配置
                    setTempOtherConfig({
                      ...currentConfig,
                      unitPrice: newUnitPrice
                    });
                    
                    // 重新生成备注（仅当有亩数和单价时）
                    if (currentConfig.acreage && currentConfig.acreage > 0 && newUnitPrice > 0) {
                      const newRemark = generateLandTransferRemark(currentConfig.acreage, newUnitPrice, operationYears);
                      setTempOtherConfig((prev: any) => ({
                        ...prev,
                        unitPrice: newUnitPrice,
                        remark: newRemark
                      }));
                    }
                  }}
                  min={0}
                  decimalScale={4}
                />
              </SimpleGrid>
              

              <div style={{
                padding: '12px 16px',
                backgroundColor: '#E8F7FF',
                borderRadius: '8px',
                borderLeft: '4px solid #165DFF'
              }}>
                <Text size="sm" c="#165DFF" fw={500}>
                  💰 费用金额计算：
                </Text>
                <Text size="md" c="#165DFF" fw={600} mt={4}>
                  {formatNumberNoRounding(currentConfig.acreage ?? 0)} 亩 × {formatLandTransferUnitPrice(currentConfig.unitPrice ?? 0)} = {formatNumberNoRounding(landTransferAmount)} 万元
                </Text>
                <Text size="xs" c="#666" mt={8}>
                  运营期土地成本合计：{calculateLandTransferTotalCost(currentConfig.acreage ?? 0, currentConfig.unitPrice ?? 0, context?.operationYears || 0).toLocaleString()} 万元
                </Text>
              </div>
            </>
          )}
          
          {/* "应用达产率"复选框 - 仅在"直接填金额"类型时显示 */}
          {!isLandTransfer && (
            <Checkbox
              label="应用达产率"
              checked={currentConfig.applyProductionRate}
              onChange={(event) => setTempOtherConfig({
                ...currentConfig,
                applyProductionRate: event.currentTarget.checked
              })}
            />
          )}
          
          {/* 备注输入框 - 仅当"费用类型"为"土地流转费"时显示 */}
          {showRemarkField && (
            <TextInput
              label="备注"
              value={currentConfig.remark || ''}
              onChange={(e) => setTempOtherConfig({
                ...currentConfig,
                remark: e.target.value
              })}
              placeholder="请输入备注信息"
              description={isLandTransfer ? '💡 土地流转费说明信息' : undefined}
            />
          )}
          
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

  // 渲染管理费用配置弹窗
  const renderManagementModal = () => {
    // 初始化临时配置（当弹窗打开时）- 防御性检查：如果 management 不存在，使用默认值
    React.useEffect(() => {
      if (showManagementModal && !tempManagementConfig) {
        const savedConfig = costConfig.management;
        if (savedConfig) {
          // 有配置数据时，从配置中读取达产率
          setTempManagementConfig({...savedConfig});
        } else {
          // 没有配置数据时，默认应用达产率为 false
          setTempManagementConfig({ directAmount: 0, applyProductionRate: false });
        }
      }
    }, [showManagementModal, costConfig.management, tempManagementConfig]);
    
    // 计算管理费用金额（使用临时配置）- 防御性检查
    const calculateManagementAmount = () => {
      const config = tempManagementConfig || (costConfig.management || { directAmount: 0, applyProductionRate: false });
      return config.directAmount || 0;
    };
    
    // 保存管理费用配置
    const handleSaveManagementConfig = () => {
      if (tempManagementConfig) {
        // 将临时配置更新到全局状态
        updateCostConfig({
          management: tempManagementConfig
        });
        
        // 清除临时配置
        setTempManagementConfig(null);
        
        // 关闭弹窗
        setShowManagementModal(false);
        
        // 显示成功通知
        notifications.show({
          title: '保存成功',
          message: '管理费用配置已保存',
          color: 'green',
        });
      }
    };
    
    // 取消编辑
    const handleCancelManagementConfig = () => {
      // 清除临时配置
      setTempManagementConfig(null);
      // 关闭弹窗
      setShowManagementModal(false);
    };
    
    const currentConfig = tempManagementConfig || costConfig.management || { directAmount: 0, applyProductionRate: false };
  
    return (
      <Modal
        opened={showManagementModal}
        onClose={handleCancelManagementConfig}
        title="管理费用配置"
        size="md"
        centered
      >
        <Stack gap="md">
          <NumberInput
            label="直接金额（万元）"
            value={currentConfig.directAmount || 0}
            onChange={(value) => setTempManagementConfig({
              ...currentConfig,
              directAmount: Number(value)
            })}
            min={0}
            decimalScale={2}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setTempManagementConfig({
                  ...currentConfig,
                  directAmount: 0
                })}
                title="清除"
                style={{ marginLeft: '-3px' }}
              >
                <IconX size={14} />
              </ActionIcon>
            }
          />
          
          <Checkbox
            label="应用达产率"
            checked={currentConfig.applyProductionRate}
            onChange={(event) => setTempManagementConfig({
              ...currentConfig,
              applyProductionRate: event.currentTarget.checked
            })}
          />
          

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleCancelManagementConfig}>
              取消
            </Button>
            <Button
              onClick={handleSaveManagementConfig}
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
            <Group gap="xs">
              {/* 不含税版本导出按钮 */}
              <Tooltip label="导出Excel（不含税版本）">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size={18}
                  onClick={handleExportCostTable}
                >
                  <IconDownload size={20} />
                </ActionIcon>
              </Tooltip>
              {/* 含税版本导出按钮 */}
              <Tooltip label="导出Excel（含税版本）">
                <ActionIcon
                  variant="light"
                  color="green"
                  size={18}
                  onClick={handleExportCostTableWithTax}
                >
                  <IconDownload size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        }
        size="calc(100vw - 100px)"
        centered
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        {(() => {
          if (!context) return <Text c="red">项目上下文未加载</Text>

          const operationYears = context.operationYears
          const years = Array.from({ length: operationYears }, (_, i) => i + 1)

          return (
            <>
              <Table striped withTableBorder style={{ fontSize: '11px' }}>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                    <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
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
                  {/* 1. 营业成本 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>营业成本</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 营业成本合计列 = 第1.1行至第1.5行合计列数值的总和
                        let total = 0;
                        
                        // 1.1 外购原材料费（除税）合计列
                        const rawMaterialsTotal = calculateRawMaterialsExcludingTax(undefined, years);
                        total += rawMaterialsTotal;
                        
                        // 1.2 外购燃料及动力费（除税）合计列
                        const fuelPowerTotal = calculateFuelPowerExcludingTax(undefined, years);
                        total += fuelPowerTotal;
                        
                        // 1.3 工资及福利费合计列
                        const wagesTotal = calculateWagesTotal(undefined, years);
                        total += wagesTotal;
                        
                        // 1.4 修理费合计列
                        let repairTotal = 0;
                        years.forEach((year) => {
                          let yearRepair = 0;
                          if (costConfig.repair.type === 'percentage') {
                            // 使用与修理费配置弹窗相同的计算基数
                            yearRepair += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                          } else {
                            yearRepair += costConfig.repair.directAmount || 0;
                          }
                          // 修理费不应用达产率
                          repairTotal += yearRepair;
                        });
                        total += repairTotal;
                        
                        // 1.5 其他费用合计列
                        let otherExpensesTotal = 0;
                        years.forEach((year) => {
                          // 土地流转费类型：固定金额，不应用达产率
                          const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
                          
                          let yearTotal = 0;
                          if (isLandTransfer) {
                            const acreage = costConfig.otherExpenses.acreage ?? 0;
                            const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
                            yearTotal += acreage * unitPrice;
                          } else {
                            const productionRate = costConfig.otherExpenses.applyProductionRate
                              ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                              : 1;
                            
                            if (costConfig.otherExpenses.type === 'percentage') {
                              const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                                const income = calculateTaxableIncome(revItem);
                                return sum + income;
                              }, 0);
                              yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                            } else {
                              // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
                              const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
                              const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
                              const inputTax = directAmount * taxRate / (1 + taxRate);
                              yearTotal += directAmount - inputTax;
                            }
                          }
                          otherExpensesTotal += yearTotal;
                        });
                        total += otherExpensesTotal;
                        
                        return formatNumber(total);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      // 营业成本运营期各年列 = 第1.1行至第1.5行对应年份列数据的求和
                      let total = 0;
                      
                      // 1.1 外购原材料费（除税）对应年份列
                      const rawMaterialsYear = calculateRawMaterialsExcludingTax(year, years);
                      total += rawMaterialsYear;
                      
                      // 1.2 外购燃料及动力费（除税）对应年份列
                      const fuelPowerYear = calculateFuelPowerExcludingTax(year, years);
                      total += fuelPowerYear;
                      
                      // 1.3 工资及福利费对应年份列
                      const wagesYear = calculateWagesTotal(year, years);
                      total += wagesYear;
                      
                      // 1.4 修理费对应年份列
                      let yearRepair = 0;
                      if (costConfig.repair.type === 'percentage') {
                        // 使用与修理费配置弹窗相同的计算基数
                        yearRepair += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                      } else {
                        yearRepair += costConfig.repair.directAmount || 0;
                      }
                      // 修理费不应用达产率
                      total += yearRepair;
                      
                      // 1.5 其他费用对应年份列
                      // 土地流转费类型：固定金额，不应用达产率
                      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
                      
                      let yearOtherExpenses = 0;
                      if (isLandTransfer) {
                        const acreage = costConfig.otherExpenses.acreage ?? 0;
                        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
                        yearOtherExpenses = acreage * unitPrice;
                      } else {
                        const productionRate = costConfig.otherExpenses.applyProductionRate
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        if (costConfig.otherExpenses.type === 'percentage') {
                          const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                            const income = calculateTaxableIncome(revItem);
                            return sum + income;
                          }, 0);
                          yearOtherExpenses += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                        } else {
                          // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
                          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
                          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
                          const inputTax = directAmount * taxRate / (1 + taxRate);
                          yearOtherExpenses += directAmount - inputTax;
                        }
                      }
                      total += yearOtherExpenses;
                      
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {formatNumber(total)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {/* 序号1行无操作图标 */}
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.1 外购原材料费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 外购原材料费（除税）合计 = 直接引用计算函数
                        return formatNumber(calculateRawMaterialsExcludingTax(undefined, years));
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {(() => {
                          // 外购原材料费（除税） = 直接引用计算函数
                          return formatNumber(calculateRawMaterialsExcludingTax(year, years));
                        })()}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
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
                    </Table.Td>
                  </Table.Tr>
                  


                  {/* 1.2 外购燃料及动力费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.2</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购燃料及动力费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 外购燃料及动力费合计列引用外购燃料及动力（除税）的合计
                        return formatNumber(calculateFuelPowerExcludingTax(undefined, years));
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      // 外购燃料及动力费运营期列引用外购燃料及动力（除税）的对应年份数据
                      const yearTotal = calculateFuelPowerExcludingTax(year, years);
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {formatNumber(yearTotal)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
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
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.3 工资及福利费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>工资及福利费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 工资及福利费合计 = 直接引用工资及福利明细表合计列数据
                        return formatNumber(calculateWagesTotal(undefined, years));
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {(() => {
                          // 工资及福利费 = 直接引用工资及福利明细表对应年份的数据
                          return formatNumber(calculateWagesTotal(year, years));
                        })()}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
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
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.4 修理费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>修理费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 修理费合计列 = 运营期各年数值的总和
                        let total = 0;
                        years.forEach((year) => {
                          let yearTotal = 0;
                          if (costConfig.repair.type === 'percentage') {
                            // 使用与修理费配置弹窗相同的计算基数
                            yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                          } else {
                            yearTotal += costConfig.repair.directAmount || 0;
                          }
                          // 修理费不应用达产率
                          total += yearTotal;
                        });
                        return formatNumber(total);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      let yearTotal = 0;
                      if (costConfig.repair.type === 'percentage') {
                        // 使用与修理费配置弹窗相同的计算基数
                        yearTotal += fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                      } else {
                        yearTotal += costConfig.repair.directAmount || 0;
                      }
                      // 修理费不应用达产率
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {formatNumber(yearTotal)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
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
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.5 其他费用（使用自定义名称） */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>{costConfig.otherExpenses.name || '其他费用'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 其他费用合计列 = 运营期各年数值的总和
                        let total = 0;
                        years.forEach((year) => {
                          // 土地流转费类型：固定金额，不应用达产率
                          const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
                          
                          let yearTotal = 0;
                          if (isLandTransfer) {
                            const acreage = costConfig.otherExpenses.acreage ?? 0;
                            const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
                            yearTotal = acreage * unitPrice;
                          } else {
                            const productionRate = costConfig.otherExpenses.applyProductionRate 
                              ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                              : 1;
                            
                            if (costConfig.otherExpenses.type === 'percentage') {
                              const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                                const income = calculateTaxableIncome(revItem);
                                return sum + income;
                              }, 0);
                              yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                            } else {
                              // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
                              const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
                              const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
                              const inputTax = directAmount * taxRate / (1 + taxRate);
                              yearTotal += directAmount - inputTax;
                            }
                          }
                          total += yearTotal;
                        });
                        return formatNumber(total);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      // 土地流转费类型：固定金额，不应用达产率
                      const isLandTransfer = costConfig.otherExpenses.expenseType === 'landTransfer';
                      
                      let yearTotal = 0;
                      if (isLandTransfer) {
                        const acreage = costConfig.otherExpenses.acreage ?? 0;
                        const unitPrice = costConfig.otherExpenses.unitPrice ?? 0;
                        yearTotal = acreage * unitPrice;
                      } else {
                        const productionRate = costConfig.otherExpenses.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        if (costConfig.otherExpenses.type === 'percentage') {
                          const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                            const income = calculateTaxableIncome(revItem);
                            return sum + income;
                          }, 0);
                          yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                        } else {
                          // 直接金额 - 其他费用（除税）= 含税金额 - 进项税额
                          const directAmount = (costConfig.otherExpenses.directAmount ?? 0) * productionRate;
                          const taxRate = (costConfig.otherExpenses.taxRate ?? 9) / 100;
                          const inputTax = directAmount * taxRate / (1 + taxRate);
                          yearTotal += directAmount - inputTax;
                        }
                      }
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {formatNumber(yearTotal)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
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
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 2. 管理费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>管理费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {formatNumber(calculateManagementExpenses(undefined, years))}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {formatNumber(calculateManagementExpenses(year, years))}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowManagementModal(true)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 3. 利息支出 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>利息支出</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 利息支出 = 利息支出（引用还本付息计划表序号2.2的付息行）
                        let totalInterest = 0;
                        years.forEach((year) => {
                          // 获取还本付息计划表中序号2.2（付息）行的数据
                          const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
                          if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
                            totalInterest += interestRow.分年数据[year - 1];
                          }
                        });
                        return formatNumber(totalInterest);
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {(() => {
                          // 利息支出 = 利息支出（引用还本付息计划表序号2.2的付息行）
                          let yearInterest = 0;
                          
                          // 获取还本付息计划表中序号2.2（付息）行的数据
                          const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
                          if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
                            yearInterest = interestRow.分年数据[year - 1];
                          }
                          
                          return formatNumber(yearInterest);
                        })()}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  

                  
                  {/* 4. 折旧费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>折旧费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 折旧费合计列 = 运营期各年折旧费的总和
                        let totalDepreciation = 0;
                        years.forEach((year) => {
                          const yearIndex = year - 1; // 转换为0-based索引
                          // 引用折旧与摊销估算表中序号A和D的当年值之和
                          const rowA = depreciationData.find(row => row.序号 === 'A');
                          const rowD = depreciationData.find(row => row.序号 === 'D');
                          const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
                          totalDepreciation += yearDepreciation;
                        });
                        return formatNumber(totalDepreciation);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const yearIndex = year - 1; // 转换为0-based索引
                      return (
                        <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {(() => {
                            // 引用折旧与摊销估算表中序号A和D的当年值之和
                            const rowA = depreciationData.find(row => row.序号 === 'A');
                            const rowD = depreciationData.find(row => row.序号 === 'D');
                            const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
                            return formatNumber(yearDepreciation);
                          })()}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 5. 摊销费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>摊销费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 摊销费合计列 = 运营期各年摊销费的总和
                        let totalAmortization = 0;
                        years.forEach((year) => {
                          const yearIndex = year - 1; // 转换为0-based索引
                          // 引用折旧与摊销估算表中序号E的当年值
                          const rowE = depreciationData.find(row => row.序号 === 'E');
                          const yearAmortization = rowE?.分年数据[yearIndex] || 0;
                          totalAmortization += yearAmortization;
                        });
                        return formatNumber(totalAmortization);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const yearIndex = year - 1; // 转换为0-based索引
                      return (
                        <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {(() => {
                            // 引用折旧与摊销估算表中序号E的当年值
                            const rowE = depreciationData.find(row => row.序号 === 'E');
                            return formatNumber(rowE?.分年数据[yearIndex] || 0);
                          })()}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 6. 开发成本 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>6</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>开发成本</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                                    {/* 7. 总成本费用合计 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>7</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>总成本费用合计</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {/* 【大模型编程规范修复】直接使用totalCostTableData中预计算的数据 */}
                      {formatNumber(totalCostTableData?.rows?.[11]?.total ?? 0)}
                    </Table.Td>
                    {totalCostTableData?.rows?.[11]?.years?.map((yearData) => (
                      <Table.Td key={yearData.year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                        {/* 【大模型编程规范修复】直接使用totalCostTableData中预计算的数据 */}
                        {formatNumber(yearData.value ?? 0)}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
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
      
      {/* 管理费用配置弹窗 */}
      {renderManagementModal()}
      
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

export default DynamicCostTable;
