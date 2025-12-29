import React, { useMemo, useEffect } from 'react'
import {
  Card,
  Stack,
  Text,
  Title,
  Button,
  Group,
  Table,
  ActionIcon,
  Tooltip,
  NumberInput,
  Select,
  SimpleGrid,
} from '@mantine/core'
import {
  IconDownload,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, LoanConfig, LoanRepaymentTableData } from '@/stores/revenueCostStore'
import * as XLSX from 'xlsx'

// 格式化数字显示为2位小数，不四舍五入，无千分号
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
 * 借款还本付息计划表组件
 */
interface LoanRepaymentScheduleTableProps {
  showCard?: boolean;
  estimate?: any; // 投资估算数据，包含建设期利息信息
  depreciationData?: any[]; // 折旧摊销估算表数据
}

const LoanRepaymentScheduleTable: React.FC<LoanRepaymentScheduleTableProps> = ({ 
  showCard = true, 
  estimate,
  depreciationData 
}) => {
  // 调试：检查接收到的 estimate 数据
  console.log('LoanRepaymentScheduleTable - estimate:', estimate);
  console.log('LoanRepaymentScheduleTable - estimate.partF:', estimate?.partF);
  console.log('LoanRepaymentScheduleTable - estimate.partF.分年利息:', estimate?.partF?.分年利息);

  const {
    context,
    loanConfig,
    profitDistributionTableData,
    setLoanConfig,
    updateLoanConfig,
    setLoanRepaymentTableData
  } = useRevenueCostStore()
  

  // 从投资估算数据中读取已保存的贷款相关数据
  const getLoanDataFromEstimate = useMemo(() => {
    if (!estimate) {
      return {
        constructionInterestDetails: null,
        loanRepaymentScheduleSimple: null
      };
    }

    // 声明变量
    let constructionInterestDetails: any = null;
    let loanRepaymentScheduleSimple: any = null;

    // 如果数据库中已保存建设期利息详情，优先使用
    if (estimate.construction_interest_details) {
      if (typeof estimate.construction_interest_details === 'string') {
        try {
          constructionInterestDetails = JSON.parse(estimate.construction_interest_details);
        } catch (e) {
          console.warn('解析建设期利息详情失败:', e);
        }
      } else {
        constructionInterestDetails = estimate.construction_interest_details;
      }
    }

    // 如果数据库中已保存还本付息计划简表，优先使用
    if (estimate.loan_repayment_schedule_simple) {
      if (typeof estimate.loan_repayment_schedule_simple === 'string') {
        try {
          loanRepaymentScheduleSimple = JSON.parse(estimate.loan_repayment_schedule_simple);
        } catch (e) {
          console.warn('解析还本付息计划简表失败:', e);
        }
      } else {
        loanRepaymentScheduleSimple = estimate.loan_repayment_schedule_simple;
      }
    }

    return {
      constructionInterestDetails,
      loanRepaymentScheduleSimple
    };
  }, [estimate]);

  // 计算借款还本付息计划表数据
  const calculateLoanRepaymentData = useMemo(() => {
    if (!context) return null;

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;

    // 初始化建设期和运营期数组
    const constructionPeriod = Array(constructionYears).fill(0);
    const operationPeriod = Array(operationYears).fill(0);

    // 优先使用数据库中保存的数据，如果没有则从 estimate.partF 计算
    const savedLoanData = getLoanDataFromEstimate;
    const yearlyInterestData = savedLoanData.constructionInterestDetails?.分年数据 || estimate?.partF?.分年利息 || [];
    
    // 计算某年期末借款余额（累计借款金额）
    const calculateEndOfYearBalance = (yearIndex: number): number => {
      let balance = 0;
      for (let i = 0; i <= yearIndex; i++) {
        if (yearlyInterestData[i]) {
          balance += yearlyInterestData[i].当期借款金额 || 0;
        }
      }
      return balance;
    };

    // 计算某年期初借款余额
    const calculateBeginningOfYearBalance = (yearIndex: number): number => {
      if (yearIndex === 0) return 0;
      return calculateEndOfYearBalance(yearIndex - 1);
    };

    // 计算建设期各年数据
    // 建设期期初借款余额
    const constructionBeginningBalance = Array(constructionYears).fill(0).map((_, index) =>
      calculateBeginningOfYearBalance(index)
    );

    // 建设期当期借款金额
    const constructionLoanAmount = Array(constructionYears).fill(0).map((_, index) =>
      yearlyInterestData[index]?.当期借款金额 || 0
    );

    // 建设期当期利息
    const constructionInterest = Array(constructionYears).fill(0).map((_, index) =>
      yearlyInterestData[index]?.当期利息 || 0
    );

    // 建设期期末借款余额（累计借款金额）
    const constructionEndingBalance = Array(constructionYears).fill(0).map((_, index) =>
      calculateEndOfYearBalance(index)
    );

    // 建设期当期还本付息（建设期只付息，不还本）
    const constructionRepayment = Array(constructionYears).fill(0).map((_, index) =>
      yearlyInterestData[index]?.当期利息 || 0
    );

    // 建设期还本（建设期为0）
    const constructionPrincipalRepayment = Array(constructionYears).fill(0);

    // 建设期付息
    const constructionInterestPayment = Array(constructionYears).fill(0).map((_, index) =>
      yearlyInterestData[index]?.当期利息 || 0
    );

    // 计算运营期还款数据
    // 优先从数据库读取运营期数据，如果没有则计算
    let yearlyPrincipal: number[] = Array(operationYears).fill(0);
    let yearlyInterest: number[] = Array(operationYears).fill(0);
    let yearlyPayment: number[] = Array(operationYears).fill(0);
    let beginningBalance: number[] = Array(operationYears).fill(0);
    let endingBalance: number[] = Array(operationYears).fill(0);

    // 检查数据库中是否已保存运营期数据
    if (savedLoanData.loanRepaymentScheduleSimple?.还款计划) {
      console.log('✅ 从数据库读取运营期还款数据');
      const savedSchedule = savedLoanData.loanRepaymentScheduleSimple.还款计划;
      
      // 从数据库读取运营期数据
      savedSchedule.forEach((yearData: any) => {
        const yearIndex = yearData.年份 - 1;
        if (yearIndex >= 0 && yearIndex < operationYears) {
          yearlyPrincipal[yearIndex] = yearData.当期还本 || 0;
          yearlyInterest[yearIndex] = yearData.当期付息 || 0;
          yearlyPayment[yearIndex] = yearData.当期还本付息 || 0;
          beginningBalance[yearIndex] = yearData.期初借款余额 || 0;
          endingBalance[yearIndex] = yearData.期末借款余额 || 0;
        }
      });
    } else {
      console.log('⚠️ 数据库中无运营期数据，使用计算值');
      // 获取贷款总额和利率
      const loanAmount = estimate?.partF?.贷款总额 || loanConfig.loanAmount;
      const interestRate = estimate?.partF?.年利率 || loanConfig.interestRate;
      
      // 计算等额本息还款
      const monthlyRate = interestRate / 100 / 12;
      const totalMonths = loanConfig.loanTerm * 12;
      const monthlyPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

      let remainingPrincipal = loanAmount;
      let currentYear = 1;

      for (let month = 1; month <= totalMonths && currentYear <= operationYears; month++) {
        const interestPayment = remainingPrincipal * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        
        yearlyInterest[currentYear - 1] += interestPayment;
        yearlyPrincipal[currentYear - 1] += principalPayment;
        yearlyPayment[currentYear - 1] += monthlyPayment;
        
        remainingPrincipal -= principalPayment;
        
        // 每12个月进入下一年
        if (month % 12 === 0) {
          currentYear++;
        }
      }

      // 计算期初和期末借款余额
      let balance = loanAmount;
      for (let year = 1; year <= operationYears; year++) {
        beginningBalance[year - 1] = balance;
        balance -= yearlyPrincipal[year - 1];
        endingBalance[year - 1] = Math.max(0, balance);
      }
    }

    // 计算还本付息资金来源
    // 2.1 折旧摊销费（从折旧摊销估算表获取真实数据）
    const depreciationAmortization = Array(operationYears).fill(0).map((_, index) => {
      // 从传入的折旧数据中获取A、D、E行的分年数据
      let depreciationAmount = 0;
      
      // A行：建筑物、构筑物折旧
      const rowA = depreciationData?.find((row: any) => row.序号 === 'A');
      if (rowA && rowA.分年数据 && rowA.分年数据[index] !== undefined) {
        depreciationAmount += rowA.分年数据[index];
      }
      
      // D行：机器设备折旧
      const rowD = depreciationData?.find((row: any) => row.序号 === 'D');
      if (rowD && rowD.分年数据 && rowD.分年数据[index] !== undefined) {
        depreciationAmount += rowD.分年数据[index];
      }
      
      // E行：无形资产摊销
      const rowE = depreciationData?.find((row: any) => row.序号 === 'E');
      if (rowE && rowE.分年数据 && rowE.分年数据[index] !== undefined) {
        depreciationAmount += rowE.分年数据[index];
      }
      
      return depreciationAmount;
    });

    // 2.2 利润（从利润与利润分配表获取）
    const profit = Array(operationYears).fill(0);
    if (profitDistributionTableData && profitDistributionTableData.rows) {
      for (let year = 1; year <= operationYears; year++) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '9'); // 净利润
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          profit[year - 1] = row.运营期[year - 1];
        }
      }
    }

    // 2.3 息税前利润（从利润与利润分配表获取）
    const ebit = Array(operationYears).fill(0);
    if (profitDistributionTableData && profitDistributionTableData.rows) {
      for (let year = 1; year <= operationYears; year++) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '19'); // 息税前利润
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          ebit[year - 1] = row.运营期[year - 1];
        }
      }
    }

    // 2.4 其他还利息资金（建设期引用付息数据，运营期为0）
    const otherInterestFunds = Array(operationYears).fill(0); // 运营期为0
    const otherInterestFundsConstruction = constructionInterestPayment; // 建设期引用付息数据

    // 计算指标
    // 3.1 息税折旧摊销前利润
    const ebitda = Array(operationYears).fill(0);
    for (let year = 1; year <= operationYears; year++) {
      ebitda[year - 1] = ebit[year - 1] + depreciationAmortization[year - 1];
    }

    // 3.2 所得税（从利润与利润分配表获取）
    const incomeTax = Array(operationYears).fill(0);
    if (profitDistributionTableData && profitDistributionTableData.rows) {
      for (let year = 1; year <= operationYears; year++) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '8'); // 所得税
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          incomeTax[year - 1] = row.运营期[year - 1];
        }
      }
    }

    // 3.3 还利息及担保费
    const interestAndGuaranteeFee = yearlyInterest;

    // 3.4 还本金
    const principalRepayment = yearlyPrincipal;

    // 3.5 利息备付率 = 息税前利润 / 还利息及担保费
    const interestCoverageRatio = Array(operationYears).fill(0);
    for (let year = 1; year <= operationYears; year++) {
      if (interestAndGuaranteeFee[year - 1] > 0) {
        interestCoverageRatio[year - 1] = ebit[year - 1] / interestAndGuaranteeFee[year - 1];
      }
    }

    // 3.6 偿债备付率 = (息税折旧摊销前利润 - 所得税) / (还利息及担保费 + 还本金)
    const debtServiceCoverageRatio = Array(operationYears).fill(0);
    for (let year = 1; year <= operationYears; year++) {
      const denominator = interestAndGuaranteeFee[year - 1] + principalRepayment[year - 1];
      if (denominator > 0) {
        debtServiceCoverageRatio[year - 1] = (ebitda[year - 1] - incomeTax[year - 1]) / denominator;
      }
    }

    // 计算某行所有年份的合计值
    const calculateRowTotal = (constructionPeriod: number[], operationPeriod: number[]): number => {
      const constructionTotal = constructionPeriod.reduce((sum, value) => sum + (value || 0), 0);
      const operationTotal = operationPeriod.reduce((sum, value) => sum + (value || 0), 0);
      return constructionTotal + operationTotal;
    };

    // 计算需要的合计值
    const ebitTotal = calculateRowTotal(constructionPeriod, ebit);
    const interestTotal = calculateRowTotal(constructionPeriod, interestAndGuaranteeFee);
    const interestCoverageRatioTotal = interestTotal > 0 ? ebitTotal / interestTotal : 0;
    
    // 计算偿债备付率需要的合计值
    const otherInterestFundsTotal = calculateRowTotal(otherInterestFundsConstruction, otherInterestFunds);
    const ebitdaTotal = calculateRowTotal(constructionPeriod, ebitda);
    const incomeTaxTotal = calculateRowTotal(constructionPeriod, incomeTax);
    const repaymentTotal = calculateRowTotal(constructionRepayment, yearlyPayment);
    const debtServiceCoverageRatioTotal = repaymentTotal > 0 ? 
      (otherInterestFundsTotal + ebitdaTotal - incomeTaxTotal) / repaymentTotal : 0;

    // 构建表格数据
    // 确保"1 借款还本付息计划"行的运营期数据正确填充
    // 从数据库读取的运营期数据应该填充到该行的运营期列
    const loanRepaymentOperationPeriod = savedLoanData.loanRepaymentScheduleSimple?.还款计划
      ? Array(operationYears).fill(0).map((_, index) => {
          const yearData = savedLoanData.loanRepaymentScheduleSimple.还款计划.find((y: any) => y.年份 === index + 1);
          return yearData?.当期还本付息 || 0;
        })
      : operationPeriod;

    // 分类标题行的建设期和运营期数据置为空（序号为自然数"1"、"2"、"3"的行）
    const emptyConstructionPeriod = Array(constructionYears).fill(0);
    const emptyOperationPeriod = Array(operationYears).fill(0);

    const tableData: LoanRepaymentTableData = {
      rows: [
        // 1 借款还本付息计划（分类标题行，建设期和运营期为空）
        {
          序号: '1',
          项目: '借款还本付息计划',
          合计: null,
          建设期: emptyConstructionPeriod,
          运营期: emptyOperationPeriod
        },
        // 1.1 期初借款余额
        {
          序号: '1.1',
          项目: '期初借款余额',
          合计: null,
          建设期: constructionBeginningBalance,
          运营期: beginningBalance
        },
        // 1.2 当期还本付息
        {
          序号: '1.2',
          项目: '当期还本付息',
          合计: calculateRowTotal(constructionRepayment, yearlyPayment),
          建设期: constructionRepayment,
          运营期: yearlyPayment
        },
        // 其中：还本
        {
          序号: '',
          项目: '其中：还本',
          合计: Math.round(calculateRowTotal(constructionPrincipalRepayment, yearlyPrincipal)),
          建设期: constructionPrincipalRepayment,
          运营期: yearlyPrincipal
        },
        // 付息
        {
          序号: '',
          项目: '付息',
          合计: calculateRowTotal(constructionInterestPayment, yearlyInterest),
          建设期: constructionInterestPayment,
          运营期: yearlyInterest
        },
        // 1.3 期末借款余额
        {
          序号: '1.3',
          项目: '期末借款余额',
          合计: null,
          建设期: constructionEndingBalance,
          运营期: endingBalance
        },
        // 2 还本付息资金来源（分类标题行，建设期和运营期为空）
        {
          序号: '2',
          项目: '还本付息资金来源',
          合计: null,
          建设期: emptyConstructionPeriod,
          运营期: emptyOperationPeriod
        },
        // 2.1 折旧摊销费
        {
          序号: '2.1',
          项目: '折旧摊销费',
          合计: calculateRowTotal(constructionPeriod, depreciationAmortization),
          建设期: constructionPeriod,
          运营期: depreciationAmortization
        },
        // 2.2 所得税
        {
          序号: '2.2',
          项目: '所得税',
          合计: calculateRowTotal(constructionPeriod, incomeTax),
          建设期: constructionPeriod,
          运营期: incomeTax
        },
        // 2.3 息税前利润
        {
          序号: '2.3',
          项目: '息税前利润',
          合计: calculateRowTotal(constructionPeriod, ebit),
          建设期: constructionPeriod,
          运营期: ebit
        },
        // 2.4 其他还利息资金
        {
          序号: '2.4',
          项目: '其他还利息资金',
          合计: calculateRowTotal(otherInterestFundsConstruction, otherInterestFunds),
          建设期: otherInterestFundsConstruction,
          运营期: otherInterestFunds
        },
        // 3 计算指标（分类标题行，建设期和运营期为空）
        {
          序号: '3',
          项目: '计算指标',
          合计: null,
          建设期: emptyConstructionPeriod,
          运营期: emptyOperationPeriod
        },
        // 3.1 息税折旧摊销前利润
        {
          序号: '3.1',
          项目: '息税折旧摊销前利润',
          合计: calculateRowTotal(constructionPeriod, ebitda),
          建设期: constructionPeriod,
          运营期: ebitda
        },
        // 3.2 还利息
        {
          序号: '3.2',
          项目: '还利息',
          合计: calculateRowTotal(constructionInterestPayment, interestAndGuaranteeFee),
          建设期: constructionInterestPayment,
          运营期: interestAndGuaranteeFee
        },
        // 3.3 还本金
        {
          序号: '3.3',
          项目: '还本金',
          合计: Math.round(calculateRowTotal(constructionPeriod, principalRepayment)),
          建设期: constructionPeriod,
          运营期: principalRepayment
        },
        // 3.4 利息备付率
        {
          序号: '3.4',
          项目: '利息备付率',
          合计: interestCoverageRatioTotal,
          建设期: constructionPeriod,
          运营期: interestCoverageRatio
        },
        // 3.5 偿债备付率
        {
          序号: '3.5',
          项目: '偿债备付率',
          合计: debtServiceCoverageRatioTotal,
          建设期: constructionPeriod,
          运营期: debtServiceCoverageRatio
        }
      ],
      updatedAt: new Date().toISOString()
    };

    return tableData;
  }, [context, loanConfig, profitDistributionTableData, estimate, depreciationData]);

  // 保存借款还本付息计划表数据
  useEffect(() => {
    if (calculateLoanRepaymentData) {
      setLoanRepaymentTableData(calculateLoanRepaymentData);
    }
  }, [calculateLoanRepaymentData, setLoanRepaymentTableData]);


  // 导出Excel
  const handleExportExcel = () => {
    if (!context || !calculateLoanRepaymentData) {
      notifications.show({
        title: '导出失败',
        message: '数据未加载完成',
        color: 'red',
      });
      return;
    }

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;

    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // 设置列宽
    const colWidths = [
      { wch: 8 },   // 序号
      { wch: 25 },  // 项目
      { wch: 15 },  // 合计
      ...Array(totalYears).fill({ wch: 12 }) // 各年份
    ];
    ws['!cols'] = colWidths;

    // 第一行表头
    const header1 = [
      '序号',
      '项目',
      '合计',
      ...Array(constructionYears).fill('建设期'),
      ...Array(operationYears).fill('运营期')
    ];
    XLSX.utils.sheet_add_aoa(ws, [header1], { origin: 'A1' });

    // 第二行表头（年份）
    const header2 = ['', '', ''];
    for (let i = 1; i <= totalYears; i++) {
      header2.push(i.toString());
    }
    XLSX.utils.sheet_add_aoa(ws, [header2], { origin: 'A2' });

    // 合并表头单元格
    // 合并"建设期"和"运营期"的跨列单元格
    if (constructionYears > 0) {
      ws['!merges'] = ws['!merges'] || [];
      ws['!merges'].push({ s: { r: 0, c: 3 }, e: { r: 0, c: 3 + constructionYears - 1 } }); // 建设期
    }
    if (operationYears > 0) {
      ws['!merges'] = ws['!merges'] || [];
      ws['!merges'].push({ s: { r: 0, c: 3 + constructionYears }, e: { r: 0, c: 3 + constructionYears + operationYears - 1 } }); // 运营期
    }

    // 添加数据行
    let currentRow = 3; // 从第3行开始
    calculateLoanRepaymentData.rows.forEach((row) => {
      const isCategoryRow = /^\d+$/.test(row.序号) && row.序号 !== '';
      
      const dataRow = [
        row.序号,
        row.项目,
        row.合计 !== null ? row.合计 : '', // 直接使用原始数值，不格式化
        ...row.建设期.map(value => value === 0 ? '' : value), // 直接使用原始数值，只对0显示空白
        ...row.运营期.map(value => value === 0 ? '' : value) // 直接使用原始数值，只对0显示空白
      ];
      
      XLSX.utils.sheet_add_aoa(ws, [dataRow], { origin: `A${currentRow}` });
      
      // 设置分类标题行的样式（加粗）
      if (isCategoryRow) {
        for (let col = 0; col < dataRow.length; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow - 1, c: col });
          if (!ws[cellAddress]) continue;
          
          ws[cellAddress].s = {
            font: { bold: true },
            alignment: { vertical: 'center', horizontal: 'center' }
          };
        }
      }
      
      // 设置数字列的对齐方式（居中）
      for (let col = 0; col < dataRow.length; col++) {
        if (col === 0 || col === 2 || col >= 3) { // 序号、合计、各年份列
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow - 1, c: col });
          if (!ws[cellAddress]) continue;
          
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          ws[cellAddress].s.alignment = { vertical: 'center', horizontal: 'center' };
        }
      }
      
      currentRow++;
    });

    // 设置表头样式
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3 + totalYears; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        ws[cellAddress].s = {
          font: { bold: true },
          alignment: { vertical: 'center', horizontal: 'center' },
          fill: { fgColor: { rgb: 'F7F8FA' } }
        };
      }
    }

    // 添加边框样式
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        if (!ws[cellAddress].s) {
          ws[cellAddress].s = {};
        }
        ws[cellAddress].s.border = {
          top: { style: 'thin', color: { auto: 1 } },
          bottom: { style: 'thin', color: { auto: 1 } },
          left: { style: 'thin', color: { auto: 1 } },
          right: { style: 'thin', color: { auto: 1 } }
        };
      }
    }

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '借款还本付息计划表');

    // 导出文件
    XLSX.writeFile(wb, `借款还本付息计划表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '借款还本付息计划表已导出为Excel文件',
      color: 'green',
    });
  };

  // 渲染表格内容
  const renderTable = () => {
    if (!context || !calculateLoanRepaymentData) {
      return <Text c="red">项目上下文未加载</Text>;
    }

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const years = Array.from({ length: totalYears }, (_, i) => i + 1);

    return (
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
              <Table.Th key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {year}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {calculateLoanRepaymentData.rows.map((row, idx) => {
            // 判断是否为分类标题行（序号为自然数"1"、"2"、"3"）
            const isCategoryRow = /^\d+$/.test(row.序号) && row.序号 !== '';
            
            return (
              <Table.Tr key={idx} style={{ fontWeight: isCategoryRow ? 'bold' : 'normal' }}>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{row.序号}</Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>{row.项目}</Table.Td>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {row.合计 !== null ? formatNumberNoRounding(row.合计) : ''}
                </Table.Td>
                {row.建设期.map((value, index) => (
                  <Table.Td key={`construction-${index}`} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(value)}
                  </Table.Td>
                ))}
                {row.运营期.map((value, index) => (
                  <Table.Td key={`operation-${index}`} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {formatNumberWithZeroBlank(value)}
                  </Table.Td>
                ))}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    );
  };

  const content = (
    <>
      {/* 标题和按钮区域 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        gap: '12px'
      }}>
        {showCard && (
          <Text size="md" fw={600} c="#1D2129">
            📊 借款还本付息计划表
          </Text>
        )}
        <Tooltip label="导出Excel">
          <ActionIcon
            variant="light"
            color="green"
            size="sm"
            onClick={handleExportExcel}
            style={{ 
              visibility: 'visible', 
              display: 'inline-flex',
              opacity: 1,
              backgroundColor: '#e8f5e8',
              border: '1px solid #4caf50'
            }}
          >
            <IconDownload size={14} />
          </ActionIcon>
        </Tooltip>
      </div>

      {renderTable()}

    </>
  );

  if (showCard) {
    return (
      <Card withBorder radius="md">
        {content}
      </Card>
    );
  }

  return content;
};

export default LoanRepaymentScheduleTable;
