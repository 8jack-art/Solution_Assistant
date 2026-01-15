/**
 * 构建借款还本付息计划表 JSON 数据
 */
import { safeParseJSON } from './shared.js'

export function buildLoanRepaymentJSON(loanData: any, context?: any): string {
  if (!loanData) return '{}'
  
  const constructionYears = context?.constructionYears || loanData.partF?.建设期年限 || 2
  const operationYears = context?.operationYears || 10
  const totalYears = constructionYears + operationYears
  
  let totalInterest = 0
  let constructionInterest = 0
  let operationInterest = 0
  
  const repaymentSchedule = loanData.loan_repayment_schedule_simple || 
                            loanData.loan_repayment_schedule_detailed ||
                            loanData.construction_interest_details
  
  if (repaymentSchedule) {
    const scheduleData = safeParseJSON(repaymentSchedule)
    if (scheduleData?.rows && Array.isArray(scheduleData.rows)) {
      scheduleData.rows.forEach((row: any) => {
        const rowTotal = Number(row.合计) || 0
        totalInterest += rowTotal
        
        if (row.建设期 && Array.isArray(row.建设期)) {
          row.建设期.forEach((val: any) => {
            constructionInterest += Number(val) || 0
          })
        }
        if (row.运营期 && Array.isArray(row.运营期)) {
          row.运营期.forEach((val: any) => {
            operationInterest += Number(val) || 0
          })
        }
      })
    }
  } else if (loanData.partF?.分年利息) {
    const yearlyInterest = loanData.partF.分年利息 || []
    for (let i = 0; i < totalYears; i++) {
      const interest = Number(yearlyInterest[i]?.当期利息) || 0
      totalInterest += interest
      if (i < constructionYears) {
        constructionInterest += interest
      } else {
        operationInterest += interest
      }
    }
  }
  
  const jsonData: any = {
    title: '借款还本付息计划表',
    context: {
      constructionYears,
      operationYears,
      totalYears,
      loanAmount: loanData.partF?.贷款总额 || 0,
      annualInterestRate: (loanData.partF?.年利率 || 0) * 100
    },
    yearlyData: [],
    summary: {
      totalInterest: Number(totalInterest.toFixed(2)),
      '项目利息合计（万元）': Number(totalInterest.toFixed(2)),
      '建设期利息（万元）': Number(constructionInterest.toFixed(2)),
      '经营期利息（万元）': Number(operationInterest.toFixed(2)),
      totalRepayment: 0
    }
  }
  
  if (repaymentSchedule) {
    const scheduleData = safeParseJSON(repaymentSchedule)
    if (scheduleData?.rows && Array.isArray(scheduleData.rows)) {
      jsonData.yearlyData = scheduleData.rows.map((row: any) => ({
        序号: row.序号,
        项目: row.项目,
        合计: row.合计,
        建设期: row.建设期 || [],
        运营期: row.运营期 || []
      }))
    }
  } else if (loanData.partF?.分年利息) {
    const yearlyInterest = loanData.partF.分年利息 || []
    for (let i = 0; i < totalYears; i++) {
      const isConstruction = i < constructionYears
      jsonData.yearlyData.push({
        年份: i + 1,
        时期: isConstruction ? '建设期' : '运营期',
        当期借款金额: isConstruction ? (yearlyInterest[i]?.当期借款金额 || 0) : 0,
        当期利息: yearlyInterest[i]?.当期利息 || 0,
        当期付息: yearlyInterest[i]?.当期利息 || 0
      })
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建借款还本付息计划表1.2节JSON数据
 * 简化版本，包含基本信息和利息汇总
 * 
 * 数据来源说明：
 * - 贷款利息总和：从 revenueCost.loanRepaymentTableData 中获取序号3.2"还利息"的合计值
 * - 运营期利息总和 = 贷款利息总和 - 建设期利息总和
 * - 建设期利息总和：从 investment.construction_interest 顶层字段获取
 */
export function buildLoanRepaymentSection12JSON(projectData: any, context?: any): string {
  if (!projectData) return '{}'
  
  // 提取 investment 和 revenueCost 数据
  const investment = projectData.investment || projectData
  const revenueCost = projectData.revenueCost || {}
  
  const constructionYears = context?.constructionYears || investment.partF?.建设期年限 || 
                            projectData.project?.constructionYears || 2
  const operationYears = context?.operationYears || projectData.project?.operationYears || 10
  
  let totalInterest = 0  // 贷款利息总和
  let constructionInterest = 0  // 建设期利息总和
  let operationInterest = 0  // 运营期利息总和
  
  // 1. 从 revenueCost.loanRepaymentTableData 获取序号3.2"还利息"的合计值作为"贷款利息总和"
  const loanRepaymentTableData = revenueCost.loanRepaymentTableData || revenueCost.loanRepaymentTable
  if (loanRepaymentTableData?.rows && Array.isArray(loanRepaymentTableData.rows)) {
    // 查找序号为3.2的行（还利息）
    const row3_2 = loanRepaymentTableData.rows.find((row: any) => row.序号 === '3.2')
    if (row3_2 && row3_2.合计 !== null && row3_2.合计 !== undefined) {
      totalInterest = Number(row3_2.合计) || 0
    }
  }
  
  // 2. 从 investment.construction_interest 顶层字段获取"建设期利息总和"
  if (investment.construction_interest !== undefined) {
    constructionInterest = Number(investment.construction_interest) || 0
  } else if (investment.partF?.合计 !== undefined) {
    // 备用：从 partF.合计 获取建设期利息
    constructionInterest = Number(investment.partF.合计) || 0
  }
  
  // 3. 计算"运营期利息总和" = 贷款利息总和 - 建设期利息总和
  operationInterest = Math.max(0, totalInterest - constructionInterest)
  
  const jsonData: any = {
    title: '借款还本付息计划表',
    basicInfo: {
      贷款总额: investment.partF?.贷款总额 || investment.loan_amount || 
                revenueCost.loanConfig?.loanAmount || 0,
      年利率: String(investment.partF?.年利率 || investment.loan_rate || 
                    revenueCost.loanConfig?.interestRate || 0),
      贷款期限: constructionYears + operationYears,
      建设期年限: constructionYears,
      运营期年限: operationYears
    },
    interestSummary: {
      建设期利息总和: Number(constructionInterest.toFixed(2)),
      运营期利息总和: Number(operationInterest.toFixed(2)),
      贷款利息总和: Number(totalInterest.toFixed(2))
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}
