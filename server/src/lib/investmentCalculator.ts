/**
 * 投资估算计算器
 * 实现统一循环迭代算法，生成符合工程经济学标准的投资估算简表
 */

import { calculateConstructionInterest, type LoanCalculationResult } from './algorithms/loanCalculation.js'
import { calculatePartB, generatePartAItems, type InvestmentItem } from './algorithms/partCalculation.js'
import {
  enforceMinimumShare,
  applyGlobalAdjustment,
  MAX_ITERATIONS,
  GAP_THRESHOLD
} from './algorithms/iterationAdjustment.js'

interface ProjectParams {
  projectName: string
  targetInvestment: number
  constructionYears: number
  operationYears: number
  loanRatio?: number
  loanInterestRate: number
  landCost: number
  aiGeneratedItems?: Array<{
    name: string
    construction_cost: number
    equipment_cost: number
    installation_cost: number
    other_cost: number
    remark?: string
  }>
  customLoanAmount?: number
}

type PartF = LoanCalculationResult

interface InvestmentEstimateResult {
  partA: InvestmentItem
  partB: InvestmentItem
  partC: InvestmentItem
  partD: InvestmentItem
  partE: InvestmentItem
  partF: PartF
  partG: InvestmentItem
  iterationCount: number
  gapRate: number
  thirdLevelItems?: Record<number, any[]> // 三级子项数据，用于保留AI生成的子项信息
}

// 建设期利息迭代常量
const MAX_INTEREST_ITERATIONS = 10
const CONVERGENCE_THRESHOLD = 0.01 // 0.01万元

/**
 * 最终化结果，计算各部分占总投资的比例
 */
function finalizeResult(
  parts: {
    partA: InvestmentItem
    partB: InvestmentItem
    partC: InvestmentItem
    partD: InvestmentItem
    partE: InvestmentItem
    partF: PartF
    partG: InvestmentItem
  },
  iterationCount: number,
  gapRate: number
): InvestmentEstimateResult {
  const totalInvestment = parts.partG.合计 || 0
  if (totalInvestment > 0) {
    parts.partA.占总投资比例 = (parts.partA.合计 / totalInvestment) * 100
    parts.partB.占总投资比例 = (parts.partB.合计 / totalInvestment) * 100
    parts.partC.占总投资比例 = (parts.partC.合计 / totalInvestment) * 100
    parts.partD.占总投资比例 = (parts.partD.合计 / totalInvestment) * 100
    parts.partE.占总投资比例 = (parts.partE.合计 / totalInvestment) * 100
    parts.partF.占总投资比例 = (parts.partF.合计 / totalInvestment) * 100
  }

  return {
    ...parts,
    iterationCount,
    gapRate: gapRate * 100
  }
}

/**
 * 统一循环迭代算法
 * 根据建息算法.md实现迭代收敛机制：
 * - 初始值：项目总资金 = 建设投资
 * - 迭代计算：贷款金额 → 利息 → 新项目总资金
 * - 收敛条件：|新项目总资金 - 旧项目总资金| < 0.01万元
 * - 最大迭代次数：10次（熔断保护）
 */
