import React, { useState, useMemo, useEffect } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Modal,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  UnstyledButton,
  SegmentedControl,
  NumberInput,
  TextInput,
  ScrollArea,
  Paper,
  Box,
  Alert,
  Loader
} from '@mantine/core'
import {
  IconTable,
  IconDownload,
  IconBuilding,
  IconChartLine,
  IconCoin,
  IconCalculator,
  IconFileText,
  IconCode,
  IconSettings,
  IconBug
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, calculateYearlyRevenue, getProductionRateForYear, calculateOtherTaxesAndSurcharges } from '@/stores/revenueCostStore'
import { revenueCostApi } from '@/lib/api'
import * as XLSX from 'xlsx'
import AnnualInvestmentTable from './AnnualInvestmentTable'
import LoanRepaymentScheduleTable from './LoanRepaymentScheduleTable'
import JsonDataViewer from './JsonDataViewer'
import { FinancialIndicatorsDebug } from './FinancialIndicatorsDebug'

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

// 格式化数字显示，若为0则显示空白
const formatNumberWithZeroBlank = (value: number): string => {
  if (value === 0) {
    return '';
  }
  return formatNumberNoRounding(value);
}

// 格式化投资回收期，保留2位小数
const formatPaybackPeriod = (value: number): string => {
  if (value === 0 || !isFinite(value)) {
    return '-';
  }
  return formatNumberNoRounding(value);
}

// 计算财务内部收益率（IRR）- 使用牛顿-拉夫逊法
const calculateIRR = (cashFlows: number[], initialGuess: number = 0.1): number => {
  if (cashFlows.length === 0) return 0;
  
  let irr = initialGuess;
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    
    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + irr, j);
      dnpv -= j * cashFlows[j] / Math.pow(1 + irr, j + 1);
    }
    
    const newIrr = irr - npv / dnpv;
    
    if (Math.abs(newIrr - irr) < tolerance) {
      return newIrr * 100; // 转换为百分比
    }
    
    irr = newIrr;
    
    // 防止发散
    if (irr < -0.99) irr = -0.99;
    if (irr > 10) irr = 10;
  }
  
  return irr * 100; // 转换为百分比
};

// 计算财务净现值（NPV）
// NPV = Σ [CFt / (1+r)^t]，其中 t 从 1 开始（第1年、第2年...）
const calculateNPV = (cashFlows: number[], discountRate: number): number => {
  if (cashFlows.length === 0) return 0;
  
  let npv = 0;
  const rate = discountRate / 100; // 转换为小数
  
  for (let i = 0; i < cashFlows.length; i++) {
    // t = i + 1，因为第1年的指数是1，不是0
    npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
  }
  
  return npv;
};

// 计算静态投资回收期
const calculateStaticPaybackPeriod = (cumulativeCashFlows: number[]): number => {
  if (cumulativeCashFlows.length === 0) return 0;
  
  for (let i = 0; i < cumulativeCashFlows.length; i++) {
    if (cumulativeCashFlows[i] >= 0) {
      if (i === 0) return 1;
      
      const prevCumulative = cumulativeCashFlows[i - 1];
      const currentCumulative = cumulativeCashFlows[i];
      const currentCashFlow = currentCumulative - prevCumulative;
      
      // 线性插值计算精确的回收期
      if (currentCashFlow > 0) {
        return i + Math.abs(prevCumulative) / currentCashFlow;
      } else {
        return i + 1;
      }
    }
  }
  
  // 如果整个项目周期内都没有回收，返回项目周期+1
  return cumulativeCashFlows.length + 1;
};

// 计算动态投资回收期
const calculateDynamicPaybackPeriod = (dynamicCumulativeCashFlows: number[]): number => {
  if (dynamicCumulativeCashFlows.length === 0) return 0;
  
  for (let i = 0; i < dynamicCumulativeCashFlows.length; i++) {
    if (dynamicCumulativeCashFlows[i] >= 0) {
      if (i === 0) return 1;
      
      const prevCumulative = dynamicCumulativeCashFlows[i - 1];
      const currentCumulative = dynamicCumulativeCashFlows[i];
      const currentCashFlow = currentCumulative - prevCumulative;
      
      // 线性插值计算精确的回收期
      if (currentCashFlow > 0) {
        return i + Math.abs(prevCumulative) / currentCashFlow;
      } else {
        return i + 1;
      }
    }
  }
  
  // 如果整个项目周期内都没有回收，返回项目周期+1
  return dynamicCumulativeCashFlows.length + 1;
};

// 安全的财务指标计算，处理可能的错误情况
const safeCalculateIRR = (cashFlows: number[], initialGuess: number = 0.1): number => {
  try {
    if (!cashFlows || cashFlows.length === 0) {
      return 0;
    }
    return calculateIRR(cashFlows, initialGuess);
  } catch (error) {
    console.error('计算IRR时出错:', error);
    return 0;
  }
}

const safeCalculateNPV = (cashFlows: number[], discountRate: number): number => {
  try {
    if (!cashFlows || cashFlows.length === 0) {
      return 0;
    }
    return calculateNPV(cashFlows, discountRate);
  } catch (error) {
    console.error('计算NPV时出错:', error);
    return 0;
  }
}

const safeCalculatePaybackPeriod = (cumulativeCashFlows: number[]): number => {
  try {
    if (!cumulativeCashFlows || cumulativeCashFlows.length === 0) {
      return 0;
    }
    return calculateStaticPaybackPeriod(cumulativeCashFlows);
  } catch (error) {
    console.error('计算投资回收期时出错:', error);
    return 0;
  }
}

const safeCalculateDynamicPaybackPeriod = (cumulativeCashFlows: number[]): number => {
  try {
    if (!cumulativeCashFlows || cumulativeCashFlows.length === 0) {
      return 0;
    }
    return calculateDynamicPaybackPeriod(cumulativeCashFlows);
  } catch (error) {
    console.error('计算动态投资回收期时出错:', error);
    return 0;
  }
}

/**
 * 项目投资现金流量表格组件
 */
interface FinancialIndicatorsTableProps {
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
  investmentEstimate?: any
}

