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
// 每个子项有独立的分档数据
interface ConsultingBracket {
  threshold: number
  min: number
  max: number
}

// 编制项目建议书分档数据
const PROPOSAL_BRACKETS: ConsultingBracket[] = [
  { threshold: 500, min: 0.8, max: 1.2 },
  { threshold: 1000, min: 1.2, max: 2.0 },
  { threshold: 3000, min: 2.0, max: 4.8 },
  { threshold: 10000, min: 11.2, max: 29.6 },
  { threshold: 50000, min: 29.6, max: 44 },
  { threshold: 100000, min: 44, max: 80 },
  { threshold: 500000, min: 80, max: 100 },
  { threshold: 1000000, min: 100, max: 160 },
]

// 编制可行性研究报告分档数据
const FEASIBILITY_BRACKETS: ConsultingBracket[] = [
  { threshold: 500, min: 1.6, max: 3.2 },
  { threshold: 1000, min: 3.2, max: 4.8 },
  { threshold: 3000, min: 4.8, max: 9.6 },
  { threshold: 10000, min: 22.4, max: 60 },
  { threshold: 50000, min: 60, max: 88 },
  { threshold: 100000, min: 88, max: 160 },
  { threshold: 500000, min: 160, max: 200 },
  { threshold: 1000000, min: 200, max: 280 },
]

// 评估项目建议书分档数据
const PROPOSAL_EVAL_BRACKETS: ConsultingBracket[] = [
  { threshold: 500, min: 0.4, max: 0.8 },
  { threshold: 1000, min: 0.8, max: 1.2 },
  { threshold: 3000, min: 1.2, max: 3.2 },
  { threshold: 10000, min: 6.4, max: 9.6 },
  { threshold: 50000, min: 9.6, max: 12 },
  { threshold: 100000, min: 12, max: 13.6 },
  { threshold: 500000, min: 13.6, max: 16 },
  { threshold: 1000000, min: 16, max: 20 },
]

// 评估可行性研究报告分档数据
const FEASIBILITY_EVAL_BRACKETS: ConsultingBracket[] = [
  { threshold: 500, min: 0.8, max: 1.2 },
  { threshold: 1000, min: 1.2, max: 2.0 },
  { threshold: 3000, min: 2.0, max: 4.0 },
  { threshold: 10000, min: 8.0, max: 12.0 },
  { threshold: 50000, min: 12.0, max: 16.0 },
  { threshold: 100000, min: 16.0, max: 20.0 },
  { threshold: 500000, min: 20.0, max: 28.0 },
  { threshold: 1000000, min: 28.0, max: 40.0 },
]

// 初步设计文件评估咨询分档数据
const DESIGN_EVAL_BRACKETS: ConsultingBracket[] = [
  { threshold: 500, min: 0.8, max: 1.2 },
  { threshold: 1000, min: 1.2, max: 2.0 },
  { threshold: 3000, min: 2.0, max: 4.0 },
  { threshold: 10000, min: 8.0, max: 12.0 },
  { threshold: 50000, min: 12.0, max: 16.0 },
  { threshold: 100000, min: 16.0, max: 20.0 },
  { threshold: 500000, min: 20.0, max: 28.0 },
  { threshold: 1000000, min: 28.0, max: 40.0 },
]

/**
 * 计算单个前期咨询子项费用
 */
function calculateConsultingItemFee(
  totalFunding: number,
  brackets: ConsultingBracket[]
): number {
  if (totalFunding <= 0) return 0
  
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
    return lower.min + (lower.max - lower.min) * ratio
  }
  
  // 如果大于最大档
  if (totalFunding > brackets[brackets.length - 1].threshold) {
    const last = brackets[brackets.length - 1]
    const secondLast = brackets[brackets.length - 2]
    const rate = (last.min - secondLast.min) / (last.threshold - secondLast.threshold)
    return last.min + (totalFunding - last.threshold) * rate
  }
  
  // 内插计算（使用min值）
  const rate = (upper.min - lower.min) / (upper.threshold - lower.threshold)
  return lower.min + (totalFunding - lower.threshold) * rate
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
 * 招标代理费计算
 * 包含3个子项：工程招标费、货物招标费、服务招标费
 * 采用差额定率分档累进算法
 */

// 招标代理费费率表（差额定率分档累进）
// 费用单位：万元，费率单位：‰
interface BiddingFeeBracket {
  threshold: number  // 档位上限（万元）
  rate: number       // 费率（‰）
}