export function calculateInvestmentEstimate(params: ProjectParams): InvestmentEstimateResult {
  const {
    projectName,
    targetInvestment,
    constructionYears,
    loanRatio,
    loanInterestRate,
    landCost,
    customLoanAmount
  } = params

  let partAItems = generatePartAItems(projectName, targetInvestment, params.aiGeneratedItems)
  enforceMinimumShare(partAItems)

  const adjustmentTrackers = partAItems.map(() => 0)
  let iterationCount = 0
  let gapRate = 1

  let latestSnapshot: {
    partA: InvestmentItem
    partB: InvestmentItem
    partC: InvestmentItem
    partD: InvestmentItem
    partE: InvestmentItem
    partF: PartF
    partG: InvestmentItem
  } | null = null

  let previousTotalFunding = 0
  let currentTotalFunding = 0
  
  // 第一阶段：迭代计算建设期利息和建设单位管理费，直到项目总资金收敛
  for (let interestIter = 0; interestIter < MAX_INTEREST_ITERATIONS; interestIter++) {
    const partATotal = partAItems.reduce((sum, item) => sum + (item.合计 || 0), 0)
    const engineeringCost = partAItems.reduce((sum, item) => sum + ((item.建设工程费 || 0) + (item.安装工程费 || 0)), 0)
    const partA: InvestmentItem = {
      序号: 'A',
      工程或费用名称: '第一部分 工程费用',
      合计: partATotal,
      备注: '实体建设类支出合计',
      children: partAItems
    }

    // 使用上一次迭代的项目总资金来计算建设单位管理费
    const estimatedTotalFunding = previousTotalFunding > 0 ? previousTotalFunding : partATotal * 1.5
    const partB = calculatePartB(partATotal, landCost, estimatedTotalFunding, engineeringCost)
    const partC: InvestmentItem = {
      序号: 'C',
      工程或费用名称: '第一、二部分合计',
      合计: partA.合计 + partB.合计,
      备注: 'C=A+B'
    }
    const partD: InvestmentItem = {
      序号: 'D',
      工程或费用名称: '基本预备费',
      合计: partC.合计 * 0.08,
      备注: '按(A+B)×8%计算'
    }
    const partE: InvestmentItem = {
      序号: 'E',
      工程或费用名称: '建设投资',
      合计: partC.合计 + partD.合计,
      备注: 'E=C+D'
    }
    
    if (interestIter === 0) {
      previousTotalFunding = partE.合计
    }
    
    const partF = calculateConstructionInterest(partE.合计, loanRatio, loanInterestRate, constructionYears, customLoanAmount)
    const partG: InvestmentItem = {
      序号: 'G',
      工程或费用名称: '项目总资金',
      合计: partE.合计 + partF.合计,
      占总投资比例: 100,
      备注: 'G=E+F'
    }
    
    currentTotalFunding = partG.合计
    latestSnapshot = { partA, partB, partC, partD, partE, partF, partG }
    
    const fundingDifference = Math.abs(currentTotalFunding - previousTotalFunding)
    
    if (fundingDifference < CONVERGENCE_THRESHOLD) {
      iterationCount = interestIter + 1
      break
    }
    
    previousTotalFunding = currentTotalFunding
    iterationCount = interestIter + 1
  }

  // 第二阶段：在利息迭代收敛后，再进行目标投资差距的调整迭代
  while (iterationCount < MAX_ITERATIONS) {
    if (!latestSnapshot) break
    
    gapRate = (latestSnapshot.partG.合计 - targetInvestment) / targetInvestment

    if (Math.abs(gapRate) <= GAP_THRESHOLD) {
      return finalizeResult(latestSnapshot, iterationCount, gapRate)
    }

    const direction: 'increase' | 'decrease' = gapRate > 0 ? 'decrease' : 'increase'
    const adjustmentsApplied = applyGlobalAdjustment(partAItems, adjustmentTrackers, direction)

    if (!adjustmentsApplied) {
      break
    }
    
    // 重新计算（带利息和管理费迭代）
    previousTotalFunding = latestSnapshot.partG.合计 // 使用上次的总资金作为初始值
    for (let interestIter = 0; interestIter < MAX_INTEREST_ITERATIONS; interestIter++) {
      const partATotal = partAItems.reduce((sum, item) => sum + (item.合计 || 0), 0)
      const engineeringCost = partAItems.reduce((sum, item) => sum + ((item.建设工程费 || 0) + (item.安装工程费 || 0)), 0)
      const partA: InvestmentItem = {
        序号: 'A',
        工程或费用名称: '第一部分 工程费用',
        合计: partATotal,
        备注: '实体建设类支出合计',
        children: partAItems
      }

      // 使用上一次迭代的项目总资金来计算建设单位管理费
      const estimatedTotalFunding = previousTotalFunding > 0 ? previousTotalFunding : partATotal * 1.5
      const partB = calculatePartB(partATotal, landCost, estimatedTotalFunding, engineeringCost)
      const partC: InvestmentItem = {
        序号: 'C',
        工程或费用名称: '第一、二部分合计',
        合计: partA.合计 + partB.合计,
        备注: 'C=A+B'
      }
      const partD: InvestmentItem = {
        序号: 'D',
        工程或费用名称: '基本预备费',
        合计: partC.合计 * 0.08,
        备注: '按(A+B)×8%计算'
      }
      const partE: InvestmentItem = {
        序号: 'E',
        工程或费用名称: '建设投资',
        合计: partC.合计 + partD.合计,
        备注: 'E=C+D'
      }
      
      const partF = calculateConstructionInterest(partE.合计, loanRatio, loanInterestRate, constructionYears, customLoanAmount)
      const partG: InvestmentItem = {
        序号: 'G',
        工程或费用名称: '项目总资金',
        合计: partE.合计 + partF.合计,
        占总投资比例: 100,
        备注: 'G=E+F'
      }
      
      currentTotalFunding = partG.合计
      latestSnapshot = { partA, partB, partC, partD, partE, partF, partG }
      
      const fundingDifference = Math.abs(currentTotalFunding - previousTotalFunding)
      
      if (fundingDifference < CONVERGENCE_THRESHOLD) {
        break
      }
      
      previousTotalFunding = currentTotalFunding
    }
    
    iterationCount++
  }

  if (latestSnapshot) {
    return finalizeResult(latestSnapshot, iterationCount, gapRate)
  }

  throw new Error('计算异常')
}