const FinancialIndicatorsTable: React.FC<FinancialIndicatorsTableProps> = ({
  repaymentTableData = [],
  depreciationData = [],
  investmentEstimate
}) => {
  const { context, revenueItems, productionRates, costConfig, revenueTableData, costTableData, profitDistributionTableData } = useRevenueCostStore()
  
  // 调试：检查 investmentEstimate 的实际值
  console.log('FinancialIndicatorsTable - investmentEstimate:', investmentEstimate);
  console.log('FinancialIndicatorsTable - investmentEstimate.partF:', investmentEstimate?.partF);
  console.log('FinancialIndicatorsTable - investmentEstimate.partF.分年利息:', investmentEstimate?.partF?.分年利息);
  const [showProfitTaxModal, setShowProfitTaxModal] = useState(false)
  
  // 表格弹窗状态
  const [showAnnualInvestmentModal, setShowAnnualInvestmentModal] = useState(false)
  const [showProfitDistributionModal, setShowProfitDistributionModal] = useState(false)
  const [showFinancialIndicatorsModal, setShowFinancialIndicatorsModal] = useState(false)
  const [showProfitSettingsModal, setShowProfitSettingsModal] = useState(false)
  const [showLoanRepaymentModal, setShowLoanRepaymentModal] = useState(false)
  const [showFinancialIndicatorsSettings, setShowFinancialIndicatorsSettings] = useState(false)
  
  // 财务指标设置状态
  const [preTaxRate, setPreTaxRate] = useState(6)
  const [postTaxRate, setPostTaxRate] = useState(6)
  
  // 临时状态，用于设置弹窗中的值
  const [tempPreTaxRate, setTempPreTaxRate] = useState(6)
  const [tempPostTaxRate, setTempPostTaxRate] = useState(6)
  
  // 用于强制刷新财务指标表的状态
  const [financialIndicatorsRefreshKey, setFinancialIndicatorsRefreshKey] = useState(0)
  
  // 缓存财务指标计算结果
  const [cachedFinancialIndicators, setCachedFinancialIndicators] = useState<any>(null)
  const [lastCalculationKey, setLastCalculationKey] = useState<string>('')
  
  // JSON 数据查看器状态
  const [showJsonViewer, setShowJsonViewer] = useState(false)
  const [jsonLoading, setJsonLoading] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [jsonData, setJsonData] = useState<any>(null)
  
  // 调试状态
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugIndicators, setDebugIndicators] = useState<any>(null)
  const [debugCashFlowData, setDebugCashFlowData] = useState<any[]>([])
  
  // 利润与利润分配表设置状态
  const [subsidyIncome, setSubsidyIncome] = useState(0)
  const [incomeTaxRate, setIncomeTaxRate] = useState(25)
  const [statutorySurplusRate, setStatutorySurplusRate] = useState(10)
  
  // 设置弹窗中的临时状态
  const [tempSubsidyIncome, setTempSubsidyIncome] = useState(0)
  const [tempIncomeTaxRate, setTempIncomeTaxRate] = useState(25)
  const [tempStatutorySurplusRate, setTempStatutorySurplusRate] = useState(10)
  
  // 从localStorage加载设置
  useEffect(() => {
    const savedSubsidyIncome = localStorage.getItem('profitSubsidyIncome')
    const savedIncomeTaxRate = localStorage.getItem('profitIncomeTaxRate')
    const savedStatutorySurplusRate = localStorage.getItem('profitStatutorySurplusRate')
    
    if (savedSubsidyIncome !== null) {
      setSubsidyIncome(Number(savedSubsidyIncome))
      setTempSubsidyIncome(Number(savedSubsidyIncome))
    }
    if (savedIncomeTaxRate !== null) {
      setIncomeTaxRate(Number(savedIncomeTaxRate))
      setTempIncomeTaxRate(Number(savedIncomeTaxRate))
    }
    if (savedStatutorySurplusRate !== null) {
      setStatutorySurplusRate(Number(savedStatutorySurplusRate))
      setTempStatutorySurplusRate(Number(savedStatutorySurplusRate))
    }
    
    // 加载财务指标基准收益率设置
    const savedPreTaxRate = localStorage.getItem('financialIndicatorsPreTaxRate');
    const savedPostTaxRate = localStorage.getItem('financialIndicatorsPostTaxRate');
    
    if (savedPreTaxRate !== null) {
      setPreTaxRate(Number(savedPreTaxRate));
      setTempPreTaxRate(Number(savedPreTaxRate));
    }
    if (savedPostTaxRate !== null) {
      setPostTaxRate(Number(savedPostTaxRate));
      setTempPostTaxRate(Number(savedPostTaxRate));
    }
  }, [])
  
  // 保存设置到localStorage
  const saveProfitSettings = () => {
    // 将临时状态值保存到实际状态
    setSubsidyIncome(tempSubsidyIncome)
    setIncomeTaxRate(tempIncomeTaxRate)
    setStatutorySurplusRate(tempStatutorySurplusRate)
    
    // 保存到localStorage
    localStorage.setItem('profitSubsidyIncome', tempSubsidyIncome.toString())
    localStorage.setItem('profitIncomeTaxRate', tempIncomeTaxRate.toString())
    localStorage.setItem('profitStatutorySurplusRate', tempStatutorySurplusRate.toString())
    
    notifications.show({
      title: '保存成功',
      message: '利润与利润分配表设置已保存，表格已重新计算',
      color: 'green',
    })
    
    setShowProfitSettingsModal(false)
    
    // 强制重新渲染表格
    setShowProfitDistributionModal(false)
    setTimeout(() => {
      setShowProfitDistributionModal(true)
    }, 100)
  }
  
  // 打开设置弹窗时，将当前状态复制到临时状态
  const openProfitSettingsModal = () => {
    setTempSubsidyIncome(subsidyIncome)
    setTempIncomeTaxRate(incomeTaxRate)
    setTempStatutorySurplusRate(statutorySurplusRate)
    setShowProfitSettingsModal(true)
  }
  
  // 配置按钮数据
  const investmentConfigItems = [
    {
      title: '分年度投资估算表',
      icon: IconBuilding,
      color: 'blue',
      onClick: () => setShowAnnualInvestmentModal(true)
    },
    {
      title: '利润与利润分配表',
      icon: IconChartLine,
      color: 'green',
      onClick: () => {
        saveProfitDistributionTableData();
        setShowProfitDistributionModal(true);
      }
    },
    {
      title: '项目投资现金流量表',
      icon: IconCoin,
      color: 'orange',
      onClick: () => setShowProfitTaxModal(true)
    },
    {
      title: '财务计算指标表',
      icon: IconCalculator,
      color: 'purple',
      onClick: () => setShowFinancialIndicatorsModal(true)
    },
    {
      title: '借款还本付息计划表',
      icon: IconFileText,
      color: 'cyan',
      onClick: () => setShowLoanRepaymentModal(true)
    },
  ]
  
  // 计算营业收入的函数（营业收入 = 营业收入（含税） - 销项税额）
  const calculateOperatingRevenue = (year?: number): number => {
    if (year !== undefined) {
      // 从 revenueTableData 中获取"营业收入"（序号1）和"销项税额"（序号2.1）的运营期列数据
      if (revenueTableData && revenueTableData.rows) {
        const revenueRow = revenueTableData.rows.find(r => r.序号 === '1');
        const outputTaxRow = revenueTableData.rows.find(r => r.序号 === '2.1');
        
        if (revenueRow && revenueRow.运营期 && revenueRow.运营期[year - 1] !== undefined &&
            outputTaxRow && outputTaxRow.运营期 && outputTaxRow.运营期[year - 1] !== undefined) {
          // 营业收入 = 营业收入（含税） - 销项税额
          return revenueRow.运营期[year - 1] - outputTaxRow.运营期[year - 1];
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算指定年份的营业收入（不含税）
      // 利润与利润分配表的营业收入 = 营业收入估算表的营业收入 - 销项税额
      const productionRate = productionRates?.find(p => p.yearIndex === year)?.rate || 1;
      return revenueItems.reduce((sum, item) => {
        // 计算含税收入
        const taxableRevenue = calculateYearlyRevenue(item, year, productionRate);
        // 计算销项税额 = 含税收入 - 不含税收入 = 含税收入 - 含税收入/(1+税率)
        const outputTax = taxableRevenue - taxableRevenue / (1 + item.vatRate);
        // 不含税收入 = 含税收入 - 销项税额
        const nonTaxRevenue = taxableRevenue - outputTax;
        return sum + nonTaxRevenue;
      }, 0);
    } else {
      // 从 revenueTableData 中获取"营业收入"（序号1）和"销项税额"（序号2.1）的合计数据
      if (revenueTableData && revenueTableData.rows) {
        const revenueRow = revenueTableData.rows.find(r => r.序号 === '1');
        const outputTaxRow = revenueTableData.rows.find(r => r.序号 === '2.1');
        
        if (revenueRow && revenueRow.合计 !== undefined &&
            outputTaxRow && outputTaxRow.合计 !== undefined) {
          // 营业收入 = 营业收入（含税） - 销项税额
          return revenueRow.合计 - outputTaxRow.合计;
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算所有年份的营业收入合计
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateOperatingRevenue(year);
      });
      return totalSum;
    }
  };
  
  // 计算含税营业收入的函数
  const calculateTaxableOperatingRevenue = (year?: number): number => {
    if (year !== undefined) {
      // 从 revenueTableData 中获取"营业收入"（序号1）的运营期列数据（含税收入）
      if (revenueTableData && revenueTableData.rows) {
        const revenueRow = revenueTableData.rows.find(r => r.序号 === '1');
        
        if (revenueRow && revenueRow.运营期 && revenueRow.运营期[year - 1] !== undefined) {
          return revenueRow.运营期[year - 1];
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      const productionRate = productionRates?.find(p => p.yearIndex === year)?.rate || 1;
      return revenueItems.reduce((sum, item) => {
        // 计算含税收入
        const taxableRevenue = calculateYearlyRevenue(item, year, productionRate);
        return sum + taxableRevenue;
      }, 0);
    } else {
      // 从 revenueTableData 中获取"营业收入"（序号1）的合计数据（含税收入）
      if (revenueTableData && revenueTableData.rows) {
        const revenueRow = revenueTableData.rows.find(r => r.序号 === '1');
        
        if (revenueRow && revenueRow.合计 !== undefined) {
          return revenueRow.合计;
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateTaxableOperatingRevenue(year);
      });
      return totalSum;
    }
  };
  
  // 计算补贴收入的函数
  const calculateSubsidyIncome = (year?: number): number => {
    // 使用设置的年补贴收入
    if (year !== undefined) {
      return subsidyIncome;
    } else {
      // 计算所有年份的补贴收入合计
      if (!context) return 0;
      return subsidyIncome * context.operationYears;
    }
  };
  
  // 计算回收固定资产余值的函数
  const calculateFixedAssetResidual = (year?: number): number => {
    if (!context) return 0;
    
    // 只在运营期最后一年回收
    if (year !== undefined && year === context.operationYears) {
      // 计算固定资产余值 = 固定资产净值 + 无形资产净值
      // 固定资产净值 = 原值 - 累计折旧摊销额
      // 无形资产净值 = 原值 - 累计折旧摊销额
      
      // 从折旧数据中获取固定资产净值（序号A和D）
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      
      // 计算固定资产净值
      let fixedAssetsNetValue = 0;
      if (rowA && rowA.原值 !== undefined && rowA.分年数据) {
        const totalDepreciation = rowA.分年数据.reduce((sum: number, val: number) => sum + val, 0);
        fixedAssetsNetValue = (rowA.原值 || 0) - totalDepreciation;
      }
      
      if (rowD && rowD.原值 !== undefined && rowD.分年数据) {
        const totalDepreciation = rowD.分年数据.reduce((sum: number, val: number) => sum + val, 0);
        fixedAssetsNetValue += (rowD.原值 || 0) - totalDepreciation;
      }
      
      // 从折旧数据中获取无形资产净值（序号E）
      const rowE = depreciationData.find(row => row.序号 === 'E');
      
      // 计算无形资产净值
      let intangibleAssetsNetValue = 0;
      if (rowE && rowE.原值 !== undefined && rowE.分年数据) {
        const totalAmortization = rowE.分年数据.reduce((sum: number, val: number) => sum + val, 0);
        intangibleAssetsNetValue = (rowE.原值 || 0) - totalAmortization;
      }
      
      return fixedAssetsNetValue + intangibleAssetsNetValue;
    }
    
    if (year === undefined) {
      // 只在运营期最后一年有回收
      return calculateFixedAssetResidual(context.operationYears);
    }
    
    return 0;
  };
  
  // 计算回收流动资金的函数
  const calculateWorkingCapitalRecovery = (year?: number): number => {
    if (!context) return 0;
    
    // 只在运营期最后一年回收
    if (year !== undefined && year === context.operationYears) {
      // 这里应该从流动资金配置中获取，目前返回0
      return 0;
    }
    
    if (year === undefined) {
      // 只在运营期最后一年有回收
      return calculateWorkingCapitalRecovery(context.operationYears);
    }
    
    return 0;
  };
  
  // 计算建设投资的函数
  const calculateConstructionInvestment = (year?: number): number => {
    if (!context || !investmentEstimate) return 0;
    
    // 从分年度投资估算表中获取建设投资数据
    if (year !== undefined) {
      // 建设投资只在建设期有数据
      if (year <= context.constructionYears) {
        // 计算分年度投资数据
        // 从 estimate_data.partA.children 提取第一部分工程费用
        let constructionFee = 0  // 建设工程费
        let equipmentFee = 0     // 设备购置费
        let installationFee = 0   // 安装工程费
        let otherFee = 0         // 其它费用

        if (investmentEstimate.estimate_data?.partA?.children) {
          investmentEstimate.estimate_data.partA.children.forEach((item: any) => {
            constructionFee += Number(item.建设工程费) || 0
            equipmentFee += Number(item.设备购置费) || 0
            installationFee += Number(item.安装工程费) || 0
            otherFee += Number(item.其它费用) || 0
          })
        }

        // 第一部分工程费用合计
        const partATotal = constructionFee + equipmentFee + installationFee + otherFee

        // 从 estimate_data.partB 提取第二部分工程其它费用
        let partBTotal = Number(investmentEstimate.estimate_data?.partB?.合计) || 0
        let landCost = 0  // 土地费用
        if (investmentEstimate.estimate_data?.partB?.children) {
          const landItem = investmentEstimate.estimate_data.partB.children.find(
            (item: any) => item.工程或费用名称 === '土地费用'
          )
          landCost = Number(landItem?.合计) || 0
        }

        // 预备费
        const basicReserve = Number(investmentEstimate.basic_reserve) || 0
        const priceReserve = Number(investmentEstimate.price_reserve) || 0
        const reserveFees = basicReserve + priceReserve

        // 计算各项合计
        // 1. 建筑安装工程费 = (第一部分工程费用合计 - 设备购置费) / 建设期年份
        const buildingInstallationFee = partATotal - equipmentFee

        // 2. 设备购置费 = 第一部分工程费用中的设备购置费，放在建设期最后1年

        // 3. 工程其他费用 = 第二部分工程其它费用合计 - 土地费用，放在建设期第1年
        const engineeringOtherFees = partBTotal - landCost

        // 4. 无形资产费用 = 土地费用，放在建设期第1年
        const intangibleAssetFees = landCost

        // 5. 预备费 = 基本预备费 + 涨价预备费，放在建设期最后1年

        // 根据年份返回相应的投资额
        if (year === 1) {
          // 第1年：建筑安装工程费/建设期年份 + 工程其他费用 + 无形资产费用
          return (buildingInstallationFee / context.constructionYears) + engineeringOtherFees + intangibleAssetFees;
        } else if (year === context.constructionYears) {
          // 最后1年：建筑安装工程费/建设期年份 + 设备购置费 + 预备费
          return (buildingInstallationFee / context.constructionYears) + equipmentFee + reserveFees;
        } else {
          // 中间年份：只有建筑安装工程费/建设期年份
          return buildingInstallationFee / context.constructionYears;
        }
      }
      return 0;
    }
    
    if (year === undefined) {
      // 建设投资合计
      // 计算分年度投资数据
      // 从 estimate_data.partA.children 提取第一部分工程费用
      let constructionFee = 0  // 建设工程费
      let equipmentFee = 0     // 设备购置费
      let installationFee = 0   // 安装工程费
      let otherFee = 0         // 其它费用

      if (investmentEstimate.estimate_data?.partA?.children) {
        investmentEstimate.estimate_data.partA.children.forEach((item: any) => {
          constructionFee += Number(item.建设工程费) || 0
          equipmentFee += Number(item.设备购置费) || 0
          installationFee += Number(item.安装工程费) || 0
          otherFee += Number(item.其它费用) || 0
        })
      }

      // 第一部分工程费用合计
      const partATotal = constructionFee + equipmentFee + installationFee + otherFee

      // 从 estimate_data.partB 提取第二部分工程其它费用
      let partBTotal = Number(investmentEstimate.estimate_data?.partB?.合计) || 0
      let landCost = 0  // 土地费用
      if (investmentEstimate.estimate_data?.partB?.children) {
        const landItem = investmentEstimate.estimate_data.partB.children.find(
          (item: any) => item.工程或费用名称 === '土地费用'
        )
        landCost = Number(landItem?.合计) || 0
      }

      // 预备费
      const basicReserve = Number(investmentEstimate.basic_reserve) || 0
      const priceReserve = Number(investmentEstimate.price_reserve) || 0
      const reserveFees = basicReserve + priceReserve

      // 计算各项合计
      // 1. 建筑安装工程费 = (第一部分工程费用合计 - 设备购置费) / 建设期年份
      const buildingInstallationFee = partATotal - equipmentFee

      // 3. 工程其他费用 = 第二部分工程其它费用合计 - 土地费用，放在建设期第1年
      const engineeringOtherFees = partBTotal - landCost

      // 4. 无形资产费用 = 土地费用，放在建设期第1年
      const intangibleAssetFees = landCost

      // 6. 建设投资合计 = 序号一、二、三、四的合计
      const totalConstructionInvestment = partATotal + engineeringOtherFees + intangibleAssetFees + reserveFees

      return totalConstructionInvestment;
    }
    
    return 0;
  };
  
  // 计算流动资金的函数
  const calculateWorkingCapital = (year?: number): number => {
    if (!context) return 0;
    
    if (year !== undefined) {
      // 流动资金通常在运营期第1年投入
      if (year === context.constructionYears + 1) {
        // 这里应该从流动资金配置中获取，目前返回0
        return 0;
      }
      return 0;
    }
    
    if (year === undefined) {
      // 流动资金合计
      return calculateWorkingCapital(context.constructionYears + 1);
    }
    
    return 0;
  };
  
  // 计算经营成本的函数
  // 直接使用总成本费用估算表中"1 营业成本"的数据
  const calculateOperatingCost = (year?: number): number => {
    if (year !== undefined) {
      // 优先从 costTableData 中获取"经营成本"（序号1）的运营期列数据
      if (costTableData && costTableData.rows) {
        const row = costTableData.rows.find(r => r.序号 === '1');
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          // 直接返回营业成本数据，不添加进项税额
          return row.运营期[year - 1];
        }
      }
      
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算指定年份的经营成本
      const productionRate = productionRates?.find(p => p.yearIndex === year)?.rate || 1;
      
      // 1.1 外购原材料费（除税）
      let rawMaterialsCost = 0;
      (costConfig.rawMaterials.items || []).forEach((item: any) => {
        let baseAmount = 0;
        if (item.sourceType === 'percentage') {
          let revenueBase = 0;
          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
            revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.unitPrice || 0) * (revItem.quantity || 0), 0);
          } else {
            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
            if (revItem) {
              revenueBase = (revItem.unitPrice || 0) * (revItem.quantity || 0);
            }
          }
          baseAmount = revenueBase * (item.percentage || 0) / 100;
        } else if (item.sourceType === 'quantityPrice') {
          baseAmount = (item.quantity || 0) * (item.unitPrice || 0);
        } else if (item.sourceType === 'directAmount') {
          baseAmount = item.directAmount || 0;
        }
        
        // 计算进项税额
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        const inputTax = baseAmount * taxRateDecimal / (1 + taxRateDecimal);
        
        // 外购原材料（除税）= 含税金额 - 进项税额
        rawMaterialsCost += (baseAmount - inputTax) * productionRate;
      });
      
      // 1.2 外购燃料及动力费（除税）
      let fuelPowerCost = 0;
      (costConfig.fuelPower.items || []).forEach((item: any) => {
        let consumption = item.consumption || 0;
        let amount = 0;
        // 对汽油和柴油进行特殊处理：单价×数量/10000
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price || 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price || 0) * productionRate;
        }
        
        // 计算进项税额
        const taxRate = (item.taxRate || 13) / 100;
        const inputTax = amount * taxRate / (1 + taxRate);
        
        // 外购燃料及动力（除税）= 含税金额 - 进项税额
        fuelPowerCost += amount - inputTax;
      });
      
      // 1.3 工资及福利费
      let wagesCost = 0;
      if (costConfig.wages.items && costConfig.wages.items.length > 0) {
        costConfig.wages.items.forEach((item: any) => {
          let currentSalary = item.salaryPerEmployee || 0;
          
          // 根据调整周期和幅度计算第year年的工资
          if (item.changeInterval && item.changePercentage) {
            const adjustmentTimes = Math.floor((year - 1) / item.changeInterval);
            currentSalary = currentSalary * Math.pow(1 + item.changePercentage / 100, adjustmentTimes);
          }
          
          // 计算工资总额
          const yearlySubtotal = item.employees * currentSalary;
          // 计算福利费
          const yearlyWelfare = yearlySubtotal * (item.welfareRate || 0) / 100;
          // 合计
          wagesCost += yearlySubtotal + yearlyWelfare;
        });
      } else {
        wagesCost = costConfig.wages.directAmount || 0;
      }
      
      // 1.4 修理费
      let repairCost = 0;
      if (costConfig.repair.type === 'percentage') {
        // 这里需要获取固定资产投资，目前使用0
        const fixedAssetsInvestment = 0;
        repairCost = fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        repairCost = costConfig.repair.directAmount || 0;
      }
      
      // 1.5 其他费用
      let otherExpensesCost = 0;
      if (costConfig.otherExpenses.type === 'percentage') {
        const revenueBase = revenueItems.reduce((sum, revItem) => {
          return sum + (revItem.unitPrice || 0) * (revItem.quantity || 0);
        }, 0);
        otherExpensesCost = revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
      } else {
        otherExpensesCost = (costConfig.otherExpenses.directAmount || 0) * productionRate;
      }
      
      // 计算经营成本（不添加进项税额）
      return rawMaterialsCost + fuelPowerCost + wagesCost + repairCost + otherExpensesCost;
    } else {
      // 优先从 costTableData 中获取"经营成本"（序号1）的合计数据
      if (costTableData && costTableData.rows) {
        const row = costTableData.rows.find(r => r.序号 === '1');
        if (row && row.合计 !== undefined) {
          // 直接返回营业成本合计数据，不添加进项税额
          return row.合计;
        }
      }
      
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算所有年份的经营成本合计
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateOperatingCost(year);
      });
      return totalSum;
    }
  };
  
  // 计算外购原材料费进项税额的运营期列值
  const calculateRawMaterialsInputTaxForYear = (year: number): number => {
    if (!costConfig.rawMaterials.items || costConfig.rawMaterials.items.length === 0) {
      return 0;
    }

    const productionRate = costConfig.rawMaterials.applyProductionRate
      ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
      : 1;

    let yearInputTax = 0;
    costConfig.rawMaterials.items.forEach((item: any) => {
      const baseAmount = (() => {
        if (item.sourceType === 'percentage') {
          let revenueBase = 0;
          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
            revenueBase = revenueItems.reduce((sum, revItem) => {
              const productionRate = getProductionRateForYear(productionRates, year);
              return sum + calculateYearlyRevenue(revItem, year, productionRate);
            }, 0);
          } else {
            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
            if (revItem) {
              const productionRate = getProductionRateForYear(productionRates, year);
              revenueBase = calculateYearlyRevenue(revItem, year, productionRate);
            }
          }
          return revenueBase * (item.percentage || 0) / 100;
        } else if (item.sourceType === 'quantityPrice') {
          return (item.quantity || 0) * (item.unitPrice || 0);
        } else if (item.sourceType === 'directAmount') {
          return item.directAmount || 0;
        }
        return 0;
      })();

      const taxRate = Number(item.taxRate) || 0;
      const taxRateDecimal = taxRate / 100;
      // 进项税额 = 含税金额 / (1 + 税率) × 税率
      yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
    });

    return yearInputTax;
  };

  // 计算外购燃料及动力费进项税额的运营期列值
  const calculateFuelPowerInputTaxForYear = (year: number): number => {
    if (!costConfig.fuelPower.items || costConfig.fuelPower.items.length === 0) {
      return 0;
    }

    const productionRate = costConfig.fuelPower.applyProductionRate
      ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
      : 1;

    let yearInputTax = 0;
    costConfig.fuelPower.items.forEach((item: any) => {
      let consumption = item.consumption || 0;
      let amount = 0;
      // 对汽油和柴油进行特殊处理：单价×数量/10000
      if (['汽油', '柴油'].includes(item.name)) {
        amount = (item.price || 0) * consumption / 10000 * productionRate;
      } else {
        amount = consumption * (item.price || 0) * productionRate;
      }
      
      const taxRate = (item.taxRate || 13) / 100;
      // 进项税额 = 含税金额 / (1 + 税率) × 税率
      yearInputTax += amount * taxRate / (1 + taxRate);
    });

    return yearInputTax;
  };

  // 计算总进项税额（外购原材料费 + 外购燃料及动力费）
  const calculateTotalInputTaxForYear = (year: number): number => {
    return calculateRawMaterialsInputTaxForYear(year) + calculateFuelPowerInputTaxForYear(year);
  };

  // 计算指定年份的增值税额
  const calculateVatForYear = (year: number): number => {
    // 计算销项税额
    const yearOutputTax = revenueItems.reduce((sum, item) => {
      const productionRate = getProductionRateForYear(productionRates, year);
      const revenue = calculateYearlyRevenue(item, year, productionRate);
      // 销项税额 = 含税收入 - 不含税收入
      return sum + (revenue - revenue / (1 + item.vatRate));
    }, 0);
    
    // 计算进项税额
    const yearInputTax = calculateTotalInputTaxForYear(year);
    
    // 增值税 = 销项税额 - 进项税额
    return yearOutputTax - yearInputTax;
  };

  // 使用revenueCostStore中的共享函数计算其他税费及附加
  const calculateOtherTaxesAndSurchargesLocal = (year: number): number => {
    return calculateOtherTaxesAndSurcharges(revenueItems, productionRates, costConfig, year);
  };

  // 计算不含税经营成本的函数
  const calculateOperatingCostWithoutTax = (year?: number): number => {
    if (year !== undefined) {
      // 计算指定年份的不含税经营成本
      const productionRate = productionRates?.find(p => p.yearIndex === year)?.rate || 1;
      
      // 1.1 外购原材料费（除税）
      let rawMaterialsCost = 0;
      (costConfig.rawMaterials.items || []).forEach((item: any) => {
        let baseAmount = 0;
        if (item.sourceType === 'percentage') {
          let revenueBase = 0;
          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
            revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.unitPrice || 0) * (revItem.quantity || 0), 0);
          } else {
            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
            if (revItem) {
              revenueBase = (revItem.unitPrice || 0) * (revItem.quantity || 0);
            }
          }
          baseAmount = revenueBase * (item.percentage || 0) / 100;
        } else if (item.sourceType === 'quantityPrice') {
          baseAmount = (item.quantity || 0) * (item.unitPrice || 0);
        } else if (item.sourceType === 'directAmount') {
          baseAmount = item.directAmount || 0;
        }
        
        // 计算进项税额
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        const inputTax = baseAmount * taxRateDecimal / (1 + taxRateDecimal);
        
        // 外购原材料（除税）= 含税金额 - 进项税额
        rawMaterialsCost += (baseAmount - inputTax) * productionRate;
      });
      
      // 1.2 外购燃料及动力费（除税）
      let fuelPowerCost = 0;
      (costConfig.fuelPower.items || []).forEach((item: any) => {
        let consumption = item.consumption || 0;
        let amount = 0;
        // 对汽油和柴油进行特殊处理：单价×数量/10000
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price || 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price || 0) * productionRate;
        }
        
        // 计算进项税额
        const taxRate = (item.taxRate || 13) / 100;
        const inputTax = amount * taxRate / (1 + taxRate);
        
        // 外购燃料及动力（除税）= 含税金额 - 进项税额
        fuelPowerCost += amount - inputTax;
      });
      
      // 1.3 工资及福利费
      let wagesCost = 0;
      if (costConfig.wages.items && costConfig.wages.items.length > 0) {
        costConfig.wages.items.forEach((item: any) => {
          let currentSalary = item.salaryPerEmployee || 0;
          
          // 根据调整周期和幅度计算第year年的工资
          if (item.changeInterval && item.changePercentage) {
            const adjustmentTimes = Math.floor((year - 1) / item.changeInterval);
            currentSalary = currentSalary * Math.pow(1 + item.changePercentage / 100, adjustmentTimes);
          }
          
          // 计算工资总额
          const yearlySubtotal = item.employees * currentSalary;
          // 计算福利费
          const yearlyWelfare = yearlySubtotal * (item.welfareRate || 0) / 100;
          // 合计
          wagesCost += yearlySubtotal + yearlyWelfare;
        });
      } else {
        wagesCost = costConfig.wages.directAmount || 0;
      }
      
      // 1.4 修理费
      let repairCost = 0;
      // 这里需要获取固定资产投资，目前使用0
      const fixedAssetsInvestment = 0;
      if (costConfig.repair.type === 'percentage') {
        repairCost = fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        repairCost = costConfig.repair.directAmount || 0;
      }
      
      // 1.5 其他费用
      let otherExpensesCost = 0;
      if (costConfig.otherExpenses.type === 'percentage') {
        const revenueBase = revenueItems.reduce((sum, revItem) => {
          return sum + (revItem.unitPrice || 0) * (revItem.quantity || 0);
        }, 0);
        otherExpensesCost = revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
      } else {
        otherExpensesCost = (costConfig.otherExpenses.directAmount || 0) * productionRate;
      }
      
      // 不含税经营成本 = 1.1 + 1.2 + 1.3 + 1.4 + 1.5
      return rawMaterialsCost + fuelPowerCost + wagesCost + repairCost + otherExpensesCost;
    } else {
      // 计算所有年份的不含税经营成本合计
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateOperatingCostWithoutTax(year);
      });
      return totalSum;
    }
  };

  // 计算增值税、房产税等及附加的函数
  const calculateVatAndTaxes = (year?: number): number => {
    if (year !== undefined) {
      // 优先从 revenueTableData 中获取"其他税费及附加"（序号3）的运营期列数据
      if (revenueTableData && revenueTableData.rows) {
        const row = revenueTableData.rows.find(r => r.序号 === '3');
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          return row.运营期[year - 1];
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算指定年份的增值税、房产税等及附加
      // 这里应该根据实际税率计算，目前返回0
      return 0;
    } else {
      // 优先从 revenueTableData 中获取"其他税费及附加"（序号3）的合计数据
      if (revenueTableData && revenueTableData.rows) {
        const row = revenueTableData.rows.find(r => r.序号 === '3');
        if (row && row.合计 !== undefined) {
          return row.合计;
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算所有年份的增值税、房产税等及附加合计
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateVatAndTaxes(year);
      });
      return totalSum;
    }
  };
  
  // 计算维持运营投资的函数
  const calculateMaintenanceInvestment = (year?: number): number => {
    // 目前没有维持运营投资的数据，返回0
    return 0;
  };
  
  // 计算调整所得税的函数
  const calculateAdjustedIncomeTax = (year?: number): number => {
    if (year !== undefined) {
      // 优先从利润与利润分配表中获取"19 息税前利润（利润总额+利息支出）"运营期列数据
      if (profitDistributionTableData && profitDistributionTableData.rows) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '19');
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          // 使用设置的所得税率计算调整所得税
          return row.运营期[year - 1] * (incomeTaxRate / 100);
        }
      }
      // 如果没有利润与利润分配表数据，使用原有计算逻辑作为后备
      // 计算指定年份的调整所得税
      // 这里应该根据实际税率计算，目前返回0
      return 0;
    } else {
      // 优先从利润与利润分配表中获取"19 息税前利润（利润总额+利息支出）"合计数据
      if (profitDistributionTableData && profitDistributionTableData.rows) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '19');
        if (row && row.合计 !== undefined) {
          // 使用设置的所得税率计算调整所得税合计
          return row.合计 * (incomeTaxRate / 100);
        }
      }
      // 如果没有利润与利润分配表数据，使用原有计算逻辑作为后备
      // 计算所有年份的调整所得税合计
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateAdjustedIncomeTax(year);
      });
      return totalSum;
    }
  };
  
  // 导出项目投资现金流量表为Excel
  const handleExportProfitTaxTable = () => {
    if (!context) {
      notifications.show({
        title: '导出失败',
        message: '项目上下文未加载',
        color: 'red',
      });
      return;
    }

    // 生成标准化的现金流表数据，确保与财务指标计算使用相同的数据源
    const cashFlowTableData = generateCashFlowTableData(
      context,
      calculateConstructionInvestment,
      calculateWorkingCapital,
      calculateOperatingRevenue,
      calculateSubsidyIncome,
      calculateFixedAssetResidual,
      calculateWorkingCapitalRecovery,
      calculateOperatingCost,
      calculateVatAndTaxes,
      calculateMaintenanceInvestment,
      calculateAdjustedIncomeTax,
      calculateOperatingCostWithoutTax,
      preTaxRate,
      postTaxRate
    );

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const years = Array.from({ length: totalYears }, (_, i) => i + 1);

    // 准备Excel数据
    const excelData: any[] = [];
    
    // 添加表头
    const headerRow: any = { '序号': '', '项目': '', '合计': '' };
    years.forEach((year) => {
      headerRow[`${year}`] = year;
    });
    excelData.push(headerRow);

    // 1. 现金流入 - 使用标准化现金流表数据
    const row1: any = { '序号': '1', '项目': '现金流入' };
    let totalRow1 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.totalInflow : 0;
      row1[`${year}`] = yearTotal;
      totalRow1 += yearTotal;
    });
    row1['合计'] = totalRow1;
    excelData.push(row1);

      // 1.1 营业收入 - 使用标准化现金流表数据
    const row1_1: any = { '序号': '1.1', '项目': '营业收入' };
    let totalRow1_1 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.operatingRevenue : 0;
      row1_1[`${year}`] = yearTotal;
      totalRow1_1 += yearTotal;
    });
    row1_1['合计'] = totalRow1_1;
    excelData.push(row1_1);

    // 1.2 补贴收入 - 使用标准化现金流表数据
    const row1_2: any = { '序号': '1.2', '项目': '补贴收入' };
    let totalRow1_2 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.subsidyIncome : 0;
      row1_2[`${year}`] = yearTotal;
      totalRow1_2 += yearTotal;
    });
    row1_2['合计'] = totalRow1_2;
    excelData.push(row1_2);

    // 1.3 回收固定资产余值 - 使用标准化现金流表数据
    const row1_3: any = { '序号': '1.3', '项目': '回收固定资产余值' };
    let totalRow1_3 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.fixedAssetResidual : 0;
      row1_3[`${year}`] = yearTotal;
      totalRow1_3 += yearTotal;
    });
    row1_3['合计'] = totalRow1_3;
    excelData.push(row1_3);

    // 1.4 回收流动资金 - 使用标准化现金流表数据
    const row1_4: any = { '序号': '1.4', '项目': '回收流动资金' };
    let totalRow1_4 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.workingCapitalRecovery : 0;
      row1_4[`${year}`] = yearTotal;
      totalRow1_4 += yearTotal;
    });
    row1_4['合计'] = totalRow1_4;
    excelData.push(row1_4);

    // 2. 现金流出 - 使用标准化现金流表数据
    const row2: any = { '序号': '2', '项目': '现金流出' };
    let totalRow2 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.totalOutflow : 0;
      row2[`${year}`] = yearTotal;
      totalRow2 += yearTotal;
    });
    row2['合计'] = totalRow2;
    excelData.push(row2);

    // 2.1 建设投资 - 使用标准化现金流表数据
    const row2_1: any = { '序号': '2.1', '项目': '建设投资' };
    let totalRow2_1 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.constructionInvestment : 0;
      row2_1[`${year}`] = yearTotal;
      totalRow2_1 += yearTotal;
    });
    row2_1['合计'] = totalRow2_1;
    excelData.push(row2_1);

    // 2.2 流动资金 - 使用标准化现金流表数据
    const row2_2: any = { '序号': '2.2', '项目': '流动资金' };
    let totalRow2_2 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.workingCapital : 0;
      row2_2[`${year}`] = yearTotal;
      totalRow2_2 += yearTotal;
    });
    row2_2['合计'] = totalRow2_2;
    excelData.push(row2_2);

    // 2.3 经营成本 - 使用标准化现金流表数据
    const row2_3: any = { '序号': '2.3', '项目': '经营成本' };
    let totalRow2_3 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.operatingCost : 0;
      row2_3[`${year}`] = yearTotal;
      totalRow2_3 += yearTotal;
    });
    row2_3['合计'] = totalRow2_3;
    excelData.push(row2_3);

    // 2.4 增值税、房产税等及附加 - 使用标准化现金流表数据
    const row2_4: any = { '序号': '2.4', '项目': '增值税、房产税等及附加' };
    let totalRow2_4 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.vatAndTaxes : 0;
      row2_4[`${year}`] = yearTotal;
      totalRow2_4 += yearTotal;
    });
    row2_4['合计'] = totalRow2_4;
    excelData.push(row2_4);

    // 2.5 维持运营投资 - 使用标准化现金流表数据
    const row2_5: any = { '序号': '2.5', '项目': '维持运营投资' };
    let totalRow2_5 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.maintenanceInvestment : 0;
      row2_5[`${year}`] = yearTotal;
      totalRow2_5 += yearTotal;
    });
    row2_5['合计'] = totalRow2_5;
    excelData.push(row2_5);

    // 3. 所得税前净现金流量（1-2） - 使用标准化现金流表数据
    const row3: any = { '序号': '3', '项目': '所得税前净现金流量（1-2）' };
    let totalRow3 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.preTaxCashFlow : 0;
      row3[`${year}`] = yearTotal;
      totalRow3 += yearTotal;
    });
    row3['合计'] = totalRow3;
    excelData.push(row3);

    // 4. 累计所得税前净现金流量 - 使用标准化现金流表数据
    const row4: any = { '序号': '4', '项目': '累计所得税前净现金流量' };
    let totalRow4 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.cumulativePreTaxCashFlow : 0;
      row4[`${year}`] = yearTotal;
      totalRow4 += yearTotal;
    });
    row4['合计'] = totalRow4;
    excelData.push(row4);

    // 5. 调整所得税
    const row5: any = { '序号': '5', '项目': '调整所得税' };
    let totalRow5 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateAdjustedIncomeTax(operationYear);
      }
      
      row5[`${year}`] = yearTotal;
      totalRow5 += yearTotal;
    });
    row5['合计'] = totalRow5;
    excelData.push(row5);

    // 6. 所得税后净现金流量 - 使用标准化现金流表数据
    const row6: any = { '序号': '6', '项目': '所得税后净现金流量' };
    let totalRow6 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.postTaxCashFlow : 0;
      row6[`${year}`] = yearTotal;
      totalRow6 += yearTotal;
    });
    row6['合计'] = totalRow6;
    excelData.push(row6);

    // 7. 累计所得税后净现金流量 - 使用标准化现金流表数据
    const row7: any = { '序号': '7', '项目': '累计所得税后净现金流量' };
    let totalRow7 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.cumulativePostTaxCashFlow : 0;
      row7[`${year}`] = yearTotal;
      totalRow7 += yearTotal;
    });
    row7['合计'] = totalRow7;
    excelData.push(row7);

    // 8. 所得税前净现金流量（动态） - 使用标准化现金流表数据
    const row8: any = { '序号': '1', '项目': '所得税前净现金流量（动态）' };
    let totalRow8 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.preTaxCashFlowDynamic : 0;
      row8[`${year}`] = yearTotal;
      totalRow8 += yearTotal;
    });
    row8['合计'] = totalRow8;
    excelData.push(row8);

    // 9. 累计所得税前净现金流量（动态） - 使用标准化现金流表数据
    const row9: any = { '序号': '2', '项目': '累计所得税前净现金流量（动态）' };
    let totalRow9 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.cumulativePreTaxCashFlowDynamic : 0;
      row9[`${year}`] = yearTotal;
      totalRow9 += yearTotal;
    });
    row9['合计'] = totalRow9;
    excelData.push(row9);

    // 10. 所得税后净现金流量（动态） - 使用标准化现金流表数据
    const row10: any = { '序号': '3', '项目': '所得税后净现金流量（动态）' };
    let totalRow10 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.postTaxCashFlowDynamic : 0;
      row10[`${year}`] = yearTotal;
      totalRow10 += yearTotal;
    });
    row10['合计'] = totalRow10;
    excelData.push(row10);

    // 11. 累计所得税后净现金流量（动态） - 使用标准化现金流表数据
    const row11: any = { '序号': '4', '项目': '累计所得税后净现金流量（动态）' };
    let totalRow11 = 0;
    years.forEach((year) => {
      const yearData = cashFlowTableData.yearlyData[year - 1];
      const yearTotal = yearData ? yearData.cumulativePostTaxCashFlowDynamic : 0;
      row11[`${year}`] = yearTotal;
      totalRow11 += yearTotal;
    });
    row11['合计'] = totalRow11;
    excelData.push(row11);

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '项目投资现金流量表');

    // 导出文件
    XLSX.writeFile(wb, `项目投资现金流量表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '项目投资现金流量表已导出为Excel文件',
      color: 'green',
    });
  };

  // ==================== 利润与利润分配表相关函数 ====================

  // 计算利息支出（从借款还本付息计划表获取）
  const calculateInterestExpense = (year?: number): number => {
    if (!context || !repaymentTableData) return 0;
    
    if (year !== undefined) {
      // 计算指定年份的利息支出
      const yearIndex = year - 1;
      // 从还本付息计划表中查找序号为'2.2'的付息行数据
      const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
      return interestRow?.分年数据[yearIndex] || 0;
    } else {
      // 计算所有年份的利息支出合计
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateInterestExpense(year);
      });
      return totalSum;
    }
  };

  // 计算折旧费（从折旧数据获取）
  const calculateDepreciation = (year?: number): number => {
    if (!context || !depreciationData) return 0;
    
    if (year !== undefined) {
      const yearIndex = year - 1;
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      return (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
    } else {
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateDepreciation(year);
      });
      return totalSum;
    }
  };

  // 计算摊销费（从折旧数据获取）
  const calculateAmortization = (year?: number): number => {
    if (!context || !depreciationData) return 0;
    
    if (year !== undefined) {
      const yearIndex = year - 1;
      const rowE = depreciationData.find(row => row.序号 === 'E');
      return rowE?.分年数据[yearIndex] || 0;
    } else {
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateAmortization(year);
      });
      return totalSum;
    }
  };

  // 计算税金及附加
  const calculateTaxAndSurcharges = (year?: number): number => {
    if (year !== undefined) {
      // 优先从 revenueTableData 中获取"其他税费及附加"（序号3）的运营期列数据
      if (revenueTableData && revenueTableData.rows) {
        const row = revenueTableData.rows.find(r => r.序号 === '3');
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          return row.运营期[year - 1];
        }
      }
      // 如果没有表格数据，使用原有计算逻辑作为后备
      return calculateOtherTaxesAndSurchargesLocal(year);
    } else {
      // 计算所有年份的税金及附加合计
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateTaxAndSurcharges(year);
      });
      return totalSum;
    }
  };

  // 计算总成本费用（直接引用营业成本估算表中的总成本费用合计数据）
  const calculateTotalCost = (year?: number): number => {
    if (!context) return 0;
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    if (year !== undefined) {
      // 优先从 costTableData 中获取"总成本费用合计"（序号7）的运营期列数据
      if (costTableData && costTableData.rows) {
        const row = costTableData.rows.find(r => r.序号 === '7');
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          return row.运营期[year - 1];
        }
      }
      
      // 如果没有表格数据，使用原有计算逻辑作为后备
      // 计算指定年份的总成本费用
      let yearTotal = 0;
      
      // 1. 营业成本对应年份列 (第1.1行至第1.5行对应年份列数据的求和)
      // 1.1 外购原材料费（除税）对应年份列
      const productionRate = costConfig.rawMaterials.applyProductionRate
        ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      
      let rawMaterialsCost = 0;
      (costConfig.rawMaterials.items || []).forEach((item: any) => {
        let baseAmount = 0;
        if (item.sourceType === 'percentage') {
          let revenueBase = 0;
          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
            revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.unitPrice || 0) * (revItem.quantity || 0), 0);
          } else {
            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
            if (revItem) {
              revenueBase = (revItem.unitPrice || 0) * (revItem.quantity || 0);
            }
          }
          baseAmount = revenueBase * (item.percentage || 0) / 100;
        } else if (item.sourceType === 'quantityPrice') {
          baseAmount = (item.quantity || 0) * (item.unitPrice || 0);
        } else if (item.sourceType === 'directAmount') {
          baseAmount = item.directAmount || 0;
        }
        
        // 计算进项税额
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        const inputTax = baseAmount * taxRateDecimal / (1 + taxRateDecimal);
        
        // 外购原材料（除税）= 含税金额 - 进项税额
        rawMaterialsCost += (baseAmount - inputTax) * productionRate;
      });
      
      // 1.2 外购燃料及动力费（除税）
      let fuelPowerCost = 0;
      (costConfig.fuelPower.items || []).forEach((item: any) => {
        let consumption = item.consumption || 0;
        let amount = 0;
        // 对汽油和柴油进行特殊处理：单价×数量/10000
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.price || 0) * consumption / 10000 * productionRate;
        } else {
          amount = consumption * (item.price || 0) * productionRate;
        }
        
        // 计算进项税额
        const taxRate = (item.taxRate || 13) / 100;
        const inputTax = amount * taxRate / (1 + taxRate);
        
        // 外购燃料及动力（除税）= 含税金额 - 进项税额
        fuelPowerCost += amount - inputTax;
      });
      
      // 1.3 工资及福利费
      let wagesCost = 0;
      if (costConfig.wages.items && costConfig.wages.items.length > 0) {
        costConfig.wages.items.forEach((item: any) => {
          let currentSalary = item.salaryPerEmployee || 0;
          
          // 根据调整周期和幅度计算第year年的工资
          if (item.changeInterval && item.changePercentage) {
            const adjustmentTimes = Math.floor((year - 1) / item.changeInterval);
            currentSalary = currentSalary * Math.pow(1 + item.changePercentage / 100, adjustmentTimes);
          }
          
          // 计算工资总额
          const yearlySubtotal = item.employees * currentSalary;
          // 计算福利费
          const yearlyWelfare = yearlySubtotal * (item.welfareRate || 0) / 100;
          // 合计
          wagesCost += yearlySubtotal + yearlyWelfare;
        });
      } else {
        wagesCost = costConfig.wages.directAmount || 0;
      }
      
      // 1.4 修理费
      let repairCost = 0;
      // 这里需要获取固定资产投资，目前使用0
      const fixedAssetsInvestment = 0;
      if (costConfig.repair.type === 'percentage') {
        repairCost = fixedAssetsInvestment * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
      } else {
        repairCost = costConfig.repair.directAmount || 0;
      }
      
      // 1.5 其他费用
      let otherExpensesCost = 0;
      if (costConfig.otherExpenses.type === 'percentage') {
        const revenueBase = revenueItems.reduce((sum, revItem) => {
          return sum + (revItem.unitPrice || 0) * (revItem.quantity || 0);
        }, 0);
        otherExpensesCost = revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
      } else {
        otherExpensesCost = (costConfig.otherExpenses.directAmount || 0) * productionRate;
      }
      
      // 营业成本 = 1.1 + 1.2 + 1.3 + 1.4 + 1.5
      const operatingCost = rawMaterialsCost + fuelPowerCost + wagesCost + repairCost + otherExpensesCost;
      
      // 2. 管理费用（暂时为0）
      const managementCost = 0;
      
      // 3. 利息支出
      const yearIndex = year - 1;
      const interestRow = repaymentTableData.find(row => row.项目 === '本年应计利息');
      const interestCost = interestRow?.分年数据[yearIndex] || 0;
      
      // 4. 折旧费
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      const depreciationCost = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
      
      // 5. 摊销费
      const rowE = depreciationData.find(row => row.序号 === 'E');
      const amortizationCost = rowE?.分年数据[yearIndex] || 0;
      
      // 6. 开发成本（暂时为0）
      const developmentCost = 0;
      
      // 总成本费用 = 营业成本 + 管理费用 + 利息支出 + 折旧费 + 摊销费 + 开发成本
      yearTotal = operatingCost + managementCost + interestCost + depreciationCost + amortizationCost + developmentCost;
      
      return yearTotal;
    } else {
      // 计算所有年份的总成本费用合计
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateTotalCost(year);
      });
      return totalSum;
    }
  };

  // 计算利润总额
  const calculateTotalProfit = (year?: number): number => {
    if (year !== undefined) {
      return calculateOperatingRevenue(year) - calculateTaxAndSurcharges(year) - calculateTotalCost(year) + calculateSubsidyIncome(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateTotalProfit(year);
      });
      return totalSum;
    }
  };

  // 计算弥补以前年度亏损（累计）
  const calculateCumulativeLoss = (year: number): number => {
    if (!context) return 0;
    let cumulativeLoss = 0;
    for (let y = 1; y < year; y++) {
      const profit = calculateTotalProfit(y);
      if (profit < 0) {
        cumulativeLoss += Math.abs(profit);
      } else {
        cumulativeLoss = Math.max(0, cumulativeLoss - profit);
      }
    }
    return cumulativeLoss;
  };

  // 计算应纳税所得额
  const calculateTaxableIncome = (year?: number): number => {
    if (year !== undefined) {
      const profit = calculateTotalProfit(year);
      const cumulativeLoss = calculateCumulativeLoss(year);
      return Math.max(0, profit - cumulativeLoss);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateTaxableIncome(year);
      });
      return totalSum;
    }
  };

  // 计算所得税（使用设置的税率）
  const calculateIncomeTax = (year?: number): number => {
    if (year !== undefined) {
      return calculateTaxableIncome(year) * (incomeTaxRate / 100);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateIncomeTax(year);
      });
      return totalSum;
    }
  };

  // 计算净利润
  const calculateNetProfit = (year?: number): number => {
    if (year !== undefined) {
      return calculateTotalProfit(year) - calculateIncomeTax(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateNetProfit(year);
      });
      return totalSum;
    }
  };

  // 计算期初未分配利润
  const calculateInitialUndistributedProfit = (year: number): number => {
    if (year === 1) return 0;
    let total = 0;
    for (let y = 1; y < year; y++) {
      total += calculateNetProfit(y) * (1 - statutorySurplusRate / 100); // 减去法定盈余公积金
    }
    return total;
  };

  // 计算可供分配利润
  const calculateDistributableProfit = (year?: number): number => {
    if (year !== undefined) {
      return calculateNetProfit(year) + calculateInitialUndistributedProfit(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateDistributableProfit(year);
      });
      return totalSum;
    }
  };

  // 计算提取法定盈余公积金（使用设置的比例）
  const calculateStatutorySurplus = (year?: number): number => {
    if (year !== undefined) {
      return calculateNetProfit(year) * (statutorySurplusRate / 100);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateStatutorySurplus(year);
      });
      return totalSum;
    }
  };

  // 计算可供投资者分配的利润
  const calculateInvestorDistributableProfit = (year?: number): number => {
    if (year !== undefined) {
      return calculateDistributableProfit(year) - calculateStatutorySurplus(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateInvestorDistributableProfit(year);
      });
      return totalSum;
    }
  };

  // 应付优先股股利（暂为0）
  const calculatePreferredStockDividend = (year?: number): number => {
    return 0;
  };

  // 提取任意盈余公积金（暂为0）
  const calculateArbitrarySurplus = (year?: number): number => {
    return 0;
  };

  // 计算应付普通股股利
  const calculateCommonStockDividend = (year?: number): number => {
    if (year !== undefined) {
      return calculateInvestorDistributableProfit(year) - calculatePreferredStockDividend(year) - calculateArbitrarySurplus(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateCommonStockDividend(year);
      });
      return totalSum;
    }
  };

  // 各投资方利润分配（暂为0）
  const calculateInvestorProfitDistribution = (year?: number): number => {
    return 0;
  };

  // 计算未分配利润
  const calculateUndistributedProfit = (year?: number): number => {
    if (year !== undefined) {
      return calculateInvestorDistributableProfit(year) -
             calculatePreferredStockDividend(year) -
             calculateArbitrarySurplus(year) -
             calculateInvestorProfitDistribution(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateUndistributedProfit(year);
      });
      return totalSum;
    }
  };

  // 计算息税前利润
  const calculateEBIT = (year?: number): number => {
    if (year !== undefined) {
      return calculateTotalProfit(year) + calculateInterestExpense(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateEBIT(year);
      });
      return totalSum;
    }
  };

  // 计算息税折旧摊销前利润
  const calculateEBITDA = (year?: number): number => {
    if (year !== undefined) {
      return calculateEBIT(year) + calculateDepreciation(year) + calculateAmortization(year);
    } else {
      if (!context) return 0;
      const years = Array.from({ length: context.operationYears }, (_, i) => i + 1);
      let totalSum = 0;
      years.forEach((year) => {
        totalSum += calculateEBITDA(year);
      });
      return totalSum;
    }
  };

  // 缓存的财务指标计算函数
  const useCachedFinancialIndicators = () => {
    // 创建一个唯一的计算键，基于所有可能影响财务指标的数据
    const calculationKey = JSON.stringify({
      preTaxRate,
      postTaxRate,
      constructionYears: context?.constructionYears,
      operationYears: context?.operationYears,
      revenueTableData,
      costTableData,
      profitDistributionTableData,
      // 可以根据需要添加更多依赖项
    })
    
    // 如果计算键没有变化，返回缓存的结果
    if (lastCalculationKey === calculationKey && cachedFinancialIndicators) {
      return cachedFinancialIndicators;
    }
    
    // 生成标准化的现金流表数据
    const cashFlowTableData = generateCashFlowTableData(
      context,
      calculateConstructionInvestment,
      calculateWorkingCapital,
      calculateOperatingRevenue,
      calculateSubsidyIncome,
      calculateFixedAssetResidual,
      calculateWorkingCapitalRecovery,
      calculateOperatingCost,
      calculateVatAndTaxes,
      calculateMaintenanceInvestment,
      calculateAdjustedIncomeTax,
      calculateOperatingCostWithoutTax,
      preTaxRate,
      postTaxRate
    );
    
    // 基于现金流表数据计算财务指标
    const indicators = calculateFinancialIndicators(cashFlowTableData);
    
    // 缓存结果
    setCachedFinancialIndicators(indicators);
    setLastCalculationKey(calculationKey);
    
    return indicators;
  };

  // 保存利润与利润分配表数据
  const saveProfitDistributionTableData = () => {
    if (!context) return;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 定义表格行数据
    const tableRows = [
      { id: '1', name: '营业收入', calc: (y?: number) => calculateOperatingRevenue(y) },
      { id: '2', name: '税金附加等', calc: (y?: number) => calculateTaxAndSurcharges(y) },
      { id: '3', name: '总成本费用', calc: (y?: number) => calculateTotalCost(y) },
      { id: '4', name: '补贴收入', calc: (y?: number) => calculateSubsidyIncome(y) },
      { id: '5', name: '利润总额（1-2-3+4）', calc: (y?: number) => calculateTotalProfit(y) },
      { id: '6', name: '弥补以前年度亏损', calc: (y?: number) => y !== undefined ? calculateCumulativeLoss(y) : 0 },
      { id: '7', name: '应纳税所得额（5-6）', calc: (y?: number) => calculateTaxableIncome(y) },
      { id: '8', name: `所得税(${incomeTaxRate}%)`, calc: (y?: number) => calculateIncomeTax(y) },
      { id: '9', name: '净利润（5-8）', calc: (y?: number) => calculateNetProfit(y) },
      { id: '10', name: '期初未分配利润', calc: (y?: number) => y !== undefined ? calculateInitialUndistributedProfit(y) : 0 },
      { id: '11', name: '可供分配利润（9+10）', calc: (y?: number) => calculateDistributableProfit(y) },
      { id: '12', name: `提取法定盈余公积金(${statutorySurplusRate}%)`, calc: (y?: number) => calculateStatutorySurplus(y) },
      { id: '13', name: '可供投资者分配的利润（11-12）', calc: (y?: number) => calculateInvestorDistributableProfit(y) },
      { id: '14', name: '应付优先股股利', calc: (y?: number) => calculatePreferredStockDividend(y) },
      { id: '15', name: '提取任意盈余公积金', calc: (y?: number) => calculateArbitrarySurplus(y) },
      { id: '16', name: '应付普通股股利（13-14-15）', calc: (y?: number) => calculateCommonStockDividend(y) },
      { id: '17', name: '各投资方利润分配：', calc: (y?: number) => calculateInvestorProfitDistribution(y) },
      { id: '18', name: '未分配利润（13-14-15-17）', calc: (y?: number) => calculateUndistributedProfit(y) },
      { id: '19', name: '息税前利润（利润总额+利息支出）', calc: (y?: number) => calculateEBIT(y) },
      { id: '20', name: '息税折旧摊销前利润（19+折旧+摊销）', calc: (y?: number) => calculateEBITDA(y) },
    ];
    
    // 构建数据行
    const rows: any[] = [];
    tableRows.forEach((row) => {
      const dataRow: any = {
        序号: row.id,
        项目: row.name,
        合计: row.id === '10' ? 0 : row.calc(undefined),
        运营期: []
      };
      
      // 计算各年数据
      years.forEach((year) => {
        const yearValue = row.calc(year);
        dataRow.运营期.push(yearValue);
      });
      
      rows.push(dataRow);
    });
    
    // 保存到store
    const { setProfitDistributionTableData } = useRevenueCostStore.getState();
    setProfitDistributionTableData({
      rows,
      updatedAt: new Date().toISOString()
    });
  };

  // 导出利润与利润分配表为Excel
  const handleExportProfitDistributionTable = () => {
    if (!context) {
      notifications.show({
        title: '导出失败',
        message: '项目上下文未加载',
        color: 'red',
      });
      return;
    }
    
    // 先保存利润与利润分配表数据
    saveProfitDistributionTableData();

    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);

    // 准备Excel数据
    const excelData: any[] = [];
    
    // 添加表头
    const headerRow: any = { '序号': '', '项目': '', '合计': '' };
    for (let i = 0; i < operationYears; i++) {
      headerRow[`运营期${i + 1}`] = '';
    }
    excelData.push(headerRow);
    
    // 第二行表头
    const headerRow2: any = { '序号': '', '项目': '', '合计': '' };
    years.forEach((year) => {
      headerRow2[`${year}`] = year;
    });
    excelData.push(headerRow2);

    // 定义表格行数据
    const tableRows = [
      { id: '1', name: '营业收入', calc: (y?: number) => calculateOperatingRevenue(y) },
      { id: '2', name: '税金附加等', calc: (y?: number) => calculateTaxAndSurcharges(y) },
      { id: '3', name: '总成本费用', calc: (y?: number) => calculateTotalCost(y) },
      { id: '4', name: '补贴收入', calc: (y?: number) => calculateSubsidyIncome(y) },
      { id: '5', name: '利润总额（1-2-3+4）', calc: (y?: number) => calculateTotalProfit(y) },
      { id: '6', name: '弥补以前年度亏损', calc: (y?: number) => y !== undefined ? calculateCumulativeLoss(y) : 0 },
      { id: '7', name: '应纳税所得额（5-6）', calc: (y?: number) => calculateTaxableIncome(y) },
      { id: '8', name: `所得税(${incomeTaxRate}%)`, calc: (y?: number) => calculateIncomeTax(y) },
      { id: '9', name: '净利润（5-8）', calc: (y?: number) => calculateNetProfit(y) },
      { id: '10', name: '期初未分配利润', calc: (y?: number) => y !== undefined ? calculateInitialUndistributedProfit(y) : 0 },
      { id: '11', name: '可供分配利润（9+10）', calc: (y?: number) => calculateDistributableProfit(y) },
      { id: '12', name: `提取法定盈余公积金(${statutorySurplusRate}%)`, calc: (y?: number) => calculateStatutorySurplus(y) },
      { id: '13', name: '可供投资者分配的利润（11-12）', calc: (y?: number) => calculateInvestorDistributableProfit(y) },
      { id: '14', name: '应付优先股股利', calc: (y?: number) => calculatePreferredStockDividend(y) },
      { id: '15', name: '提取任意盈余公积金', calc: (y?: number) => calculateArbitrarySurplus(y) },
      { id: '16', name: '应付普通股股利（13-14-15）', calc: (y?: number) => calculateCommonStockDividend(y) },
      { id: '17', name: '各投资方利润分配：', calc: (y?: number) => calculateInvestorProfitDistribution(y) },
      { id: '18', name: '未分配利润（13-14-15-17）', calc: (y?: number) => calculateUndistributedProfit(y) },
      { id: '19', name: '息税前利润（利润总额+利息支出）', calc: (y?: number) => calculateEBIT(y) },
      { id: '20', name: '息税折旧摊销前利润（19+折旧+摊销）', calc: (y?: number) => calculateEBITDA(y) },
    ];

    // 添加数据行
    tableRows.forEach((row) => {
      const dataRow: any = { '序号': row.id, '项目': row.name };
      
      // 计算合计
      dataRow['合计'] = row.id === '10' ? '' : row.calc(undefined);
      
      // 计算各年数据
      years.forEach((year) => {
        // 直接显示运营期的计算值
        const yearValue = row.calc(year);
        dataRow[`${year}`] = yearValue;
      });
      
      excelData.push(dataRow);
    });

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '利润与利润分配表');

    // 导出文件
    XLSX.writeFile(wb, `利润与利润分配表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '利润与利润分配表已导出为Excel文件',
      color: 'green',
    });
  };

  // 渲染利润与利润分配表格
  const renderProfitDistributionModal = () => {
    if (!context) return <Text c="red">项目上下文未加载</Text>

    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);

    // 定义表格行数据
    const tableRows = [
      { id: '1', name: '营业收入', calc: (y?: number) => calculateOperatingRevenue(y) },
      { id: '2', name: '税金附加等', calc: (y?: number) => calculateTaxAndSurcharges(y) },
      { id: '3', name: '总成本费用', calc: (y?: number) => calculateTotalCost(y) },
      { id: '4', name: '补贴收入', calc: (y?: number) => calculateSubsidyIncome(y) },
      { id: '5', name: '利润总额（1-2-3+4）', calc: (y?: number) => calculateTotalProfit(y) },
      { id: '6', name: '弥补以前年度亏损', calc: (y?: number) => y !== undefined ? calculateCumulativeLoss(y) : 0 },
      { id: '7', name: '应纳税所得额（5-6）', calc: (y?: number) => calculateTaxableIncome(y) },
      { id: '8', name: `所得税(${incomeTaxRate}%)`, calc: (y?: number) => calculateIncomeTax(y) },
      { id: '9', name: '净利润（5-8）', calc: (y?: number) => calculateNetProfit(y) },
      { id: '10', name: '期初未分配利润', calc: (y?: number) => y !== undefined ? calculateInitialUndistributedProfit(y) : 0 },
      { id: '11', name: '可供分配利润（9+10）', calc: (y?: number) => calculateDistributableProfit(y) },
      { id: '12', name: `提取法定盈余公积金(${statutorySurplusRate}%)`, calc: (y?: number) => calculateStatutorySurplus(y) },
      { id: '13', name: '可供投资者分配的利润（11-12）', calc: (y?: number) => calculateInvestorDistributableProfit(y) },
      { id: '14', name: '应付优先股股利', calc: (y?: number) => calculatePreferredStockDividend(y) },
      { id: '15', name: '提取任意盈余公积金', calc: (y?: number) => calculateArbitrarySurplus(y) },
      { id: '16', name: '应付普通股股利（13-14-15）', calc: (y?: number) => calculateCommonStockDividend(y) },
      { id: '17', name: '各投资方利润分配：', calc: (y?: number) => calculateInvestorProfitDistribution(y) },
      { id: '18', name: '未分配利润（13-14-15-17）', calc: (y?: number) => calculateUndistributedProfit(y) },
      { id: '19', name: '息税前利润（利润总额+利息支出）', calc: (y?: number) => calculateEBIT(y) },
      { id: '20', name: '息税折旧摊销前利润（19+折旧+摊销）', calc: (y?: number) => calculateEBITDA(y) },
    ];

    return (
      <>
        <Table striped withTableBorder style={{ fontSize: '11px', tableLayout: 'auto' }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: '40px' }}>序号</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>项目</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: '60px' }}>合计</Table.Th>
              <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
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
            {tableRows.map((row, idx) => (
              <Table.Tr key={row.id}>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{row.id}</Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>{row.name}</Table.Td>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {row.id === '10' ? '' : formatNumberNoRounding(row.calc(undefined))}
                </Table.Td>
                {years.map((year) => {
                  // 直接显示运营期的计算值
                  const yearValue = row.calc(year);
                  return (
                    <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {formatNumberWithZeroBlank(yearValue)}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </>
    );
  };

  // 计算项目投资现金流量表数据 - 遵循规则：计算逻辑前置化
  const cashFlowTableData = useMemo(() => {
    if (!context) return null;

    // 生成标准化的现金流表数据，确保与JSON数据和财务指标计算使用相同的数据源
    const cashFlowData = generateCashFlowTableData(
      context,
      calculateConstructionInvestment,
      calculateWorkingCapital,
      calculateOperatingRevenue,
      calculateSubsidyIncome,
      calculateFixedAssetResidual,
      calculateWorkingCapitalRecovery,
      calculateOperatingCost,
      calculateVatAndTaxes,
      calculateMaintenanceInvestment,
      calculateAdjustedIncomeTax,
      calculateOperatingCostWithoutTax,
      preTaxRate,
      postTaxRate
    );

    const constructionYears = context.constructionYears ?? 0;
    const operationYears = context.operationYears ?? 0;
    const totalYears = constructionYears + operationYears;
    const years = Array.from({ length: totalYears }, (_, i) => i + 1);

    // 预计算表格数据，避免在JSX中进行计算
    const tableRows = [
      {
        id: '1',
        name: '现金流入',
        key: 'totalInflow',
        isHeader: true
      },
      {
        id: '1.1',
        name: '营业收入',
        key: 'operatingRevenue',
        isSubItem: true
      },
      {
        id: '1.2',
        name: '补贴收入',
        key: 'subsidyIncome',
        isSubItem: true
      },
      {
        id: '1.3',
        name: '回收固定资产余值',
        key: 'fixedAssetResidual',
        isSubItem: true
      },
      {
        id: '1.4',
        name: '回收流动资金',
        key: 'workingCapitalRecovery',
        isSubItem: true
      },
      {
        id: '2',
        name: '现金流出',
        key: 'totalOutflow',
        isHeader: true
      },
      {
        id: '2.1',
        name: '建设投资',
        key: 'constructionInvestment',
        isSubItem: true
      },
      {
        id: '2.2',
        name: '流动资金',
        key: 'workingCapital',
        isSubItem: true
      },
      {
        id: '2.3',
        name: '经营成本',
        key: 'operatingCost',
        isSubItem: true
      },
      {
        id: '2.4',
        name: '增值税、房产税等及附加',
        key: 'vatAndTaxes',
        isSubItem: true
      },
      {
        id: '2.5',
        name: '维持运营投资',
        key: 'maintenanceInvestment',
        isSubItem: true
      },
      {
        id: '3',
        name: '所得税前净现金流量（1-2）',
        key: 'preTaxCashFlow',
        isHeader: true
      },
      {
        id: '4',
        name: '累计所得税前净现金流量',
        key: 'cumulativePreTaxCashFlow',
        isHeader: true
      },
      {
        id: '5',
        name: '调整所得税',
        key: 'adjustedIncomeTax',
        isHeader: true
      },
      {
        id: '6',
        name: '所得税后净现金流量',
        key: 'postTaxCashFlow',
        isHeader: true
      },
      {
        id: '7',
        name: '累计所得税后净现金流量',
        key: 'cumulativePostTaxCashFlow',
        isHeader: true
      }
    ];

    // 为每行计算合计值
    const rowsWithTotals = tableRows.map(row => {
      let total = 0;
      
      if (row.id === '1') {
        // 现金流入合计
        total = cashFlowData.totals.totalInflow ?? 0;
      } else if (row.id === '1.1') {
        // 营业收入合计
        let totalSum = 0;
        years.forEach((year) => {
          if (year > constructionYears) {
            const operationYear = year - constructionYears;
            totalSum += calculateOperatingRevenue(operationYear);
          }
        });
        total = totalSum;
      } else if (row.id === '1.2') {
        // 补贴收入合计
        let totalSum = 0;
        years.forEach((year) => {
          if (year > constructionYears) {
            const operationYear = year - constructionYears;
            totalSum += calculateSubsidyIncome(operationYear);
          }
        });
        total = totalSum;
      } else if (row.id === '1.3') {
        // 回收固定资产余值合计
        let totalSum = 0;
        years.forEach((year) => {
          if (year > constructionYears) {
            const operationYear = year - constructionYears;
            totalSum += calculateFixedAssetResidual(operationYear);
          }
        });
        total = totalSum;
      } else if (row.id === '1.4') {
        // 回收流动资金合计
        let totalSum = 0;
        years.forEach((year) => {
          if (year > constructionYears) {
            const operationYear = year - constructionYears;
            totalSum += calculateWorkingCapitalRecovery(operationYear);
          }
        });
        total = totalSum;
      } else if (row.id === '2') {
        // 现金流出合计
        let totalSum = 0;
        years.forEach((year) => {
          if (year <= constructionYears) {
            totalSum += calculateConstructionInvestment(year) + calculateWorkingCapital(year);
          } else {
            const operationYear = year - constructionYears;
            totalSum += calculateConstructionInvestment(year) + 
                       calculateWorkingCapital(year) + 
                       calculateOperatingCost(operationYear) + 
                       calculateVatAndTaxes(operationYear) + 
                       calculateMaintenanceInvestment(operationYear);
          }
        });
        total = totalSum;
      } else if (row.id === '2.1') {
        total = calculateConstructionInvestment(undefined) ?? 0;
      } else if (row.id === '2.2') {
        total = calculateWorkingCapital(undefined) ?? 0;
      } else if (row.id === '2.3') {
        total = calculateOperatingCost(undefined) ?? 0;
      } else if (row.id === '2.4') {
        total = calculateVatAndTaxes(undefined) ?? 0;
      } else if (row.id === '2.5') {
        total = calculateMaintenanceInvestment(undefined) ?? 0;
      } else if (row.id === '3') {
        // 所得税前净现金流量合计
        let totalInflow = 0;
        let totalOutflow = 0;
        
        years.forEach((year) => {
          if (year <= constructionYears) {
            totalOutflow += calculateConstructionInvestment(year) + calculateWorkingCapital(year);
          } else {
            const operationYear = year - constructionYears;
            totalInflow += calculateOperatingRevenue(operationYear) + 
                          calculateSubsidyIncome(operationYear) + 
                          calculateFixedAssetResidual(operationYear) + 
                          calculateWorkingCapitalRecovery(operationYear);
            totalOutflow += calculateConstructionInvestment(year) + 
                          calculateWorkingCapital(year) + 
                          calculateOperatingCost(operationYear) + 
                          calculateVatAndTaxes(operationYear) + 
                          calculateMaintenanceInvestment(operationYear);
          }
        });
        
        total = totalInflow - totalOutflow;
      } else if (row.id === '4') {
        // 累计所得税前净现金流量合计
        let allColumnsTotal = 0;
        let cumulativeForTotal = 0;
        
        years.forEach((year) => {
          let yearTotal = 0;
          
          if (year <= constructionYears) {
            const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
            yearTotal = -yearOutflow;
          } else {
            const operationYear = year - constructionYears;
            const yearInflow = calculateOperatingRevenue(operationYear) + 
                              calculateSubsidyIncome(operationYear) +
                              calculateFixedAssetResidual(operationYear) +
                              calculateWorkingCapitalRecovery(operationYear);
            const yearOutflow = calculateConstructionInvestment(year) +
                              calculateWorkingCapital(year) +
                              calculateOperatingCost(operationYear) +
                              calculateVatAndTaxes(operationYear) +
                              calculateMaintenanceInvestment(operationYear);
            yearTotal = yearInflow - yearOutflow;
          }
          
          cumulativeForTotal += yearTotal;
          allColumnsTotal += cumulativeForTotal;
        });
        
        total = allColumnsTotal;
      } else if (row.id === '5') {
        total = calculateAdjustedIncomeTax(undefined) ?? 0;
      } else if (row.id === '6') {
        // 所得税后净现金流量合计
        let totalInflow = 0;
        let totalOutflow = 0;
        let totalTax = 0;
        
        years.forEach((year) => {
          if (year <= constructionYears) {
            totalOutflow += calculateConstructionInvestment(year) + calculateWorkingCapital(year);
          } else {
            const operationYear = year - constructionYears;
            totalInflow += calculateOperatingRevenue(operationYear) + 
                          calculateSubsidyIncome(operationYear) + 
                          calculateFixedAssetResidual(operationYear) + 
                          calculateWorkingCapitalRecovery(operationYear);
            totalOutflow += calculateConstructionInvestment(year) + 
                          calculateWorkingCapital(year) + 
                          calculateOperatingCost(operationYear) + 
                          calculateVatAndTaxes(operationYear) + 
                          calculateMaintenanceInvestment(operationYear);
            totalTax += calculateAdjustedIncomeTax(operationYear);
          }
        });
        
        total = totalInflow - totalOutflow - totalTax;
      } else if (row.id === '7') {
        // 累计所得税后净现金流量合计
        let allColumnsTotal = 0;
        let cumulativeForTotal = 0;
        
        years.forEach((year) => {
          let yearPostTaxCashFlow = 0;
          
          if (year <= constructionYears) {
            const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
            yearPostTaxCashFlow = -yearOutflow;
          } else {
            const operationYear = year - constructionYears;
            const yearInflow = calculateOperatingRevenue(operationYear) + 
                              calculateSubsidyIncome(operationYear) +
                              calculateFixedAssetResidual(operationYear) +
                              calculateWorkingCapitalRecovery(operationYear);
            const yearOutflow = calculateConstructionInvestment(year) +
                              calculateWorkingCapital(year) +
                              calculateOperatingCost(operationYear) +
                              calculateVatAndTaxes(operationYear) +
                              calculateMaintenanceInvestment(operationYear);
            const yearTax = calculateAdjustedIncomeTax(operationYear);
            yearPostTaxCashFlow = yearInflow - yearOutflow - yearTax;
          }
          
          cumulativeForTotal += yearPostTaxCashFlow;
          allColumnsTotal += cumulativeForTotal;
        });
        
        total = allColumnsTotal;
      }

      return {
        ...row,
        total,
        yearlyData: years.map((year) => {
          const yearData = cashFlowData.yearlyData[year - 1];
          let value = 0;

          if (row.key === 'totalInflow') {
            value = yearData?.totalInflow ?? 0;
          } else if (row.key === 'operatingRevenue') {
            value = yearData?.operatingRevenue ?? 0;
          } else if (row.key === 'subsidyIncome') {
            value = yearData?.subsidyIncome ?? 0;
          } else if (row.key === 'fixedAssetResidual') {
            value = yearData?.fixedAssetResidual ?? 0;
          } else if (row.key === 'workingCapitalRecovery') {
            value = yearData?.workingCapitalRecovery ?? 0;
          } else if (row.key === 'totalOutflow') {
            let yearOutflow = 0;
            if (year <= constructionYears) {
              yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
            } else {
              const operationYear = year - constructionYears;
              yearOutflow = calculateConstructionInvestment(year) +
                           calculateWorkingCapital(year) +
                           calculateOperatingCost(operationYear) +
                           calculateVatAndTaxes(operationYear) +
                           calculateMaintenanceInvestment(operationYear);
            }
            value = yearOutflow;
          } else if (row.key === 'constructionInvestment') {
            value = calculateConstructionInvestment(year) ?? 0;
          } else if (row.key === 'workingCapital') {
            value = calculateWorkingCapital(year) ?? 0;
          } else if (row.key === 'operatingCost') {
            value = year > constructionYears ? calculateOperatingCost(year - constructionYears) ?? 0 : 0;
          } else if (row.key === 'vatAndTaxes') {
            value = year > constructionYears ? calculateVatAndTaxes(year - constructionYears) ?? 0 : 0;
          } else if (row.key === 'maintenanceInvestment') {
            value = year > constructionYears ? calculateMaintenanceInvestment(year - constructionYears) ?? 0 : 0;
          } else if (row.key === 'preTaxCashFlow') {
            value = yearData?.preTaxCashFlow ?? 0;
          } else if (row.key === 'cumulativePreTaxCashFlow') {
            value = yearData?.cumulativePreTaxCashFlow ?? 0;
          } else if (row.key === 'adjustedIncomeTax') {
            value = year > constructionYears ? calculateAdjustedIncomeTax(year - constructionYears) ?? 0 : 0;
          } else if (row.key === 'postTaxCashFlow') {
            value = yearData?.postTaxCashFlow ?? 0;
          } else if (row.key === 'cumulativePostTaxCashFlow') {
            value = yearData?.cumulativePostTaxCashFlow ?? 0;
          }

          return value;
        })
      };
    });

    return {
      cashFlowData,
      years,
      constructionYears,
      operationYears,
      totalYears,
      tableRows: rowsWithTotals
    };
  }, [
    context,
    calculateConstructionInvestment,
    calculateWorkingCapital,
    calculateOperatingRevenue,
    calculateSubsidyIncome,
    calculateFixedAssetResidual,
    calculateWorkingCapitalRecovery,
    calculateOperatingCost,
    calculateVatAndTaxes,
    calculateMaintenanceInvestment,
    calculateAdjustedIncomeTax,
    calculateOperatingCostWithoutTax,
    preTaxRate,
    postTaxRate
  ]);

  // 渲染项目投资现金流量表格 - 遵循规则：计算逻辑前置化
  const renderProfitTaxModal = () => {
    if (!context || !cashFlowTableData) return <Text c="red">项目上下文未加载</Text>

    const { years, constructionYears, operationYears, totalYears, tableRows, cashFlowData } = cashFlowTableData;

    return (
      <>
        <Table striped withTableBorder style={{ fontSize: '11px' }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: '40px' }}>序号</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: '220px' }}>项目</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
              <Table.Th colSpan={constructionYears} style={{ textAlign: 'center', border: '1px solid #dee2e6', width: `${constructionYears * 80}px` }}>建设期</Table.Th>
              <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6', width: `${operationYears * 80}px` }}>运营期</Table.Th>
            </Table.Tr>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              {years.map((year) => (
                <Table.Th key={`year-${year}`} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {year}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* 1. 现金流入 - 修复：使用标准化现金流表数据 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>现金流入</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(cashFlowData.totals.totalInflow)}
              </Table.Td>
              {years.map((year) => {
                const yearData = cashFlowData.yearlyData[year - 1];
                const yearTotal = yearData ? yearData.totalInflow : 0;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.1 营业收入 - 修复：使用标准化现金流表数据 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>营业收入</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 营业收入合计 = 各年营业收入的总和（只计算运营期）
                  let totalSum = 0;
                  years.forEach((year) => {
                    if (year > constructionYears) {
                      const operationYear = year - constructionYears;
                      totalSum += calculateOperatingRevenue(operationYear);
                    }
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                const yearData = cashFlowData.yearlyData[year - 1];
                const yearTotal = yearData ? yearData.operatingRevenue : 0;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.2 补贴收入 - 修复：使用标准化现金流表数据 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.2</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>补贴收入</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 补贴收入合计 = 各年补贴收入的总和（只计算运营期）
                  let totalSum = 0;
                  years.forEach((year) => {
                    if (year > constructionYears) {
                      const operationYear = year - constructionYears;
                      totalSum += calculateSubsidyIncome(operationYear);
                    }
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                const yearData = cashFlowData.yearlyData[year - 1];
                const yearTotal = yearData ? yearData.subsidyIncome : 0;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.3 回收固定资产余值 - 修复：使用标准化现金流表数据 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.3</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>回收固定资产余值</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 回收固定资产余值合计 = 各年回收固定资产余值的总和（只计算运营期）
                  let totalSum = 0;
                  years.forEach((year) => {
                    if (year > constructionYears) {
                      const operationYear = year - constructionYears;
                      totalSum += calculateFixedAssetResidual(operationYear);
                    }
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                const yearData = cashFlowData.yearlyData[year - 1];
                const yearTotal = yearData ? yearData.fixedAssetResidual : 0;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.4 回收流动资金 - 修复：使用标准化现金流表数据 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.4</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>回收流动资金</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 回收流动资金合计 = 各年回收流动资金的总和（只计算运营期）
                  let totalSum = 0;
                  years.forEach((year) => {
                    if (year > constructionYears) {
                      const operationYear = year - constructionYears;
                      totalSum += calculateWorkingCapitalRecovery(operationYear);
                    }
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                const yearData = cashFlowData.yearlyData[year - 1];
                const yearTotal = yearData ? yearData.workingCapitalRecovery : 0;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2. 现金流出 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>现金流出</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 现金流出合计 = 建设期和运营期各年数值的总和
                  let totalSum = 0;
                  years.forEach((year) => {
                    if (year <= constructionYears) {
                      // 建设期
                      totalSum += calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      totalSum += calculateConstructionInvestment(year) + 
                                 calculateWorkingCapital(year) + 
                                 calculateOperatingCost(operationYear) + 
                                 calculateVatAndTaxes(operationYear) + 
                                 calculateMaintenanceInvestment(operationYear);
                    }
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year <= constructionYears) {
                  // 建设期
                  yearTotal = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                } else {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateConstructionInvestment(year) + 
                             calculateWorkingCapital(year) + 
                             calculateOperatingCost(operationYear) + 
                             calculateVatAndTaxes(operationYear) + 
                             calculateMaintenanceInvestment(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2.1 建设投资 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2.1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>建设投资</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateConstructionInvestment(undefined))}
              </Table.Td>
              {years.map((year) => {
                const yearTotal = calculateConstructionInvestment(year);
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2.2 流动资金 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2.2</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>流动资金</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateWorkingCapital(undefined))}
              </Table.Td>
              {years.map((year) => {
                const yearTotal = calculateWorkingCapital(year);
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2.3 经营成本 - 使用总成本费用估算表中的"1 营业成本"数据 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2.3</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>经营成本</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateOperatingCost(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateOperatingCost(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2.4 增值税、房产税等及附加 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2.4</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>增值税、房产税等及附加</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateVatAndTaxes(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateVatAndTaxes(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2.5 维持运营投资 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2.5</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>维持运营投资</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateMaintenanceInvestment(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateMaintenanceInvestment(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 3. 所得税前净现金流量（1-2） */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>所得税前净现金流量（1-2）</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 所得税前净现金流量合计 = 现金流入合计 - 现金流出合计
                  let totalInflow = 0;
                  let totalOutflow = 0;
                  
                  years.forEach((year) => {
                    if (year <= constructionYears) {
                      // 建设期
                      totalOutflow += calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      totalInflow += calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                    calculateSubsidyIncome(operationYear) + 
                                    calculateFixedAssetResidual(operationYear) + 
                                    calculateWorkingCapitalRecovery(operationYear);
                      totalOutflow += calculateConstructionInvestment(year) + 
                                    calculateWorkingCapital(year) + 
                                    calculateOperatingCost(operationYear) + 
                                    calculateVatAndTaxes(operationYear) + 
                                    calculateMaintenanceInvestment(operationYear);
                    }
                  });
                  
                  return formatNumberNoRounding(totalInflow - totalOutflow);
                })()}
              </Table.Td>
              {years.map((year) => {
                let yearInflow = 0;
                let yearOutflow = 0;
                
                if (year <= constructionYears) {
                  // 建设期：直接计算现金流入和流出的差值
                  yearInflow = 0; // 建设期没有现金流入
                  yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                } else {
                    // 运营期：直接计算现金流入和流出的差值
                    const operationYear = year - constructionYears;
                    yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                calculateSubsidyIncome(operationYear) +
                                calculateFixedAssetResidual(operationYear) +
                                calculateWorkingCapitalRecovery(operationYear);
                    yearOutflow = calculateConstructionInvestment(year) +
                                calculateWorkingCapital(year) +
                                calculateOperatingCost(operationYear) +
                                calculateVatAndTaxes(operationYear) +
                                calculateMaintenanceInvestment(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearInflow - yearOutflow)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 4. 累计所得税前净现金流量 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>累计所得税前净现金流量</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 修正：与 Excel 导出逻辑保持一致，计算各年累计值的总和
                  let allColumnsTotal = 0;
                  let cumulativeForTotal = 0;
                  
                  years.forEach((year) => {
                    let yearTotal = 0;
                    
                    if (year <= constructionYears) {
                      // 建设期
                      const yearInflow = 0; // 建设期没有现金流入
                      const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                      yearTotal = yearInflow - yearOutflow;
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                        calculateSubsidyIncome(operationYear) +
                                        calculateFixedAssetResidual(operationYear) +
                                        calculateWorkingCapitalRecovery(operationYear);
                      const yearOutflow = calculateConstructionInvestment(year) +
                                        calculateWorkingCapital(year) +
                                        calculateOperatingCost(operationYear) +
                                        calculateVatAndTaxes(operationYear) +
                                        calculateMaintenanceInvestment(operationYear);
                      yearTotal = yearInflow - yearOutflow;
                    }
                    
                    // 累计值 = 前一年累计值 + 当年数值
                    cumulativeForTotal += yearTotal;
                    // 合计列应该等于各列累计值的总和
                    allColumnsTotal += cumulativeForTotal;
                  });
                  
                  return formatNumberNoRounding(allColumnsTotal);
                })()}
              </Table.Td>
              {(() => {
                let cumulativeCashFlow = 0;
                
                return years.map((year) => {
                  let yearInflow = 0;
                  let yearOutflow = 0;
                  
                  if (year <= constructionYears) {
                    // 建设期
                    yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                  } else {
                    // 运营期
                    const operationYear = year - constructionYears;
                      yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入，与动态计算一致
                                calculateSubsidyIncome(operationYear) +
                                calculateFixedAssetResidual(operationYear) +
                                calculateWorkingCapitalRecovery(operationYear);
                    yearOutflow = calculateConstructionInvestment(year) +
                                calculateWorkingCapital(year) +
                                calculateOperatingCost(operationYear) +
                                calculateVatAndTaxes(operationYear) +
                                calculateMaintenanceInvestment(operationYear);
                  }
                  
                  cumulativeCashFlow += yearInflow - yearOutflow;
                  
                  return (
                    <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {formatNumberWithZeroBlank(cumulativeCashFlow)}
                    </Table.Td>
                  );
                });
              })()}
            </Table.Tr>
            
            {/* 5. 调整所得税 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>调整所得税</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateAdjustedIncomeTax(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateAdjustedIncomeTax(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 6. 所得税后净现金流量 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>6</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>所得税后净现金流量</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 所得税后净现金流量合计 = 现金流入合计 - 现金流出合计 - 调整所得税合计
                  let totalInflow = 0;
                  let totalOutflow = 0;
                  let totalTax = 0;
                  
                  years.forEach((year) => {
                    if (year <= constructionYears) {
                      // 建设期
                      totalOutflow += calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      totalInflow += calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                    calculateSubsidyIncome(operationYear) + 
                                    calculateFixedAssetResidual(operationYear) + 
                                    calculateWorkingCapitalRecovery(operationYear);
                      totalOutflow += calculateConstructionInvestment(year) + 
                                    calculateWorkingCapital(year) + 
                                    calculateOperatingCost(operationYear) + 
                                    calculateVatAndTaxes(operationYear) + 
                                    calculateMaintenanceInvestment(operationYear);
                      totalTax += calculateAdjustedIncomeTax(operationYear);
                    }
                  });
                  
                  return formatNumberNoRounding(totalInflow - totalOutflow - totalTax);
                })()}
              </Table.Td>
              {years.map((year) => {
                let yearInflow = 0;
                let yearOutflow = 0;
                let yearTax = 0;
                
                if (year <= constructionYears) {
                  // 建设期
                  yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                } else {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                              calculateSubsidyIncome(operationYear) + 
                              calculateFixedAssetResidual(operationYear) + 
                              calculateWorkingCapitalRecovery(operationYear);
                  yearOutflow = calculateConstructionInvestment(year) + 
                              calculateWorkingCapital(year) + 
                              calculateOperatingCost(operationYear) + 
                              calculateVatAndTaxes(operationYear) + 
                              calculateMaintenanceInvestment(operationYear);
                  yearTax = calculateAdjustedIncomeTax(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearInflow - yearOutflow - yearTax)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 7. 累计所得税后净现金流量 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>7</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>累计所得税后净现金流量</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 修正：与 Excel 导出逻辑保持一致，计算各年累计值的总和
                  let allColumnsTotal = 0;
                  let cumulativeForTotal = 0;
                  
                  years.forEach((year) => {
                    let yearPostTaxCashFlow = 0;
                    
                    if (year <= constructionYears) {
                      // 建设期
                      const yearInflow = 0; // 建设期没有现金流入
                      const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                      yearPostTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                        calculateSubsidyIncome(operationYear) +
                                        calculateFixedAssetResidual(operationYear) +
                                        calculateWorkingCapitalRecovery(operationYear);
                      const yearOutflow = calculateConstructionInvestment(year) +
                                        calculateWorkingCapital(year) +
                                        calculateOperatingCost(operationYear) +
                                        calculateVatAndTaxes(operationYear) +
                                        calculateMaintenanceInvestment(operationYear);
                      const yearTax = calculateAdjustedIncomeTax(operationYear);
                      yearPostTaxCashFlow = yearInflow - yearOutflow - yearTax;
                    }
                    
                    // 累计值 = 前一年累计值 + 当年数值
                    cumulativeForTotal += yearPostTaxCashFlow;
                    // 合计列应该等于各列累计值的总和
                    allColumnsTotal += cumulativeForTotal;
                  });
                  
                  return formatNumberNoRounding(allColumnsTotal);
                })()}
              </Table.Td>
              {(() => {
                let cumulativeCashFlow = 0;
                
                return years.map((year) => {
                  let yearInflow = 0;
                  let yearOutflow = 0;
                  let yearTax = 0;
                  
                  if (year <= constructionYears) {
                    // 建设期
                    yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                  } else {
                    // 运营期
                    const operationYear = year - constructionYears;
                    yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入，与动态计算一致
                                calculateSubsidyIncome(operationYear) +
                                calculateFixedAssetResidual(operationYear) +
                                calculateWorkingCapitalRecovery(operationYear);
                    yearOutflow = calculateConstructionInvestment(year) +
                                calculateWorkingCapital(year) +
                                calculateOperatingCost(operationYear) +
                                calculateVatAndTaxes(operationYear) +
                                calculateMaintenanceInvestment(operationYear);
                    yearTax = calculateAdjustedIncomeTax(operationYear);
                  }
                  
                  cumulativeCashFlow += yearInflow - yearOutflow - yearTax;
                  
                  return (
                    <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {formatNumberWithZeroBlank(cumulativeCashFlow)}
                    </Table.Td>
                  );
                });
              })()}
            </Table.Tr>
            
            {/* 新增的空行，边框颜色透明 */}
            <Table.Tr>
              <Table.Td style={{ border: 'transparent', height: '20px' }} colSpan={3 + totalYears}></Table.Td>
            </Table.Tr>
            
            {/* 新增的4行动态计算的净现金流量数据 */}
            {/* 1. 所得税前净现金流量（动态） */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>所得税前净现金流量（动态）</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 所得税前净现金流量（动态）合计 = Σ(各年所得税前净现金流量/(1+A)^B)
                  let totalDynamicPreTaxCashFlow = 0;
                  const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
                  
                  years.forEach((year) => {
                    let yearPreTaxCashFlow = 0;
                    
                    if (year <= constructionYears) {
                      // 建设期
                      const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                      yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                        calculateSubsidyIncome(operationYear) +
                                        calculateFixedAssetResidual(operationYear) +
                                        calculateWorkingCapitalRecovery(operationYear);
                      const yearOutflow = calculateConstructionInvestment(year) +
                                        calculateWorkingCapital(year) +
                                        calculateOperatingCost(operationYear) +
                                        calculateVatAndTaxes(operationYear) +
                                        calculateMaintenanceInvestment(operationYear);
                      yearPreTaxCashFlow = yearInflow - yearOutflow;
                    }
                    
                    // 应用动态计算公式：所得税前净现金流量/(1+A)^B
                    // B从建设期第1年开始计算，所以直接使用year
                    const discountFactor = Math.pow(1 + preTaxRateDecimal, year);
                    totalDynamicPreTaxCashFlow += yearPreTaxCashFlow / discountFactor;
                  });
                  
                  return formatNumberNoRounding(totalDynamicPreTaxCashFlow);
                })()}
              </Table.Td>
              {years.map((year) => {
                let yearPreTaxCashFlow = 0;
                
                if (year <= constructionYears) {
                  // 建设期
                  const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                  yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                } else {
                  // 运营期
                  const operationYear = year - constructionYears;
                  const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                    calculateSubsidyIncome(operationYear) +
                                    calculateFixedAssetResidual(operationYear) +
                                    calculateWorkingCapitalRecovery(operationYear);
                  const yearOutflow = calculateConstructionInvestment(year) +
                                    calculateWorkingCapital(year) +
                                    calculateOperatingCost(operationYear) +
                                    calculateVatAndTaxes(operationYear) +
                                    calculateMaintenanceInvestment(operationYear);
                  yearPreTaxCashFlow = yearInflow - yearOutflow;
                }
                
                // 应用动态计算公式：所得税前净现金流量/(1+A)^B
                // B从建设期第1年开始计算，所以直接使用year
                const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
                const discountFactor = Math.pow(1 + preTaxRateDecimal, year);
                const dynamicValue = yearPreTaxCashFlow / discountFactor;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(dynamicValue)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 2. 累计所得税前净现金流量（动态） */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>累计所得税前净现金流量（动态）</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 合计列等于表格中所有建设期列及运营期列的合计值
                  let allColumnsTotal = 0;
                  let cumulativeForTotal = 0;
                  const preTaxRateDecimal = preTaxRate / 100;
                  
                  years.forEach((year) => {
                    let yearPreTaxCashFlow = 0;
                    
                    if (year <= constructionYears) {
                      // 建设期
                      const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                      yearPreTaxCashFlow = -yearOutflow;
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                        calculateSubsidyIncome(operationYear) +
                                        calculateFixedAssetResidual(operationYear) +
                                        calculateWorkingCapitalRecovery(operationYear);
                      const yearOutflow = calculateConstructionInvestment(year) +
                                        calculateWorkingCapital(year) +
                                        calculateOperatingCost(operationYear) +
                                        calculateVatAndTaxes(operationYear) +
                                        calculateMaintenanceInvestment(operationYear);
                      yearPreTaxCashFlow = yearInflow - yearOutflow;
                    }
                    
                    // 计算动态值
                    const discountFactor = Math.pow(1 + preTaxRateDecimal, year);
                    const dynamicValue = yearPreTaxCashFlow / discountFactor;
                    
                    // 累计值 = 前一年累计值 + 当年动态值
                    cumulativeForTotal += dynamicValue;
                    allColumnsTotal += cumulativeForTotal;
                  });
                  
                  return formatNumberNoRounding(allColumnsTotal);
                })()}
              </Table.Td>
              {(() => {
                let cumulativeDynamicCashFlow = 0;
                const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
                
                return years.map((year) => {
                  let yearPreTaxCashFlow = 0;
                  
                  if (year <= constructionYears) {
                    // 建设期
                    const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                    yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                  } else {
                    // 运营期
                    const operationYear = year - constructionYears;
                    const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                      calculateSubsidyIncome(operationYear) +
                                      calculateFixedAssetResidual(operationYear) +
                                      calculateWorkingCapitalRecovery(operationYear);
                    const yearOutflow = calculateConstructionInvestment(year) +
                                      calculateWorkingCapital(year) +
                                      calculateOperatingCost(operationYear) +
                                      calculateVatAndTaxes(operationYear) +
                                      calculateMaintenanceInvestment(operationYear);
                    yearPreTaxCashFlow = yearInflow - yearOutflow;
                  }
                  
                  // 应用动态计算公式：所得税前净现金流量/(1+A)^B
                  // B从建设期第1年开始计算，所以直接使用year
                  const discountFactor = Math.pow(1 + preTaxRateDecimal, year);
                  const dynamicValue = yearPreTaxCashFlow / discountFactor;
                  cumulativeDynamicCashFlow += dynamicValue;
                  
                  return (
                    <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {formatNumberWithZeroBlank(cumulativeDynamicCashFlow)}
                    </Table.Td>
                  );
                });
              })()}
            </Table.Tr>
            
            {/* 3. 所得税后净现金流量（动态） */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>所得税后净现金流量（动态）</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 所得税后净现金流量（动态）合计 = Σ(C-D/(1+E)^B)
                  let totalDynamicPostTaxCashFlow = 0;
                  const postTaxRateDecimal = postTaxRate / 100; // 转换为小数
                  
                  years.forEach((year) => {
                    let yearPreTaxCashFlow = 0; // C：所得税前净现金流量
                    let yearAdjustedTax = 0; // D：调整所得税
                    
                    if (year <= constructionYears) {
                      // 建设期
                      const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                      yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                      yearAdjustedTax = 0; // 建设期没有调整所得税
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                        calculateSubsidyIncome(operationYear) +
                                        calculateFixedAssetResidual(operationYear) +
                                        calculateWorkingCapitalRecovery(operationYear);
                      const yearOutflow = calculateConstructionInvestment(year) +
                                        calculateWorkingCapital(year) +
                                        calculateOperatingCost(operationYear) +
                                        calculateVatAndTaxes(operationYear) +
                                        calculateMaintenanceInvestment(operationYear);
                      yearPreTaxCashFlow = yearInflow - yearOutflow;
                      yearAdjustedTax = calculateAdjustedIncomeTax(operationYear);
                    }
                    
                    // 应用动态计算公式：C-D/(1+E)^B
                    // C为所得税前净现金流量（动态），D为调整所得税
                    // B从建设期第1年开始计算，所以直接使用year
                    
                    // 先计算所得税前净现金流量（动态）
                    const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
                    const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
                    const dynamicPreTaxCashFlow = yearPreTaxCashFlow / preTaxDiscountFactor;
                    
                    // 再计算所得税后净现金流量（动态）= C-D/(1+E)^B
                    const discountFactor = Math.pow(1 + postTaxRateDecimal, year);
                    totalDynamicPostTaxCashFlow += dynamicPreTaxCashFlow - yearAdjustedTax / discountFactor;
                  });
                  
                  return formatNumberNoRounding(totalDynamicPostTaxCashFlow);
                })()}
              </Table.Td>
              {years.map((year) => {
                let yearPreTaxCashFlow = 0; // C：所得税前净现金流量
                let yearAdjustedTax = 0; // D：调整所得税
                
                if (year <= constructionYears) {
                  // 建设期
                  const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                  yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                  yearAdjustedTax = 0; // 建设期没有调整所得税
                } else {
                  // 运营期
                  const operationYear = year - constructionYears;
                  const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                    calculateSubsidyIncome(operationYear) +
                                    calculateFixedAssetResidual(operationYear) +
                                    calculateWorkingCapitalRecovery(operationYear);
                  const yearOutflow = calculateConstructionInvestment(year) +
                                    calculateWorkingCapital(year) +
                                    calculateOperatingCost(operationYear) +
                                    calculateVatAndTaxes(operationYear) +
                                    calculateMaintenanceInvestment(operationYear);
                  yearPreTaxCashFlow = yearInflow - yearOutflow;
                  yearAdjustedTax = calculateAdjustedIncomeTax(operationYear);
                }
                
                // 应用动态计算公式：C-D/(1+E)^B
                // C为所得税前净现金流量（动态），D为调整所得税
                // B从建设期第1年开始计算，所以直接使用year
                
                // 先计算所得税前净现金流量（动态）
                const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
                const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
                const dynamicPreTaxCashFlow = yearPreTaxCashFlow / preTaxDiscountFactor;
                
                // 再计算所得税后净现金流量（动态）= C-D/(1+E)^B
                const postTaxRateDecimal = postTaxRate / 100; // 转换为小数
                const discountFactor = Math.pow(1 + postTaxRateDecimal, year);
                const dynamicValue = dynamicPreTaxCashFlow - yearAdjustedTax / discountFactor;
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(dynamicValue)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 4. 累计所得税后净现金流量（动态） */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>累计所得税后净现金流量（动态）</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 修正：与 Excel 导出逻辑保持一致，计算各年累计值的总和
                  let allColumnsTotal = 0;
                  let cumulativeForTotal = 0;
                  const postTaxRateDecimal = postTaxRate / 100;
                  const preTaxRateDecimal = preTaxRate / 100;
                  
                  years.forEach((year) => {
                    let yearPreTaxCashFlow = 0; // C：所得税前净现金流量
                    let yearAdjustedTax = 0; // D：调整所得税
                    
                    if (year <= constructionYears) {
                      // 建设期
                      const yearInflow = 0; // 建设期没有现金流入
                      const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                      yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                      yearAdjustedTax = 0; // 建设期没有调整所得税
                    } else {
                      // 运营期
                      const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                        calculateSubsidyIncome(operationYear) +
                                        calculateFixedAssetResidual(operationYear) +
                                        calculateWorkingCapitalRecovery(operationYear);
                      const yearOutflow = calculateConstructionInvestment(year) +
                                        calculateWorkingCapital(year) +
                                        calculateOperatingCost(operationYear) +
                                        calculateVatAndTaxes(operationYear) +
                                        calculateMaintenanceInvestment(operationYear);
                      yearPreTaxCashFlow = yearInflow - yearOutflow;
                      yearAdjustedTax = calculateAdjustedIncomeTax(operationYear);
                    }
                    
                    // 应用动态计算公式：C-D/(1+E)^B
                    // C为所得税前净现金流量（动态），D为调整所得税
                    // B从建设期第1年开始计算，所以直接使用year
                    
                    // 先计算所得税前净现金流量（动态）
                    const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
                    const dynamicPreTaxCashFlow = yearPreTaxCashFlow / preTaxDiscountFactor;
                    
                    // 再计算所得税后净现金流量（动态）= C-D/(1+E)^B
                    const discountFactor = Math.pow(1 + postTaxRateDecimal, year);
                    const dynamicValue = dynamicPreTaxCashFlow - yearAdjustedTax / discountFactor;
                    
                    // 累计值 = 前一年累计值 + 当年数值
                    cumulativeForTotal += dynamicValue;
                    // 合计列应该等于各列累计值的总和
                    allColumnsTotal += cumulativeForTotal;
                  });
                  
                  return formatNumberNoRounding(allColumnsTotal);
                })()}
              </Table.Td>
              {(() => {
                let cumulativeDynamicCashFlow = 0;
                const postTaxRateDecimal = postTaxRate / 100;
                
                return years.map((year) => {
                  let yearPreTaxCashFlow = 0; // C：所得税前净现金流量
                  let yearAdjustedTax = 0; // D：调整所得税
                  
                  if (year <= constructionYears) {
                    // 建设期
                    const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
                    yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
                    yearAdjustedTax = 0; // 建设期没有调整所得税
                  } else {
                    // 运营期
                    const operationYear = year - constructionYears;
                    const yearInflow = calculateOperatingRevenue(operationYear) + // 修复：使用不含税营业收入
                                      calculateSubsidyIncome(operationYear) +
                                      calculateFixedAssetResidual(operationYear) +
                                      calculateWorkingCapitalRecovery(operationYear);
                    const yearOutflow = calculateConstructionInvestment(year) +
                                      calculateWorkingCapital(year) +
                                      calculateOperatingCost(operationYear) +
                                      calculateVatAndTaxes(operationYear) +
                                      calculateMaintenanceInvestment(operationYear);
                    yearPreTaxCashFlow = yearInflow - yearOutflow;
                    yearAdjustedTax = calculateAdjustedIncomeTax(operationYear);
                  }
                  
                  // 应用动态计算公式：C-D/(1+E)^B
                  // B从建设期第1年开始计算，所以直接使用year
                  
                  // 先计算所得税前净现金流量（动态）
                  const preTaxRateDecimal = preTaxRate / 100;
                  const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
                  const dynamicPreTaxCashFlow = yearPreTaxCashFlow / preTaxDiscountFactor;
                  
                  // 再计算所得税后净现金流量（动态）= C-D/(1+E)^B
                  const discountFactor = Math.pow(1 + postTaxRateDecimal, year);
                  const dynamicValue = dynamicPreTaxCashFlow - yearAdjustedTax / discountFactor;
                  cumulativeDynamicCashFlow += dynamicValue;
                  
                  return (
                    <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {formatNumberWithZeroBlank(cumulativeDynamicCashFlow)}
                    </Table.Td>
                  );
                });
              })()}
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </>
    )
  };

  // 处理查看 JSON 数据
  const handleViewJsonData = async () => {
    setJsonLoading(true)
    setJsonError(null)
    
    try {
      if (!context) {
        throw new Error('项目上下文未加载')
      }
      
      // 生成项目投资现金流量表数据
      const cashFlowTableData = generateCashFlowTableData(
        context,
        calculateConstructionInvestment,
        calculateWorkingCapital,
        calculateOperatingRevenue,
        calculateSubsidyIncome,
        calculateFixedAssetResidual,
        calculateWorkingCapitalRecovery,
        calculateOperatingCost,
        calculateVatAndTaxes,
        calculateMaintenanceInvestment,
        calculateAdjustedIncomeTax,
        calculateOperatingCostWithoutTax,
        preTaxRate,
        postTaxRate
      );
      
      // 获取完整的项目数据作为JSON基础
      const completeJsonData = {
        projectContext: context,
        revenueConfig: {
          items: revenueItems,
          productionRates: productionRates
        },
        costConfig: costConfig,
        cashFlowTableData: cashFlowTableData, // 添加项目投资现金流量表数据
        tableData: {
          revenueTable: revenueTableData,
          costTable: costTableData,
          profitDistributionTable: profitDistributionTableData,
          loanRepaymentTable: repaymentTableData
        },
        investmentData: {
          estimate: investmentEstimate,
          depreciationData: depreciationData
        },
        financialIndicators: useCachedFinancialIndicators(), // 添加财务指标计算结果
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          description: '完整的项目财务数据，包含所有计算所需的基础信息和结果',
          dataSources: [
            '项目投资现金流量表',
            '利润与利润分配表',
            '营业收入、营业税金及附加和增值税估算表',
            '总成本费用估算表',
            '借款还本付息计划表',
            '分年度投资估算表'
          ]
        }
      }
      
      setJsonData(completeJsonData)
      setShowJsonViewer(true)
      
      notifications.show({
        title: 'JSON数据加载成功',
        message: `已获取完整的项目数据，包含现金流量表和财务指标`,
        color: 'green',
      })
    } catch (error: any) {
      setJsonError(error.message || '获取JSON数据失败')
      notifications.show({
        title: '错误',
        message: error.message || '获取JSON数据失败',
        color: 'red'
      })
    } finally {
      setJsonLoading(false)
    }
  }

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="md" fw={600} c="#1D2129">
            项目投资现金流量配置
          </Text>
          <Group gap="xs">
            <Tooltip label="查看 JSON 数据">
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                onClick={handleViewJsonData}
                loading={jsonLoading}
              >
                <IconCode size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="导出项目投资现金流量表">
              <ActionIcon
                variant="light"
                color="green"
                size="lg"
                onClick={handleExportProfitTaxTable}
              >
                <IconDownload size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Card with actions grid */}
        <Card withBorder radius="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>投资配置项</Text>
          </Group>
          <SimpleGrid cols={3} mt="md">
            {investmentConfigItems.map((item) => (
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
          </SimpleGrid>
        </Card>
      </Stack>
      
      {/* 项目投资现金流量表弹窗 */}
      <Modal
        opened={showProfitTaxModal}
        onClose={() => setShowProfitTaxModal(false)}
        centered
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 项目投资现金流量表
            </Text>
            <Group gap="xs">
              <Tooltip label="查看JSON数据">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size={16}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 准备JSON数据
                    const cashFlowTableData = generateCashFlowTableData(
                      context,
                      calculateConstructionInvestment,
                      calculateWorkingCapital,
                      calculateOperatingRevenue,
                      calculateSubsidyIncome,
                      calculateFixedAssetResidual,
                      calculateWorkingCapitalRecovery,
                      calculateOperatingCost,
                      calculateVatAndTaxes,
                      calculateMaintenanceInvestment,
                      calculateAdjustedIncomeTax,
                      calculateOperatingCostWithoutTax,
                      preTaxRate,
                      postTaxRate
                    );
                    
                    // 创建JSON数据
                    const jsonData = {
                      metadata: cashFlowTableData.metadata,
                      yearlyData: cashFlowTableData.yearlyData,
                      totals: cashFlowTableData.totals,
                      financialIndicators: useCachedFinancialIndicators(),
                      generatedAt: new Date().toISOString()
                    };
                    
                    // 创建下载链接
                    const dataStr = JSON.stringify(jsonData, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `项目投资现金流量表数据_${context?.projectName || '项目'}_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    notifications.show({
                      title: '导出成功',
                      message: '项目投资现金流量表JSON数据已导出',
                      color: 'green',
                    });
                  }}
                >
                  <IconCode size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="计算指标">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size={16}
                  onClick={() => setShowFinancialIndicatorsModal(true)}
                >
                  <IconCalculator size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="导出Excel">
                <ActionIcon
                  variant="light"
                  color="green"
                  size={16}
                  onClick={handleExportProfitTaxTable}
                >
                  <IconDownload size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        }
        size="2000px"
        styles={{
          body: {
            maxHeight: '900px',
            overflowY: 'auto',
          },
        }}
      >
        {renderProfitTaxModal()}
      </Modal>

      {/* 分年度投资估算表弹窗 */}
      <Modal
        opened={showAnnualInvestmentModal}
        onClose={() => setShowAnnualInvestmentModal(false)}
        title="📊 分年度投资估算表"
        size="calc(55vw - 50px)"
        centered
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        <AnnualInvestmentTable
          investmentEstimate={investmentEstimate}
          constructionYears={context?.constructionYears}
          showCard={false}
        />
      </Modal>

      {/* 利润与利润分配表弹窗 */}
      <Modal
        opened={showProfitDistributionModal}
        onClose={() => setShowProfitDistributionModal(false)}
        centered
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 利润与利润分配表
            </Text>
            <Group gap="xs">
              <Tooltip label="设置">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size={16}
                  onClick={openProfitSettingsModal}
                >
                  <IconSettings size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="导出Excel">
                <ActionIcon
                  variant="light"
                  color="green"
                  size={16}
                  onClick={handleExportProfitDistributionTable}
                >
                  <IconDownload size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        }
        size="2000px"
        styles={{
          body: {
            maxHeight: '1000px',
            overflowY: 'auto',
          },
        }}
      >
        {renderProfitDistributionModal()}
      </Modal>

      {/* 财务计算指标设置弹窗 */}
      <Modal
        opened={showFinancialIndicatorsSettings}
        onClose={() => {
          setShowFinancialIndicatorsSettings(false);
          // 重新打开财务指标表modal，保持用户操作流程连贯
          setTimeout(() => {
            setShowFinancialIndicatorsModal(true);
          }, 100);
        }}
        centered
        title="设置基准收益率"
        size="400px"
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">基准收益率（所得税前）%</Text>
            <NumberInput
              value={tempPreTaxRate}
              onChange={(value) => setTempPreTaxRate(typeof value === 'number' ? value : 0)}
              min={0}
              max={100}
              step={0.1}
              placeholder="请输入基准收益率（所得税前）"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">基准收益率（所得税后）%</Text>
            <NumberInput
              value={tempPostTaxRate}
              onChange={(value) => setTempPostTaxRate(typeof value === 'number' ? value : 0)}
              min={0}
              max={100}
              step={0.1}
              placeholder="请输入基准收益率（所得税后）"
            />
          </div>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => {
                setShowFinancialIndicatorsSettings(false);
                // 重新打开财务指标表modal，保持用户操作流程连贯
                setTimeout(() => {
                  setShowFinancialIndicatorsModal(true);
                }, 100);
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                // 保存设置并关闭弹窗
                setPreTaxRate(tempPreTaxRate);
                setPostTaxRate(tempPostTaxRate);
                localStorage.setItem('financialIndicatorsPreTaxRate', tempPreTaxRate.toString());
                localStorage.setItem('financialIndicatorsPostTaxRate', tempPostTaxRate.toString());
                
                // 强制刷新财务指标表
                setFinancialIndicatorsRefreshKey(prev => prev + 1);
                setShowFinancialIndicatorsSettings(false);
                
                // 重新打开财务指标表modal，保持用户操作流程连贯
                setTimeout(() => {
                  setShowFinancialIndicatorsModal(true);
                }, 100);
              }}
            >
              确定
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* 财务计算指标表弹窗 */}
      <Modal
        key={`financial-indicators-modal-${financialIndicatorsRefreshKey}`}
        opened={showFinancialIndicatorsModal}
        onClose={() => {
          // 确保关闭财务指标表时也关闭设置弹窗
          setShowFinancialIndicatorsSettings(false);
          setShowFinancialIndicatorsModal(false);
        }}
        centered
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 财务计算指标表
            </Text>
            <Group gap="xs">
              <Tooltip label="调试计算过程">
                <ActionIcon
                  variant="light"
                  color="orange"
                  size={16}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 准备调试数据
                    const indicators = useCachedFinancialIndicators();
                    const cashFlowData = generateCashFlowTableData(
                      context,
                      calculateConstructionInvestment,
                      calculateWorkingCapital,
                      calculateOperatingRevenue,
                      calculateSubsidyIncome,
                      calculateFixedAssetResidual,
                      calculateWorkingCapitalRecovery,
                      calculateOperatingCost,
                      calculateVatAndTaxes,
                      calculateMaintenanceInvestment,
                      calculateAdjustedIncomeTax,
                      calculateOperatingCostWithoutTax,
                      preTaxRate,
                      postTaxRate
                    );
                    setDebugIndicators(indicators);
                    setDebugCashFlowData(cashFlowData.yearlyData);
                    setShowDebugModal(true);
                  }}
                >
                  <IconBug size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="设置">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size={16}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 将当前值复制到临时状态
                    setTempPreTaxRate(preTaxRate);
                    setTempPostTaxRate(postTaxRate);
                    // 先关闭财务指标表modal，然后打开设置modal
                    setShowFinancialIndicatorsModal(false);
                    // 使用setTimeout确保设置modal在财务指标表modal关闭后再打开
                    setTimeout(() => {
                      setShowFinancialIndicatorsSettings(true);
                    }, 100);
                  }}
                >
                  <IconSettings size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        }
        size="420px"
        styles={{
          body: {
            maxHeight: '500px',
            overflowY: 'auto',
          },
        }}
      >
        <Stack gap="md">
          <div style={{ overflowX: 'auto' }}>
            <Table
              striped
              withTableBorder
              styles={{
                th: {
                  backgroundColor: '#F7F8FA',
                  color: '#1D2129',
                  fontWeight: 600,
                  fontSize: '14px',
                  textAlign: 'center',
                  border: '1px solid #E5E6EB'
                },
                td: {
                  fontSize: '14px',
                  textAlign: 'center',
                  border: '1px solid #E5E6EB'
                }
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '230px' }}>项目</Table.Th>
                  <Table.Th style={{ width: '50px' }}>数值</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(() => {
                  const indicators = useCachedFinancialIndicators();
                  return (
                    <>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目投资财务内部收益率（%）（所得税前）</Table.Td>
                        <Table.Td>{formatNumberNoRounding(indicators.preTaxIRR)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目投资财务内部收益率（%）（所得税后）</Table.Td>
                        <Table.Td>{formatNumberNoRounding(indicators.postTaxIRR)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目投资财务净现值（所得税前）（ic={preTaxRate}%）</Table.Td>
                        <Table.Td>{formatNumberNoRounding(indicators.preTaxNPV)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目投资财务净现值（所得税后）（ic={postTaxRate}%）</Table.Td>
                        <Table.Td>{formatNumberNoRounding(indicators.postTaxNPV)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目静态投资回收期（年）（所得税前）</Table.Td>
                        <Table.Td>{formatPaybackPeriod(indicators.preTaxStaticPaybackPeriod)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目静态投资回收期（年）（所得税后）</Table.Td>
                        <Table.Td>{formatPaybackPeriod(indicators.postTaxStaticPaybackPeriod)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目动态投资回收期（年）（所得税前）</Table.Td>
                        <Table.Td>{formatPaybackPeriod(indicators.preTaxDynamicPaybackPeriod)}</Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td style={{ textAlign: 'left' }}>项目动态投资回收期（年）（所得税后）</Table.Td>
                        <Table.Td>{formatPaybackPeriod(indicators.postTaxDynamicPaybackPeriod)}</Table.Td>
                      </Table.Tr>
                    </>
                  );
                })()}
              </Table.Tbody>
            </Table>
          </div>
        </Stack>
      </Modal>
      
      {/* JSON 数据查看器 */}
      <JsonDataViewer
        opened={showJsonViewer}
        onClose={() => setShowJsonViewer(false)}
        data={jsonData}
        loading={jsonLoading}
        error={jsonError}
      />

      {/* 利润与利润分配表设置弹窗 */}
      <Modal
        opened={showProfitSettingsModal}
        onClose={() => setShowProfitSettingsModal(false)}
        centered
        title="📊 利润与利润分配表设置"
        size="500px"
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">年补贴收入</Text>
            <NumberInput
              value={tempSubsidyIncome}
              onChange={(value) => setTempSubsidyIncome(typeof value === 'number' ? value : 0)}
              min={0}
              step={1000}
              placeholder="请输入年补贴收入"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">所得税率 (%)</Text>
            <NumberInput
              value={tempIncomeTaxRate}
              onChange={(value) => setTempIncomeTaxRate(typeof value === 'number' ? value : 0)}
              min={0}
              max={100}
              step={0.1}
              placeholder="请输入所得税率"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">提取公积金比例 (%)</Text>
            <NumberInput
              value={tempStatutorySurplusRate}
              onChange={(value) => setTempStatutorySurplusRate(typeof value === 'number' ? value : 0)}
              min={0}
              max={100}
              step={0.1}
              placeholder="请提取公积金比例"
            />
          </div>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => setShowProfitSettingsModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={saveProfitSettings}
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
      {/* 借款还本付息计划表弹窗 */}
      <Modal
        opened={showLoanRepaymentModal}
        onClose={() => setShowLoanRepaymentModal(false)}
        centered
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 借款还本付息计划表
            </Text>
          </Group>
        }
        size="2000px"
        styles={{
          body: {
            maxHeight: '900px',
            overflowY: 'auto',
          },
        }}
      >
        <LoanRepaymentScheduleTable 
          showCard={false} 
          estimate={investmentEstimate} 
          depreciationData={depreciationData}
        />
      </Modal>

      {/* 财务指标调试弹窗 */}
      <Modal
        opened={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        centered
        title="🔍 财务指标计算调试"
        size="1400px"
        styles={{
          body: {
            maxHeight: '85vh',
            overflowY: 'auto',
          },
        }}
      >
        {debugIndicators && debugCashFlowData.length > 0 && (
          <FinancialIndicatorsDebug
            opened={showDebugModal}
            onClose={() => setShowDebugModal(false)}
            indicators={{
              preTaxIRR: debugIndicators.preTaxIRR,
              preTaxNPV: debugIndicators.preTaxNPV,
              preTaxStaticPaybackPeriod: debugIndicators.preTaxStaticPaybackPeriod,
              preTaxDynamicPaybackPeriod: debugIndicators.preTaxDynamicPaybackPeriod,
              postTaxIRR: debugIndicators.postTaxIRR,
              postTaxNPV: debugIndicators.postTaxNPV,
              postTaxStaticPaybackPeriod: debugIndicators.postTaxStaticPaybackPeriod,
              postTaxDynamicPaybackPeriod: debugIndicators.postTaxDynamicPaybackPeriod
            }}
            cashFlowData={{
              preTaxData: debugCashFlowData.map(cf => ({
                year: cf.year,
                staticCashFlow: cf.preTaxCashFlow,
                dynamicCashFlow: cf.preTaxCashFlowDynamic,
                cumulativeStaticCashFlow: cf.cumulativePreTaxCashFlow,
                cumulativeDynamicCashFlow: cf.cumulativePreTaxCashFlowDynamic
              })),
              postData: debugCashFlowData.map(cf => ({
                year: cf.year,
                staticCashFlow: cf.postTaxCashFlow,
                dynamicCashFlow: cf.postTaxCashFlowDynamic,
                cumulativeStaticCashFlow: cf.cumulativePostTaxCashFlow,
                cumulativeDynamicCashFlow: cf.cumulativePostTaxCashFlowDynamic
              }))
            }}
            preTaxRate={preTaxRate}
            postTaxRate={postTaxRate}
            incomeTaxRate={incomeTaxRate}
          />
        )}
      </Modal>
    </>
  )
}

// ==================== 财务指标计算函数 ====================

// 项目投资现金流量表数据结构定义
interface CashFlowYearlyData {
  year: number;
  period: 'construction' | 'operation';
  
  // 现金流入
  operatingRevenue: number;           // 营业收入
  subsidyIncome: number;               // 补贴收入
  fixedAssetResidual: number;          // 回收固定资产余值
  workingCapitalRecovery: number;      // 回收流动资金
  totalInflow: number;                 // 现金流入合计
  
  // 现金流出
  constructionInvestment: number;      // 建设投资
  workingCapital: number;              // 流动资金
  operatingCost: number;               // 经营成本
  vatAndTaxes: number;                 // 增值税、房产税等及附加
  maintenanceInvestment: number;       // 维持运营投资
  totalOutflow: number;                // 现金流出合计
  
  // 净现金流量
  preTaxCashFlow: number;              // 所得税前净现金流量
  adjustedIncomeTax: number;           // 调整所得税
  postTaxCashFlow: number;             // 所得税后净现金流量
  
  // 累计净现金流量
  cumulativePreTaxCashFlow: number;    // 累计所得税前净现金流量
  cumulativePostTaxCashFlow: number;   // 累计所得税后净现金流量
  
  // 动态净现金流量
  preTaxCashFlowDynamic: number;       // 所得税前净现金流量（动态）
  postTaxCashFlowDynamic: number;      // 所得税后净现金流量（动态）
  
  // 累计动态净现金流量
  cumulativePreTaxCashFlowDynamic: number;  // 累计所得税前净现金流量（动态）
  cumulativePostTaxCashFlowDynamic: number; // 累计所得税后净现金流量（动态）
}

interface CashFlowTableData {
  metadata: {
    constructionYears: number;
    operationYears: number;
    totalYears: number;
    preTaxRate: number;
    postTaxRate: number;
    generatedAt: string;
  };
  yearlyData: CashFlowYearlyData[];
  totals: {
    totalInflow: number;
    totalOutflow: number;
    totalPreTaxCashFlow: number;
    totalPostTaxCashFlow: number;
    totalAdjustedIncomeTax: number;
    totalPreTaxCashFlowDynamic: number; // 所得税前净现金流量（动态）合计
    totalPostTaxCashFlowDynamic: number; // 所得税后净现金流量（动态）合计
  };
}

// 财务指标结果接口
interface FinancialIndicators {
  preTaxIRR: number;
  postTaxIRR: number;
  preTaxNPV: number;
  postTaxNPV: number;
  preTaxStaticPaybackPeriod: number;
  postTaxStaticPaybackPeriod: number;
  preTaxDynamicPaybackPeriod: number;
  postTaxDynamicPaybackPeriod: number;
}

// 生成项目投资现金流量表数据
const generateCashFlowTableData = (
  context: any,
  calculateConstructionInvestment: (year?: number) => number,
  calculateWorkingCapital: (year?: number) => number,
  calculateOperatingRevenue: (year?: number) => number,
  calculateSubsidyIncome: (year?: number) => number,
  calculateFixedAssetResidual: (year?: number) => number,
  calculateWorkingCapitalRecovery: (year?: number) => number,
  calculateOperatingCost: (year?: number) => number,
  calculateVatAndTaxes: (year?: number) => number,
  calculateMaintenanceInvestment: (year?: number) => number,
  calculateAdjustedIncomeTax: (year?: number) => number,
  calculateOperatingCostWithoutTax: (year?: number) => number,
  preTaxRate: number,
  postTaxRate: number
): CashFlowTableData => {
  if (!context) {
    return {
      metadata: {
        constructionYears: 0,
        operationYears: 0,
        totalYears: 0,
        preTaxRate,
        postTaxRate,
        generatedAt: new Date().toISOString()
      },
      yearlyData: [],
      totals: {
        totalInflow: 0,
        totalOutflow: 0,
        totalPreTaxCashFlow: 0,
        totalPostTaxCashFlow: 0,
        totalAdjustedIncomeTax: 0,
        totalPreTaxCashFlowDynamic: 0,
        totalPostTaxCashFlowDynamic: 0
      }
    };
  }

  const constructionYears = context.constructionYears;
  const operationYears = context.operationYears;
  const totalYears = constructionYears + operationYears;
  const yearlyData: CashFlowYearlyData[] = [];
  
  let cumulativePreTax = 0;
  let cumulativePostTax = 0;
  let cumulativePreTaxDynamic = 0;
  let cumulativePostTaxDynamic = 0;
  
  const preTaxRateDecimal = preTaxRate / 100;
  const postTaxRateDecimal = postTaxRate / 100;
  
  // 合计数据 - 修复：只计算运营期的合计，与Excel导出逻辑一致
  let totalInflow = 0;
  let totalOutflow = 0;
  let totalPreTaxCashFlow = 0;
  let totalPostTaxCashFlow = 0;
  let totalAdjustedIncomeTax = 0;

  for (let year = 1; year <= totalYears; year++) {
    const period = year <= constructionYears ? 'construction' : 'operation';
    const operationYear = year - constructionYears;

    // 计算现金流入
    let operatingRevenue = 0;
    let subsidyIncome = 0;
    let fixedAssetResidual = 0;
    let workingCapitalRecovery = 0;
    
    if (year > constructionYears) {
      operatingRevenue = calculateOperatingRevenue(operationYear);
      subsidyIncome = calculateSubsidyIncome(operationYear);
      fixedAssetResidual = calculateFixedAssetResidual(operationYear);
      workingCapitalRecovery = calculateWorkingCapitalRecovery(operationYear);
    }
    
    const totalInflowYear = operatingRevenue + subsidyIncome + fixedAssetResidual + workingCapitalRecovery;

    // 计算现金流出
    const constructionInvestment = calculateConstructionInvestment(year);
    const workingCapital = calculateWorkingCapital(year);
    let operatingCost = 0;
    let vatAndTaxes = 0;
    let maintenanceInvestment = 0;
    let adjustedIncomeTax = 0;
    
    if (year > constructionYears) {
      // 现金流量表中的经营成本使用总成本费用估算表中的"1 营业成本"数据
      operatingCost = calculateOperatingCost(operationYear);
      vatAndTaxes = calculateVatAndTaxes(operationYear);
      maintenanceInvestment = calculateMaintenanceInvestment(operationYear);
      adjustedIncomeTax = calculateAdjustedIncomeTax(operationYear);
    }
    
    const totalOutflowYear = constructionInvestment + workingCapital + operatingCost + vatAndTaxes + maintenanceInvestment;

    // 计算净现金流量
    const preTaxCashFlow = totalInflowYear - totalOutflowYear;
    const postTaxCashFlow = preTaxCashFlow - adjustedIncomeTax;

    // 计算累计净现金流量
    cumulativePreTax += preTaxCashFlow;
    cumulativePostTax += postTaxCashFlow;

    // 修复：动态现金流计算使用正确的公式 C-D/(1+E)^B
    // 先计算所得税前净现金流量（动态）
    const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
    const preTaxCashFlowDynamic = preTaxCashFlow / preTaxDiscountFactor;
    
    // 再计算所得税后净现金流量（动态）= C-D/(1+E)^B
    // C：所得税前净现金流量（动态），D：调整所得税，E：所得税后折现率，B：年份
    const postTaxDiscountFactor = Math.pow(1 + postTaxRateDecimal, year);
    const postTaxCashFlowDynamic = preTaxCashFlowDynamic - adjustedIncomeTax / postTaxDiscountFactor;

    // 计算累计动态净现金流量
    cumulativePreTaxDynamic += preTaxCashFlowDynamic;
    cumulativePostTaxDynamic += postTaxCashFlowDynamic;

    // 修复：累计合计只计算运营期，与Excel导出逻辑一致
    if (year > constructionYears) {
      totalInflow += totalInflowYear;
      totalOutflow += totalOutflowYear;
      totalPreTaxCashFlow += preTaxCashFlow;
      totalPostTaxCashFlow += postTaxCashFlow;
      totalAdjustedIncomeTax += adjustedIncomeTax;
    }

    yearlyData.push({
      year,
      period,
      operatingRevenue,
      subsidyIncome,
      fixedAssetResidual,
      workingCapitalRecovery,
      totalInflow: totalInflowYear,
      constructionInvestment,
      workingCapital,
      operatingCost,
      vatAndTaxes,
      maintenanceInvestment,
      totalOutflow: totalOutflowYear,
      preTaxCashFlow,
      adjustedIncomeTax,
      postTaxCashFlow,
      cumulativePreTaxCashFlow: cumulativePreTax,
      cumulativePostTaxCashFlow: cumulativePostTax,
      preTaxCashFlowDynamic,
      postTaxCashFlowDynamic,
      cumulativePreTaxCashFlowDynamic: cumulativePreTaxDynamic,
      cumulativePostTaxCashFlowDynamic: cumulativePostTaxDynamic,
    });
  }

  return {
    metadata: {
      constructionYears,
      operationYears,
      totalYears,
      preTaxRate,
      postTaxRate,
      generatedAt: new Date().toISOString()
    },
    yearlyData,
    totals: {
      totalInflow,
      totalOutflow,
      totalPreTaxCashFlow,
      totalPostTaxCashFlow,
      totalAdjustedIncomeTax,
      totalPreTaxCashFlowDynamic: cumulativePreTaxDynamic, // 所得税前净现金流量（动态）合计
      totalPostTaxCashFlowDynamic: cumulativePostTaxDynamic // 所得税后净现金流量（动态）合计
    }
  };
};

// 基于现金流表数据计算财务指标
const calculateFinancialIndicators = (cashFlowData: CashFlowTableData): FinancialIndicators => {
  const { yearlyData, metadata } = cashFlowData;
  
  if (yearlyData.length === 0) {
    return {
      preTaxIRR: 0,
      postTaxIRR: 0,
      preTaxNPV: 0,
      postTaxNPV: 0,
      preTaxStaticPaybackPeriod: 0,
      postTaxStaticPaybackPeriod: 0,
      preTaxDynamicPaybackPeriod: 0,
      postTaxDynamicPaybackPeriod: 0
    };
  }

  // 提取现金流数组 - 确保与Excel导出使用相同的数据
  const preTaxCashFlows = yearlyData.map(row => row.preTaxCashFlow);
  const postTaxCashFlows = yearlyData.map(row => row.postTaxCashFlow);
  const cumulativePreTaxFlows = yearlyData.map(row => row.cumulativePreTaxCashFlow);
  const cumulativePostTaxFlows = yearlyData.map(row => row.cumulativePostTaxCashFlow);
  const cumulativePreTaxDynamicFlows = yearlyData.map(row => row.cumulativePreTaxCashFlowDynamic);
  const cumulativePostTaxDynamicFlows = yearlyData.map(row => row.cumulativePostTaxCashFlowDynamic);

  // 计算财务指标
  // 注意：NPV根据要求直接使用现金流量表中的动态现金流合计值
  const preTaxIRR = safeCalculateIRR(preTaxCashFlows);
  const postTaxIRR = safeCalculateIRR(postTaxCashFlows);
  // 获取最后一年的累计所得税前净现金流量（动态）值
  const lastYearPreTaxCumulativeDynamic = cashFlowData.yearlyData.length > 0
    ? cashFlowData.yearlyData[cashFlowData.yearlyData.length - 1].cumulativePreTaxCashFlowDynamic
    : 0;
  // 获取最后一年的累计所得税后净现金流量（动态）值
  const lastYearPostTaxCumulativeDynamic = cashFlowData.yearlyData.length > 0
    ? cashFlowData.yearlyData[cashFlowData.yearlyData.length - 1].cumulativePostTaxCashFlowDynamic
    : 0;
  const preTaxNPV = lastYearPreTaxCumulativeDynamic; // 项目投资财务净现值（所得税前）采用"累计所得税前净现金流量（动态）"最后一年的值
  const postTaxNPV = lastYearPostTaxCumulativeDynamic; // 项目投资财务净现值（所得税后）采用"累计所得税后净现金流量（动态）"最后一年的值
  const preTaxStaticPaybackPeriod = safeCalculatePaybackPeriod(cumulativePreTaxFlows);
  const postTaxStaticPaybackPeriod = safeCalculatePaybackPeriod(cumulativePostTaxFlows);
  const preTaxDynamicPaybackPeriod = safeCalculateDynamicPaybackPeriod(cumulativePreTaxDynamicFlows);
  const postTaxDynamicPaybackPeriod = safeCalculateDynamicPaybackPeriod(cumulativePostTaxDynamicFlows);

  // 返回财务指标结果
  return {
    preTaxIRR,
    postTaxIRR,
    preTaxNPV,
    postTaxNPV,
    preTaxStaticPaybackPeriod,
    postTaxStaticPaybackPeriod,
    preTaxDynamicPaybackPeriod,
    postTaxDynamicPaybackPeriod,
  };
};

// 获取所得税前净现金流量数组
const getPreTaxCashFlows = (context: any, calculateConstructionInvestment: (year?: number) => number,
                                      calculateWorkingCapital: (year?: number) => number,
                                      calculateOperatingRevenue: (year?: number) => number,
                                      calculateSubsidyIncome: (year?: number) => number,
                                      calculateFixedAssetResidual: (year?: number) => number,
                                      calculateWorkingCapitalRecovery: (year?: number) => number,
                                      calculateOperatingCost: (year?: number) => number,
                                      calculateVatAndTaxes: (year?: number) => number,
                                      calculateMaintenanceInvestment: (year?: number) => number): number[] => {
    if (!context) return [];
    
    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const cashFlows: number[] = [];
    
    for (let year = 1; year <= totalYears; year++) {
      let yearInflow = 0;
      let yearOutflow = 0;
      
      if (year <= constructionYears) {
        // 建设期
        yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
      } else {
        // 运营期
        const operationYear = year - constructionYears;
        yearInflow = calculateOperatingRevenue(operationYear) +
                     calculateSubsidyIncome(operationYear) +
                     calculateFixedAssetResidual(operationYear) +
                     calculateWorkingCapitalRecovery(operationYear);
        yearOutflow = calculateConstructionInvestment(year) +
                     calculateWorkingCapital(year) +
                     calculateOperatingCost(operationYear) +
                     calculateVatAndTaxes(operationYear) +
                     calculateMaintenanceInvestment(operationYear);
      }
      
      cashFlows.push(yearInflow - yearOutflow);
    }
    
    return cashFlows;
  };

  // 获取所得税后净现金流量数组
  const getPostTaxCashFlows = (context: any, calculateConstructionInvestment: (year?: number) => number,
                                                calculateWorkingCapital: (year?: number) => number,
                                                calculateOperatingRevenue: (year?: number) => number,
                                                calculateSubsidyIncome: (year?: number) => number,
                                                calculateFixedAssetResidual: (year?: number) => number,
                                                calculateWorkingCapitalRecovery: (year?: number) => number,
                                                calculateOperatingCost: (year?: number) => number,
                                                calculateVatAndTaxes: (year?: number) => number,
                                                calculateMaintenanceInvestment: (year?: number) => number,
                                                calculateAdjustedIncomeTax: (year?: number) => number): number[] => {
    if (!context) return [];
    
    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const cashFlows: number[] = [];
    
    for (let year = 1; year <= totalYears; year++) {
      let yearInflow = 0;
      let yearOutflow = 0;
      let yearTax = 0;
      
      if (year <= constructionYears) {
        // 建设期
        yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
      } else {
        // 运营期
        const operationYear = year - constructionYears;
        yearInflow = calculateOperatingRevenue(operationYear) +
                     calculateSubsidyIncome(operationYear) +
                     calculateFixedAssetResidual(operationYear) +
                     calculateWorkingCapitalRecovery(operationYear);
        yearOutflow = calculateConstructionInvestment(year) +
                     calculateWorkingCapital(year) +
                     calculateOperatingCost(operationYear) +
                     calculateVatAndTaxes(operationYear) +
                     calculateMaintenanceInvestment(operationYear);
        yearTax = calculateAdjustedIncomeTax(operationYear);
      }
      
      cashFlows.push(yearInflow - yearOutflow - yearTax);
    }
    
    return cashFlows;
  };

  // 获取累计所得税前净现金流量数组
  const getCumulativePreTaxCashFlows = (context: any, calculateConstructionInvestment: (year?: number) => number,
                                     calculateWorkingCapital: (year?: number) => number,
                                     calculateOperatingRevenue: (year?: number) => number,
                                     calculateSubsidyIncome: (year?: number) => number,
                                     calculateFixedAssetResidual: (year?: number) => number,
                                     calculateWorkingCapitalRecovery: (year?: number) => number,
                                     calculateOperatingCost: (year?: number) => number,
                                     calculateVatAndTaxes: (year?: number) => number,
                                     calculateMaintenanceInvestment: (year?: number) => number): number[] => {
    const cashFlows = getPreTaxCashFlows(context, calculateConstructionInvestment, calculateWorkingCapital,
                                        calculateOperatingRevenue, calculateSubsidyIncome,
                                        calculateFixedAssetResidual, calculateWorkingCapitalRecovery,
                                        calculateOperatingCost, calculateVatAndTaxes, calculateMaintenanceInvestment);
    const cumulativeCashFlows: number[] = [];
    let cumulative = 0;
    
    for (const cashFlow of cashFlows) {
      cumulative += cashFlow;
      cumulativeCashFlows.push(cumulative);
    }
    
    return cumulativeCashFlows;
  };

  // 获取累计所得税后净现金流量数组
  const getCumulativePostTaxCashFlows = (context: any, calculateConstructionInvestment: (year?: number) => number,
                                        calculateWorkingCapital: (year?: number) => number,
                                        calculateOperatingRevenue: (year?: number) => number,
                                        calculateSubsidyIncome: (year?: number) => number,
                                        calculateFixedAssetResidual: (year?: number) => number,
                                        calculateWorkingCapitalRecovery: (year?: number) => number,
                                        calculateOperatingCost: (year?: number) => number,
                                        calculateVatAndTaxes: (year?: number) => number,
                                        calculateMaintenanceInvestment: (year?: number) => number,
                                        calculateAdjustedIncomeTax: (year?: number) => number): number[] => {
    const cashFlows = getPostTaxCashFlows(context, calculateConstructionInvestment, calculateWorkingCapital,
                                        calculateOperatingRevenue, calculateSubsidyIncome,
                                        calculateFixedAssetResidual, calculateWorkingCapitalRecovery,
                                        calculateOperatingCost, calculateVatAndTaxes, calculateMaintenanceInvestment,
                                        calculateAdjustedIncomeTax);
    const cumulativeCashFlows: number[] = [];
    let cumulative = 0;
    
    for (const cashFlow of cashFlows) {
      cumulative += cashFlow;
      cumulativeCashFlows.push(cumulative);
    }
    
    return cumulativeCashFlows;
  };

  // 获取累计所得税前净现金流量（动态）数组
  const getCumulativeDynamicPreTaxCashFlows = (context: any, preTaxRate: number, calculateConstructionInvestment: (year?: number) => number,
                                              calculateWorkingCapital: (year?: number) => number,
                                              calculateOperatingRevenue: (year?: number) => number,
                                              calculateSubsidyIncome: (year?: number) => number,
                                              calculateFixedAssetResidual: (year?: number) => number,
                                              calculateWorkingCapitalRecovery: (year?: number) => number,
                                              calculateOperatingCost: (year?: number) => number,
                                              calculateVatAndTaxes: (year?: number) => number,
                                              calculateMaintenanceInvestment: (year?: number) => number): number[] => {
    if (!context) return [];
    
    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const cashFlows: number[] = [];
    const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
    let cumulative = 0;
    
    for (let year = 1; year <= totalYears; year++) {
      let yearPreTaxCashFlow = 0;
      
      if (year <= constructionYears) {
        // 建设期
        const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
        yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
      } else {
        // 运营期
        const operationYear = year - constructionYears;
                      const yearInflow = calculateOperatingRevenue(operationYear) +
                          calculateSubsidyIncome(operationYear) +
                          calculateFixedAssetResidual(operationYear) +
                          calculateWorkingCapitalRecovery(operationYear);
        const yearOutflow = calculateConstructionInvestment(year) +
                          calculateWorkingCapital(year) +
                          calculateOperatingCost(operationYear) +
                          calculateVatAndTaxes(operationYear) +
                          calculateMaintenanceInvestment(operationYear);
        yearPreTaxCashFlow = yearInflow - yearOutflow;
      }
      
      // 应用动态计算公式：所得税前净现金流量/(1+A)^B
      const discountFactor = Math.pow(1 + preTaxRateDecimal, year);
      const dynamicValue = yearPreTaxCashFlow / discountFactor;
      cumulative += dynamicValue;
      cashFlows.push(cumulative);
    }
    
    return cashFlows;
  };

  // 获取累计所得税后净现金流量（动态）数组
  const getCumulativeDynamicPostTaxCashFlows = (context: any, preTaxRate: number, postTaxRate: number, calculateConstructionInvestment: (year?: number) => number,
                                               calculateWorkingCapital: (year?: number) => number,
                                               calculateOperatingRevenue: (year?: number) => number,
                                               calculateSubsidyIncome: (year?: number) => number,
                                               calculateFixedAssetResidual: (year?: number) => number,
                                               calculateWorkingCapitalRecovery: (year?: number) => number,
                                               calculateOperatingCost: (year?: number) => number,
                                               calculateVatAndTaxes: (year?: number) => number,
                                               calculateMaintenanceInvestment: (year?: number) => number,
                                               calculateAdjustedIncomeTax: (year?: number) => number): number[] => {
    if (!context) return [];
    
    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const cashFlows: number[] = [];
    const preTaxRateDecimal = preTaxRate / 100; // 转换为小数
    const postTaxRateDecimal = postTaxRate / 100; // 转换为小数
    let cumulative = 0;
    
    for (let year = 1; year <= totalYears; year++) {
      let yearPreTaxCashFlow = 0; // C：所得税前净现金流量
      let yearAdjustedTax = 0; // D：调整所得税
      
      if (year <= constructionYears) {
        // 建设期
        const yearInflow = 0; // 建设期没有现金流入
        const yearOutflow = calculateConstructionInvestment(year) + calculateWorkingCapital(year);
        yearPreTaxCashFlow = -yearOutflow; // 建设期只有流出，所以是负值
        yearAdjustedTax = 0; // 建设期没有调整所得税
      } else {
        // 运营期
        const operationYear = year - constructionYears;
        const yearInflow = calculateOperatingRevenue(operationYear) +
                          calculateSubsidyIncome(operationYear) +
                          calculateFixedAssetResidual(operationYear) +
                          calculateWorkingCapitalRecovery(operationYear);
        const yearOutflow = calculateConstructionInvestment(year) +
                          calculateWorkingCapital(year) +
                          calculateOperatingCost(operationYear) +
                          calculateVatAndTaxes(operationYear) +
                          calculateMaintenanceInvestment(operationYear);
        yearPreTaxCashFlow = yearInflow - yearOutflow;
        yearAdjustedTax = calculateAdjustedIncomeTax(operationYear);
      }
      
      // 应用动态计算公式：C-D/(1+E)^B
      // 先计算所得税前净现金流量（动态）
      const preTaxDiscountFactor = Math.pow(1 + preTaxRateDecimal, year);
      const dynamicPreTaxCashFlow = yearPreTaxCashFlow / preTaxDiscountFactor;
      
      // 再计算所得税后净现金流量（动态）= C-D/(1+E)^B
      const discountFactor = Math.pow(1 + postTaxRateDecimal, year);
      const dynamicValue = dynamicPreTaxCashFlow - yearAdjustedTax / discountFactor;
      cumulative += dynamicValue;
      cashFlows.push(cumulative);
    }
    
    return cashFlows;
  };

export default FinancialIndicatorsTable