// 工程招标费率表
const ENGINEERING_BIDDING_BRACKETS: BiddingFeeBracket[] = [
  { threshold: 100, rate: 6.300 },
  { threshold: 500, rate: 4.410 },
  { threshold: 1000, rate: 3.465 },
  { threshold: 5000, rate: 2.205 },
  { threshold: 10000, rate: 1.260 },
  { threshold: 50000, rate: 0.315 },
  { threshold: 100000, rate: 0.221 },
  { threshold: 500000, rate: 0.050 },
  { threshold: 1000000, rate: 0.038 },
  { threshold: 10000000, rate: 0.025 },
]

// 货物招标费率表
const GOODS_BIDDING_BRACKETS: BiddingFeeBracket[] = [
  { threshold: 100, rate: 9.450 },
  { threshold: 500, rate: 6.930 },
  { threshold: 1000, rate: 5.040 },
  { threshold: 5000, rate: 3.150 },
  { threshold: 10000, rate: 1.575 },
  { threshold: 50000, rate: 0.315 },
  { threshold: 100000, rate: 0.221 },
  { threshold: 500000, rate: 0.050 },
  { threshold: 1000000, rate: 0.038 },
  { threshold: 10000000, rate: 0.025 },
]

// 服务招标费率表
const SERVICE_BIDDING_BRACKETS: BiddingFeeBracket[] = [
  { threshold: 100, rate: 9.450 },
  { threshold: 500, rate: 5.040 },
  { threshold: 1000, rate: 2.853 },
  { threshold: 5000, rate: 1.575 },
  { threshold: 10000, rate: 0.630 },
  { threshold: 50000, rate: 0.315 },
  { threshold: 100000, rate: 0.221 },
  { threshold: 500000, rate: 0.050 },
  { threshold: 1000000, rate: 0.038 },
  { threshold: 10000000, rate: 0.025 },
]

/**
 * 差额定率分档累进计算招标代理费
 * @param amount 计算基数（万元）
 * @param brackets 费率表
 * @returns 招标代理费（万元）
 */
function calculateBiddingFeeByBrackets(amount: number, brackets: BiddingFeeBracket[]): number {
  if (amount <= 0) return 0
  
  let fee = 0
  let remaining = amount
  let previousThreshold = 0
  
  for (const bracket of brackets) {
    if (remaining <= 0) break
    
    const bracketRange = bracket.threshold - previousThreshold
    
    if (amount >= bracket.threshold) {
      // 整个档位都适用
      fee += bracketRange * bracket.rate / 1000
    } else if (amount > previousThreshold) {
      // 只有部分适用
      const applicableAmount = amount - previousThreshold
      fee += applicableAmount * bracket.rate / 1000
    }
    
    previousThreshold = bracket.threshold
  }
  
  return fee
}

/**
 * 计算工程招标费
 * 以工程费用（建设工程费+安装工程费）为基数
 * @param engineeringCost 工程费用（万元）
 * @returns 工程招标费（万元）
 */
export function calculateEngineeringBiddingFee(engineeringCost: number): number {
  return calculateBiddingFeeByBrackets(engineeringCost, ENGINEERING_BIDDING_BRACKETS)
}

/**
 * 计算货物招标费
 * 以设备购置费为基数
 * @param equipmentCost 设备购置费（万元）
 * @returns 货物招标费（万元）
 */
export function calculateGoodsBiddingFee(equipmentCost: number): number {
  return calculateBiddingFeeByBrackets(equipmentCost, GOODS_BIDDING_BRACKETS)
}

/**
 * 计算服务招标费
 * 以（监理费+勘察费+设计费）为基数
 * 监理费、勘察费、设计费任一项小于50万时，该项招标费为0
 * @param supervisionFee 监理费（万元）
 * @param surveyFee 勘察费（万元）
 * @param designFee 设计费（万元）
 * @returns 服务招标费（万元）
 */
export function calculateServiceBiddingFee(
  supervisionFee: number,
  surveyFee: number,
  designFee: number
): number {
  // 检查是否任一项小于50万
  if (supervisionFee < 50 || surveyFee < 50 || designFee < 50) {
    return 0
  }
  
  // 服务招标费基数 = 监理费 + 勘察费 + 设计费
  const serviceBase = supervisionFee + surveyFee + designFee
  return calculateBiddingFeeByBrackets(serviceBase, SERVICE_BIDDING_BRACKETS)
}

/**
 * 计算招标代理费合计
 * @param engineeringCost 工程费用（万元）
 * @param equipmentCost 设备购置费（万元）
 * @param supervisionFee 监理费（万元）
 * @param surveyFee 勘察费（万元）
 * @param designFee 设计费（万元）
 * @returns 招标代理费合计（万元）
 */
