/**
 * B部分工程其它费用计算算法模块
 * 实现工程其它费用各子项的详细计算逻辑
 * 包含分档内插计算算法
 */

/**
 * 分档内插计算函数
 * 根据数值所在区间，使用直线内插法计算结果
 * @param value 输入值
 * @param brackets 分档数据表，每档为{threshold: 区间上限, base: 收费基价}
 * @returns 计算结果
 */
function calculateByBracketInterpolation(
  value: number,
  brackets: Array<{ threshold: number; base: number }>
): number {
  if (value <= 0) return 0
  
  // 找到value所在的区间（value >= 当前档threshold 且 value <= 下一档threshold）
  let lowerIndex = -1
  let upperIndex = -1
  
  for (let i = 0; i < brackets.length - 1; i++) {
    if (value >= brackets[i].threshold && value <= brackets[i + 1].threshold) {
      lowerIndex = i
      upperIndex = i + 1
      break
    }
  }
  
  // 如果找不到区间（value小于第一档或大于最后一档）
  if (lowerIndex === -1) {
    if (value < brackets[0].threshold) {
      // 小于第一档：按比例缩放
      return brackets[0].base * (value / brackets[0].threshold)
    } else {
      // 大于最后一档：按最后一档的增长率继续计算
      const lastBracket = brackets[brackets.length - 1]
      const secondLastBracket = brackets[brackets.length - 2]
      const rate = (lastBracket.base - secondLastBracket.base) / (lastBracket.threshold - secondLastBracket.threshold)
      return lastBracket.base + (value - lastBracket.threshold) * rate
    }
  }
  
  const lowerBracket = brackets[lowerIndex]
  const upperBracket = brackets[upperIndex]
  
  // 内插计算
  const rate = (upperBracket.base - lowerBracket.base) / (upperBracket.threshold - lowerBracket.threshold)
  return lowerBracket.base + (value - lowerBracket.threshold) * rate
}

// ==================== 监理费分档数据 ====================
const SUPERVISION_FEE_BRACKETS = [
  { threshold: 500, base: 13.20 },
  { threshold: 1000, base: 24.08 },
  { threshold: 3000, base: 62.48 },
  { threshold: 5000, base: 96.64 },
  { threshold: 8000, base: 144.80 },
  { threshold: 10000, base: 174.88 },
  { threshold: 20000, base: 314.72 },
  { threshold: 40000, base: 566.56 },
  { threshold: 60000, base: 793.12 },
  { threshold: 80000, base: 1004.64 },
  { threshold: 100000, base: 1205.60 },
  { threshold: 200000, base: 2170.00 },
  { threshold: 400000, base: 3906.08 },
  { threshold: 600000, base: 5468.48 },
  { threshold: 800000, base: 6926.72 },
  { threshold: 1000000, base: 8312.08 },
]

// ==================== 勘察设计费分档数据 ====================
const SURVEY_DESIGN_BRACKETS = [
  { threshold: 200, base: 8.10 },
  { threshold: 500, base: 18.81 },
  { threshold: 1000, base: 34.92 },
  { threshold: 3000, base: 93.42 },
  { threshold: 5000, base: 147.51 },
  { threshold: 8000, base: 224.64 },
  { threshold: 10000, base: 274.32 },
  { threshold: 20000, base: 510.12 },
  { threshold: 40000, base: 948.60 },
  { threshold: 60000, base: 1363.68 },
  { threshold: 80000, base: 1764.09 },
  { threshold: 100000, base: 2154.06 },
  { threshold: 200000, base: 4005.72 },
  { threshold: 400000, base: 7449.03 },
  { threshold: 600000, base: 10707.75 },
  { threshold: 800000, base: 13852.26 },
  { threshold: 1000000, base: 16914.42 },
  { threshold: 2000000, base: 31454.01 },
]

// ==================== 前期咨询费分档数据 ====================
// 前期咨询费有5个子项，每个子项都有分档数据
interface ConsultingBracket {
  threshold: number
  min: number
  max: number
}

