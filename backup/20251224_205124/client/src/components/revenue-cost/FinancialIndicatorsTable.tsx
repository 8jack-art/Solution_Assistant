import React, { useState, useMemo } from 'react'
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
} from '@mantine/core'
import {
  IconTable,
  IconDownload,
  IconBuilding,
  IconChartLine,
  IconCoin,
  IconCalculator,
  IconFileText
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore } from '@/stores/revenueCostStore'
import * as XLSX from 'xlsx'
import AnnualInvestmentTable from './AnnualInvestmentTable'

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
  const { context, revenueItems, productionRates, costConfig } = useRevenueCostStore()
  const [showProfitTaxModal, setShowProfitTaxModal] = useState(false)
  
  // 表格弹窗状态
  const [showAnnualInvestmentModal, setShowAnnualInvestmentModal] = useState(false)
  const [showProfitDistributionModal, setShowProfitDistributionModal] = useState(false)
  const [showFinancialIndicatorsModal, setShowFinancialIndicatorsModal] = useState(false)
  
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
      onClick: () => setShowProfitDistributionModal(true)
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
      onClick: () => {/* TODO: 实现还本付息计划表 */ }
    },
  ]
  
  // 计算营业收入的函数
  const calculateOperatingRevenue = (year?: number): number => {
    if (year !== undefined) {
      // 计算指定年份的营业收入
      const productionRate = productionRates?.find(p => p.yearIndex === year)?.rate || 1;
      return revenueItems.reduce((sum, item) => {
        // 计算基础含税收入
        let baseRevenue = 0;
        switch (item.fieldTemplate) {
          case 'quantity-price':
            baseRevenue = (item.quantity || 0) * (item.unitPrice || 0);
            break;
          case 'area-yield-price':
            baseRevenue = (item.area || 0) * (item.yieldPerArea || 0) * (item.unitPrice || 0);
            break;
          case 'capacity-utilization':
            baseRevenue = (item.capacity || 0) * (item.utilizationRate || 0) * (item.unitPrice || 0);
            break;
          case 'subscription':
            baseRevenue = (item.subscriptions || 0) * (item.unitPrice || 0);
            break;
          case 'direct-amount':
            baseRevenue = item.directAmount || 0;
            break;
        }
        
        // 应用涨价规则
        if (item.priceIncreaseInterval && item.priceIncreaseInterval > 0 && item.priceIncreaseRate && item.priceIncreaseRate > 0) {
          const priceRoundIndex = Math.floor((year - 1) / item.priceIncreaseInterval);
          const priceMultiplier = Math.pow(1 + item.priceIncreaseRate / 100, priceRoundIndex);
          baseRevenue = baseRevenue * priceMultiplier;
        }
        
        // 应用达产率
        return sum + baseRevenue * productionRate;
      }, 0);
    } else {
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
  
  // 计算补贴收入的函数
  const calculateSubsidyIncome = (year?: number): number => {
    // 目前没有补贴收入的数据，返回0
    return 0;
  };
  
  // 计算回收固定资产余值的函数
  const calculateFixedAssetResidual = (year?: number): number => {
    if (!context) return 0;
    
    // 只在运营期最后一年回收
    if (year !== undefined && year === context.operationYears) {
      // 计算固定资产余值 = 建安费原值 × 残值率 + 设备原值 × 残值率
      // 这里使用默认残值率5%，实际应该从配置中获取
      const constructionResidualRate = 0.05;
      const equipmentResidualRate = 0.05;
      
      // 从折旧数据中获取原值
      const rowA = depreciationData.find(row => row.序号 === 'A');
      const rowD = depreciationData.find(row => row.序号 === 'D');
      
      const constructionOriginalValue = rowA?.原值 || 0;
      const equipmentOriginalValue = rowD?.原值 || 0;
      
      return constructionOriginalValue * constructionResidualRate + equipmentOriginalValue * equipmentResidualRate;
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
    if (!context) return 0;
    
    if (year !== undefined) {
      // 建设投资只在建设期有数据
      if (year <= context.constructionYears) {
        // 这里应该从投资估算数据中获取，目前返回0
        return 0;
      }
      return 0;
    }
    
    if (year === undefined) {
      // 建设投资合计
      let totalSum = 0;
      for (let y = 1; y <= context.constructionYears; y++) {
        totalSum += calculateConstructionInvestment(y);
      }
      return totalSum;
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
  const calculateOperatingCost = (year?: number): number => {
    if (year !== undefined) {
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
      
      return rawMaterialsCost + fuelPowerCost + wagesCost + repairCost + otherExpensesCost;
    } else {
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
  
  // 计算增值税、房产税等及附加的函数
  const calculateVatAndTaxes = (year?: number): number => {
    if (year !== undefined) {
      // 计算指定年份的增值税、房产税等及附加
      // 这里应该根据实际税率计算，目前返回0
      return 0;
    } else {
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
      // 计算指定年份的调整所得税
      // 这里应该根据实际税率计算，目前返回0
      return 0;
    } else {
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

    // 1. 现金流入
    const row1: any = { '序号': '1', '项目': '现金流入' };
    let totalRow1 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year <= constructionYears) {
        // 建设期没有现金流入
        yearTotal = 0;
      } else {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateOperatingRevenue(operationYear) +
                   calculateSubsidyIncome(operationYear) +
                   calculateFixedAssetResidual(operationYear) +
                   calculateWorkingCapitalRecovery(operationYear);
      }
      
      row1[`${year}`] = yearTotal;
      totalRow1 += yearTotal;
    });
    row1['合计'] = totalRow1;
    excelData.push(row1);

    // 1.1 营业收入
    const row1_1: any = { '序号': '1.1', '项目': '营业收入' };
    let totalRow1_1 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateOperatingRevenue(operationYear);
      }
      
      row1_1[`${year}`] = yearTotal;
      totalRow1_1 += yearTotal;
    });
    row1_1['合计'] = totalRow1_1;
    excelData.push(row1_1);

    // 1.2 补贴收入
    const row1_2: any = { '序号': '1.2', '项目': '补贴收入' };
    let totalRow1_2 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateSubsidyIncome(operationYear);
      }
      
      row1_2[`${year}`] = yearTotal;
      totalRow1_2 += yearTotal;
    });
    row1_2['合计'] = totalRow1_2;
    excelData.push(row1_2);

    // 1.3 回收固定资产余值
    const row1_3: any = { '序号': '1.3', '项目': '回收固定资产余值' };
    let totalRow1_3 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateFixedAssetResidual(operationYear);
      }
      
      row1_3[`${year}`] = yearTotal;
      totalRow1_3 += yearTotal;
    });
    row1_3['合计'] = totalRow1_3;
    excelData.push(row1_3);

    // 1.4 回收流动资金
    const row1_4: any = { '序号': '1.4', '项目': '回收流动资金' };
    let totalRow1_4 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateWorkingCapitalRecovery(operationYear);
      }
      
      row1_4[`${year}`] = yearTotal;
      totalRow1_4 += yearTotal;
    });
    row1_4['合计'] = totalRow1_4;
    excelData.push(row1_4);

    // 2. 现金流出
    const row2: any = { '序号': '2', '项目': '现金流出' };
    let totalRow2 = 0;
    years.forEach((year) => {
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
      
      row2[`${year}`] = yearTotal;
      totalRow2 += yearTotal;
    });
    row2['合计'] = totalRow2;
    excelData.push(row2);

    // 2.1 建设投资
    const row2_1: any = { '序号': '2.1', '项目': '建设投资' };
    let totalRow2_1 = 0;
    years.forEach((year) => {
      const yearTotal = calculateConstructionInvestment(year);
      row2_1[`${year}`] = yearTotal;
      totalRow2_1 += yearTotal;
    });
    row2_1['合计'] = totalRow2_1;
    excelData.push(row2_1);

    // 2.2 流动资金
    const row2_2: any = { '序号': '2.2', '项目': '流动资金' };
    let totalRow2_2 = 0;
    years.forEach((year) => {
      const yearTotal = calculateWorkingCapital(year);
      row2_2[`${year}`] = yearTotal;
      totalRow2_2 += yearTotal;
    });
    row2_2['合计'] = totalRow2_2;
    excelData.push(row2_2);

    // 2.3 经营成本
    const row2_3: any = { '序号': '2.3', '项目': '经营成本' };
    let totalRow2_3 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateOperatingCost(operationYear);
      }
      
      row2_3[`${year}`] = yearTotal;
      totalRow2_3 += yearTotal;
    });
    row2_3['合计'] = totalRow2_3;
    excelData.push(row2_3);

    // 2.4 增值税、房产税等及附加
    const row2_4: any = { '序号': '2.4', '项目': '增值税、房产税等及附加' };
    let totalRow2_4 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateVatAndTaxes(operationYear);
      }
      
      row2_4[`${year}`] = yearTotal;
      totalRow2_4 += yearTotal;
    });
    row2_4['合计'] = totalRow2_4;
    excelData.push(row2_4);

    // 2.5 维持运营投资
    const row2_5: any = { '序号': '2.5', '项目': '维持运营投资' };
    let totalRow2_5 = 0;
    years.forEach((year) => {
      let yearTotal = 0;
      
      if (year > constructionYears) {
        // 运营期
        const operationYear = year - constructionYears;
        yearTotal = calculateMaintenanceInvestment(operationYear);
      }
      
      row2_5[`${year}`] = yearTotal;
      totalRow2_5 += yearTotal;
    });
    row2_5['合计'] = totalRow2_5;
    excelData.push(row2_5);

    // 3. 所得税前净现金流量（1-2）
    const row3: any = { '序号': '3', '项目': '所得税前净现金流量（1-2）' };
    let totalRow3 = 0;
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
      
      row3[`${year}`] = yearTotal;
      totalRow3 += yearTotal;
    });
    row3['合计'] = totalRow3;
    excelData.push(row3);

    // 4. 累计所得税前净现金流量
    const row4: any = { '序号': '4', '项目': '累计所得税前净现金流量' };
    let cumulativeCashFlow = 0;
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
      
      cumulativeCashFlow += yearTotal;
      row4[`${year}`] = cumulativeCashFlow;
    });
    row4['合计'] = cumulativeCashFlow;
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

    // 6. 所得税后净现金流量
    const row6: any = { '序号': '6', '项目': '所得税后净现金流量' };
    let totalRow6 = 0;
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
        const yearInflow = calculateOperatingRevenue(operationYear) +
                          calculateSubsidyIncome(operationYear) +
                          calculateFixedAssetResidual(operationYear) +
                          calculateWorkingCapitalRecovery(operationYear);
        const yearOutflow = calculateConstructionInvestment(year) +
                          calculateWorkingCapital(year) +
                          calculateOperatingCost(operationYear) +
                          calculateVatAndTaxes(operationYear) +
                          calculateMaintenanceInvestment(operationYear) +
                          calculateAdjustedIncomeTax(operationYear);
        yearTotal = yearInflow - yearOutflow;
      }
      
      row6[`${year}`] = yearTotal;
      totalRow6 += yearTotal;
    });
    row6['合计'] = totalRow6;
    excelData.push(row6);

    // 7. 累计所得税后净现金流量
    const row7: any = { '序号': '7', '项目': '累计所得税后净现金流量' };
    cumulativeCashFlow = 0;
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
        const yearInflow = calculateOperatingRevenue(operationYear) +
                          calculateSubsidyIncome(operationYear) +
                          calculateFixedAssetResidual(operationYear) +
                          calculateWorkingCapitalRecovery(operationYear);
        const yearOutflow = calculateConstructionInvestment(year) +
                          calculateWorkingCapital(year) +
                          calculateOperatingCost(operationYear) +
                          calculateVatAndTaxes(operationYear) +
                          calculateMaintenanceInvestment(operationYear) +
                          calculateAdjustedIncomeTax(operationYear);
        yearTotal = yearInflow - yearOutflow;
      }
      
      cumulativeCashFlow += yearTotal;
      row7[`${year}`] = cumulativeCashFlow;
    });
    row7['合计'] = cumulativeCashFlow;
    excelData.push(row7);

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

  // 渲染项目投资现金流量表格
  const renderProfitTaxModal = () => {
    if (!context) return <Text c="red">项目上下文未加载</Text>

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const years = Array.from({ length: totalYears }, (_, i) => i + 1);

    return (
      <>
        <Table striped withTableBorder style={{ fontSize: '11px' }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>项目</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
              <Table.Th colSpan={constructionYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>建设期</Table.Th>
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
            {/* 1. 现金流入 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>现金流入</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 现金流入合计 = 运营期各年数值的总和
                  let totalSum = 0;
                  years.forEach((year) => {
                    if (year > constructionYears) {
                      // 运营期
                      const operationYear = year - constructionYears;
                      totalSum += calculateOperatingRevenue(operationYear) + 
                                 calculateSubsidyIncome(operationYear) + 
                                 calculateFixedAssetResidual(operationYear) + 
                                 calculateWorkingCapitalRecovery(operationYear);
                    }
                  });
                  return formatNumberNoRounding(totalSum);
                })()}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year <= constructionYears) {
                  // 建设期没有现金流入
                  yearTotal = 0;
                } else {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateOperatingRevenue(operationYear) + 
                             calculateSubsidyIncome(operationYear) + 
                             calculateFixedAssetResidual(operationYear) + 
                             calculateWorkingCapitalRecovery(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.1 营业收入 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>营业收入</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateOperatingRevenue(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateOperatingRevenue(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.2 补贴收入 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.2</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>补贴收入</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateSubsidyIncome(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateSubsidyIncome(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.3 回收固定资产余值 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.3</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>回收固定资产余值</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateFixedAssetResidual(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateFixedAssetResidual(operationYear);
                }
                
                return (
                  <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(yearTotal)}
                  </Table.Td>
                );
              })}
            </Table.Tr>
            
            {/* 1.4 回收流动资金 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.4</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>回收流动资金</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {formatNumberNoRounding(calculateWorkingCapitalRecovery(undefined))}
              </Table.Td>
              {years.map((year) => {
                let yearTotal = 0;
                
                if (year > constructionYears) {
                  // 运营期
                  const operationYear = year - constructionYears;
                  yearTotal = calculateWorkingCapitalRecovery(operationYear);
                }
                
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
            
            {/* 2.3 经营成本 */}
            <Table.Tr>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2.3</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>经营成本</Table.Td>
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
                  
                  return formatNumberNoRounding(totalInflow - totalOutflow);
                })()}
              </Table.Td>
              {years.map((year) => {
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 累计所得税前净现金流量合计 = 最后一年累计值
                  let cumulativeCashFlow = 0;
                  
                  years.forEach((year) => {
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
                    
                    cumulativeCashFlow += yearInflow - yearOutflow;
                  });
                  
                  return formatNumberNoRounding(cumulativeCashFlow);
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
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
              <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                {(() => {
                  // 累计所得税后净现金流量合计 = 最后一年累计值
                  let cumulativeCashFlow = 0;
                  
                  years.forEach((year) => {
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
                    
                    cumulativeCashFlow += yearInflow - yearOutflow - yearTax;
                  });
                  
                  return formatNumberNoRounding(cumulativeCashFlow);
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
                  
                  cumulativeCashFlow += yearInflow - yearOutflow - yearTax;
                  
                  return (
                    <Table.Td key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {formatNumberWithZeroBlank(cumulativeCashFlow)}
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

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="md" fw={600} c="#1D2129">
            项目投资现金流量配置
          </Text>
          <Group gap="xs">
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
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 项目投资现金流量表
            </Text>
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
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
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
        title={
          <Text size="md">
            📊 利润与利润分配表
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
        <Stack gap="md" align="center">
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: '#F7F8FA',
            borderRadius: '8px'
          }}>
            <IconChartLine size={48} color="#00C48C" />
            <Text size="sm" c="#86909C" mt="md">
              利润与利润分配表功能开发中
            </Text>
          </div>
          <Button onClick={() => setShowProfitDistributionModal(false)}>
            关闭
          </Button>
        </Stack>
      </Modal>

      {/* 财务计算指标表弹窗 */}
      <Modal
        opened={showFinancialIndicatorsModal}
        onClose={() => setShowFinancialIndicatorsModal(false)}
        title={
          <Text size="md">
            📊 财务计算指标表
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
        <Stack gap="md" align="center">
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: '#F7F8FA',
            borderRadius: '8px'
          }}>
            <IconCalculator size={48} color="#9254DE" />
            <Text size="sm" c="#86909C" mt="md">
              财务计算指标表功能开发中
            </Text>
          </div>
          <Button onClick={() => setShowFinancialIndicatorsModal(false)}>
            关闭
          </Button>
        </Stack>
      </Modal>
    </>
  )
}

export default FinancialIndicatorsTable