export function calculateBiddingAgencyFee(
  engineeringCost: number,
  equipmentCost: number,
  supervisionFee: number,
  surveyFee: number,
  designFee: number
): number {
  const engineeringFee = calculateEngineeringBiddingFee(engineeringCost)
  const goodsFee = calculateGoodsBiddingFee(equipmentCost)
  const serviceFee = calculateServiceBiddingFee(supervisionFee, surveyFee, designFee)
  
  return engineeringFee + goodsFee + serviceFee
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
  
  // 分别计算4个子项的费用（去掉评估项目建议书）
  const proposalFee = calculateConsultingItemFee(totalFunding, PROPOSAL_BRACKETS)
  const feasibilityFee = calculateConsultingItemFee(totalFunding, FEASIBILITY_BRACKETS)
  const feasibilityEvalFee = calculateConsultingItemFee(totalFunding, FEASIBILITY_EVAL_BRACKETS)
  const designEvalFee = calculateConsultingItemFee(totalFunding, DESIGN_EVAL_BRACKETS)
  
  return proposalFee + feasibilityFee + feasibilityEvalFee + designEvalFee
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

// ==================== 环评报告书分档数据 ====================
// 投资额单位：亿元
// 费率单位：万元
interface EnvReportBracket {
  threshold: number  // 投资额上限（亿元）
  min: number        // 费率下限（万元）
  max: number        // 费率上限（万元）
}

const ENV_REPORT_BRACKETS: EnvReportBracket[] = [
  { threshold: 0.3, min: 3.0, max: 3.6 },
  { threshold: 2, min: 3.6, max: 9.0 },
  { threshold: 10, min: 9.0, max: 21.0 },
  { threshold: 50, min: 21.0, max: 45.0 },
  { threshold: 100, min: 45.0, max: 66.0 },
  { threshold: 1000, min: 66.0, max: 100.0 },  // 100以上估计值
]

/**
 * 计算编制环境影响报告书费用
 * 按投资额分档内插计算
 * 编制环评报告书编制费 = 基本编制费 × 敏感系数(0.8)
 * @param totalFunding 项目总资金（万元）
 * @returns 编制环境影响报告书费用（万元）
 */
export function calculateEnvironmentalReportFee(totalFunding: number): number {
  if (totalFunding <= 0) return 0
  
  // 将万元转换为亿元
  const fundingInBillion = totalFunding / 10000
  
  // 找到所在区间
  let lower = ENV_REPORT_BRACKETS[0]
  let upper = ENV_REPORT_BRACKETS[1]
  
  for (let i = 0; i < ENV_REPORT_BRACKETS.length - 1; i++) {
    if (fundingInBillion >= ENV_REPORT_BRACKETS[i].threshold && fundingInBillion <= ENV_REPORT_BRACKETS[i + 1].threshold) {
      lower = ENV_REPORT_BRACKETS[i]
      upper = ENV_REPORT_BRACKETS[i + 1]
      break
    }
  }
  
  // 如果小于最小档
  if (fundingInBillion < ENV_REPORT_BRACKETS[0].threshold) {
    const ratio = fundingInBillion / ENV_REPORT_BRACKETS[0].threshold
    const baseFee = lower.min + (lower.max - lower.min) * ratio
    return baseFee * 0.8  // 敏感系数0.8
  }
  
  // 如果大于最大档
  if (fundingInBillion > ENV_REPORT_BRACKETS[ENV_REPORT_BRACKETS.length - 1].threshold) {
    const last = ENV_REPORT_BRACKETS[ENV_REPORT_BRACKETS.length - 1]
    const secondLast = ENV_REPORT_BRACKETS[ENV_REPORT_BRACKETS.length - 2]
    const rate = (last.min - secondLast.min) / (last.threshold - secondLast.threshold)
    const baseFee = last.min + (fundingInBillion - last.threshold) * rate
    return baseFee * 0.8  // 敏感系数0.8
  }
  
  // 内插计算（使用min值）
  const rate = (upper.min - lower.min) / (upper.threshold - lower.threshold)
  const baseFee = lower.min + (fundingInBillion - lower.threshold) * rate
  
  // 应用敏感系数0.8
  return baseFee * 0.8
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
 * 农业项目免收市政公用设施费
 * @param partATotal 第一部分工程费用总额（万元）
 * @param projectType 项目类型（agriculture-农业，construction-建筑）
 * @returns 市政公用设施费（万元）
 */
export function calculateMunicipalFacilityFee(
  partATotal: number, 
  projectType?: 'agriculture' | 'construction'
): number {
  // 农业项目免收市政公用设施费
  if (projectType === 'agriculture') {
    return 0
  }
  // 建筑项目按1.5%计取
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