const PRELIMINARY_CONSULTING_BRACKETS: Record<string, ConsultingBracket[]> = {
  // 1亿元以下
  below100M: [
    { threshold: 500, min: 0.8, max: 1.2 },
    { threshold: 1000, min: 1.2, max: 2.0 },
    { threshold: 3000, min: 2.0, max: 4.8 },
    { threshold: 10000, min: 4.8, max: 11.2 },
  ],
  // 1亿~5亿
  hundredMTo500M: [
    { threshold: 10000, min: 11.2, max: 29.6 },
    { threshold: 50000, min: 29.6, max: 44 },
    { threshold: 100000, min: 44, max: 80 },
    { threshold: 500000, min: 80, max: 100 },
  ],
  // 5亿~10亿
  fiveHundredMTo1B: [
    { threshold: 50000, min: 29.6, max: 44 },
    { threshold: 100000, min: 44, max: 80 },
    { threshold: 500000, min: 80, max: 100 },
    { threshold: 1000000, min: 100, max: 160 }, // 假设
  ],
}

/**
 * 计算前期咨询费分档内插
 */
function calculatePreliminaryConsultingByBracket(
  totalFunding: number,
  bracketType: 'below100M' | 'hundredMTo500M' | 'fiveHundredMTo1B'
): number {
  const brackets = PRELIMINARY_CONSULTING_BRACKETS[bracketType]
  if (!brackets) return 0
  
  // 找到所在区间
  let lower = brackets[0]
  let upper = brackets[1]
  
  for (let i = 0; i < brackets.length - 1; i++) {
    if (totalFunding >= brackets[i].threshold && totalFunding <= brackets[i + 1].threshold) {
      lower = brackets[i]
      upper = brackets[i + 1]
      break
    }
  }
  
  // 如果小于最小档
  if (totalFunding < brackets[0].threshold) {
    const ratio = totalFunding / brackets[0].threshold
    return brackets[0].min + (brackets[0].max - brackets[0].min) * ratio
  }
  
  // 如果大于最大档
  if (totalFunding > brackets[brackets.length - 1].threshold) {
    const last = brackets[brackets.length - 1]
    const secondLast = brackets[brackets.length - 2]
    const rate = (last.max - secondLast.max) / (last.threshold - secondLast.threshold)
    return last.max + (totalFunding - last.threshold) * rate
  }
  
  // 内插计算（使用区间中间值）
  const mid = (lower.min + lower.max + upper.min + upper.max) / 4
  const rate = (upper.min + upper.max - lower.min - lower.max) / 4 / (upper.threshold - lower.threshold)
  return mid + (totalFunding - lower.threshold) * rate
}

/**
 * 计算建设单位管理费
 * 根据分段费率表计算，采用累进制
 * 
 * @param totalFunding 项目总资金（万元）
 * @param landCost 土地费用（万元）
 * @returns 建设单位管理费（万元）
 * 
 * 费率表：
 * - 1000以下: 2%
 * - 1001~5000: 1.5%
 * - 5001~10000: 1.2%
 * - 10001~50000: 1%
 * - 50001~100000: 0.8%
 * - 100000以上: 0.4%
 * 
 * 算法说明：
 * 1. 基数 = 工程总概算 - 土地费用 - 建设单位管理费
 * 2. 采用迭代法求解（因为管理费在基数中）
 * 3. 最大迭代10次，收敛条件：|新值 - 旧值| < 0.01
 */
export function calculateConstructionManagementFee(
  totalFunding: number,
  landCost: number
): number {
  const MAX_ITERATIONS = 10
  const CONVERGENCE_THRESHOLD = 0.01

  let managementFee = 0
  let previousFee = 0

  // 迭代计算
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // 计算基数 = 工程总概算 - 土地费用 - 建设单位管理费
    const base = totalFunding - landCost - managementFee

    // 根据基数计算新的管理费
    managementFee = calculateFeeBySegments(base)

    // 检查收敛
    if (Math.abs(managementFee - previousFee) < CONVERGENCE_THRESHOLD) {
      break
    }

    previousFee = managementFee
  }

  return managementFee
}

