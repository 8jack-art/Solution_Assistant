/**
 * B部分工程其它费用计算算法模块
 * 实现工程其它费用各子项的详细计算逻辑
 */

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
 * 按第一部分工程费用的1.2%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 建设工程监理费（万元）
 */
export function calculateSupervisionFee(partATotal: number): number {
  return partATotal * 0.012
}

/**
 * 计算项目前期工作咨询费
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 项目前期工作咨询费（万元）
 */
export function calculatePreliminaryConsultingFee(partATotal: number): number {
  return partATotal * 0.005
}

/**
 * 计算勘察设计费
 * 按第一部分工程费用的2.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 勘察设计费（万元）
 */
export function calculateSurveyDesignFee(partATotal: number): number {
  return partATotal * 0.025
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