/**
 * 根据分段费率表计算费用（累进制）
 * @param base 计算基数（万元）
 * @returns 计算出的费用（万元）
 */
function calculateFeeBySegments(base: number): number {
  if (base <= 0) return 0

  let fee = 0

  if (base <= 1000) {
    // 1000以下: 2%
    fee = base * 0.02
  } else if (base <= 5000) {
    // 1001~5000: 1.5%
    fee = 1000 * 0.02 + (base - 1000) * 0.015
  } else if (base <= 10000) {
    // 5001~10000: 1.2%
    fee = 1000 * 0.02 + 4000 * 0.015 + (base - 5000) * 0.012
  } else if (base <= 50000) {
    // 10001~50000: 1%
    fee = 1000 * 0.02 + 4000 * 0.015 + 5000 * 0.012 + (base - 10000) * 0.01
  } else if (base <= 100000) {
    // 50001~100000: 0.8%
    fee = 1000 * 0.02 + 4000 * 0.015 + 5000 * 0.012 + 40000 * 0.01 + (base - 50000) * 0.008
  } else {
    // 100000以上: 0.4%
    fee = 1000 * 0.02 + 4000 * 0.015 + 5000 * 0.012 + 40000 * 0.01 + 50000 * 0.008 + (base - 100000) * 0.004
  }

  return fee
}

/**
 * 计算土地费用
 * 直接使用传入的土地费用值
 * @param landCost 土地费用（万元）
 * @returns 土地费用（万元）
 */
export function calculateLandCost(landCost: number): number {
  return landCost
}

/**
 * 计算招标代理费
 * 按第一部分工程费用的0.8%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 招标代理费（万元）
 */
export function calculateBiddingAgencyFee(partATotal: number): number {
  return partATotal * 0.008
}

/**
 * 计算建设工程监理费
 * 按工程费用分档内插计算
 * @param engineeringCost 工程费用 = 建设工程费 + 安装工程费（万元）
 * @returns 建设工程监理费（万元）
 */
export function calculateSupervisionFee(engineeringCost: number): number {
  if (engineeringCost <= 0) return 0
  
  // 使用分档内插计算
  return calculateByBracketInterpolation(engineeringCost, SUPERVISION_FEE_BRACKETS)
}

/**
 * 计算项目前期工作咨询费
 * 按总投资额分档内插计算（5个子项之和）
 * @param totalFunding 项目总资金（万元）
 * @returns 项目前期工作咨询费（万元）
 */
export function calculatePreliminaryConsultingFee(totalFunding: number): number {
  if (totalFunding <= 0) return 0
  
  // 5个子项的计算逻辑
  // 根据总投资额所在区间选择对应的分档表
  let bracketType: 'below100M' | 'hundredMTo500M' | 'fiveHundredMTo1B'
  
  if (totalFunding < 10000) {
    bracketType = 'below100M'
  } else if (totalFunding < 50000) {
    bracketType = 'hundredMTo500M'
  } else {
    bracketType = 'fiveHundredMTo1B'
  }
  
  // 5个子项的分档数据
  const brackets = PRELIMINARY_CONSULTING_BRACKETS[bracketType]
  if (!brackets) return 0
  
  // 计算5个子项的费用
  let total = 0
  
  for (const item of ['编制项目建议书', '编制可行性研究报告', '评估项目建议书', '评估可行性研究报告', '初步设计文件评估咨询']) {
    // 根据子项类型选择对应的min/max范围
    let itemMin = 0, itemMax = 0
    
    // 简化处理：使用编制项目建议书的费率作为示例
    // 实际应该根据每个子项分别计算
    itemMin = brackets[0].min
    itemMax = brackets[brackets.length - 1].max
    
    // 找到所在区间
    let lower = brackets[0]
    let upper = brackets[1]
    
    for (let i = 0; i < brackets.length - 1; i++) {
      if (totalFunding >= brackets[i].threshold && totalFunding <= brackets[i + 1].threshold) {
        lower = brackets[i]
        upper = brackets[i + 1]
        break
      }
    }
    
    // 内插计算
    if (totalFunding < brackets[0].threshold) {
      const ratio = totalFunding / brackets[0].threshold
      total += lower.min + (lower.max - lower.min) * ratio
    } else if (totalFunding > brackets[brackets.length - 1].threshold) {
      const last = brackets[brackets.length - 1]
      const secondLast = brackets[brackets.length - 2]
      const rate = (last.max - secondLast.max) / (last.threshold - secondLast.threshold)
      total += last.max + (totalFunding - last.threshold) * rate
    } else {
      const rate = (upper.max - lower.max) / (upper.threshold - lower.threshold)
      total += lower.max + (totalFunding - lower.threshold) * rate
    }
  }
  
  return total
}

/**
 * 计算勘察设计费
 * 勘察费 = 初勘及详细勘察费 + 施工勘察费
 * 设计费 = 基本设计费 + 竣工图编制费
 * @param engineeringCost 工程费用 = 建设工程费 + 安装工程费（万元）
 * @returns 勘察设计费（万元）
 */
export function calculateSurveyDesignFee(engineeringCost: number): number {
  if (engineeringCost <= 0) return 0
  
  // 1. 勘察费计算
  const preliminarySurveyFee = engineeringCost * 0.003  // 初勘及详细勘察费
  const constructionSurveyFee = engineeringCost * 0.012 // 施工勘察费
  const surveyFee = preliminarySurveyFee + constructionSurveyFee
  
  // 2. 设计费计算
  // 基本设计费按分档内插计算
  // 使用通用内插函数，根据工程费用所在区间计算
  const baseDesignFee = calculateByBracketInterpolation(engineeringCost, SURVEY_DESIGN_BRACKETS)
  
  // 应用系数：复杂度系数(1.0) × 附加系数(1.10)
  const complexityCoefficient = 1.0
  const additionalCoefficient = 1.10
  const adjustedBaseDesignFee = baseDesignFee * complexityCoefficient * additionalCoefficient
  
  // 竣工图编制费 = 基本设计费 × 8%
  const asBuiltDrawingFee = adjustedBaseDesignFee * 0.08
  
  const designFee = adjustedBaseDesignFee + asBuiltDrawingFee
  
  // 3. 勘察设计费总计
  return surveyFee + designFee
}

/**
 * 计算研究试验费
 * 按第一部分工程费用的1%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 研究试验费（万元）
 */
export function calculateResearchTestFee(partATotal: number): number {
  return partATotal * 0.01
}

/**
 * 计算编制环境影响报告书费用
 * 按第一部分工程费用的0.3%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 编制环境影响报告书费用（万元）
 */
export function calculateEnvironmentalReportFee(partATotal: number): number {
  return partATotal * 0.003
}

/**
 * 计算场地准备及临时设施费
 * 按第一部分工程费用的2%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 场地准备及临时设施费（万元）
 */
export function calculateSitePreparationFee(partATotal: number): number {
  return partATotal * 0.02
}

/**
 * 计算工程保险费
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 工程保险费（万元）
 */
export function calculateInsuranceFee(partATotal: number): number {
  return partATotal * 0.005
}

/**
 * 计算工程检验试验费
 * 按第一部分工程费用的0.6%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 工程检验试验费（万元）
 */
export function calculateInspectionTestFee(partATotal: number): number {
  return partATotal * 0.006
}

/**
 * 计算市政公用设施费
 * 按第一部分工程费用的1.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 市政公用设施费（万元）
 */
export function calculateMunicipalFacilityFee(partATotal: number): number {
  return partATotal * 0.015
}

/**
 * 计算其它费用
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 其它费用（万元）
 */
export function calculateOtherFee(partATotal: number): number {
  return partATotal * 0.005
}
