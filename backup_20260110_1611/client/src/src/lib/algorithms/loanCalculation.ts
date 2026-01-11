/**
 * 贷款计算算法模块
 * 实现建设期利息的计算逻辑
 */

export interface YearlyInterest {
  年份: number
  期初本金累计: number
  当期借款金额: number
  当期利息: number
}

export interface LoanCalculationResult {
  贷款总额: number
  年利率: number
  建设期年限: number
  分年利息: YearlyInterest[]
  合计: number
  占总投资比例: number
}

/**
 * 贷款分级取整（金融规范）
 * 根据建息算法.md：
 * - ≥1亿元：向下取整到1000万元
 * - <1亿元：向下取整到100万元
 */
export function roundLoanAmount(amount: number): number {
  const amountInYuan = amount * 10000 // 转换为元
  
  if (amountInYuan >= 100000000) {
    // ≥1亿元，向下取整到千万
    return Math.floor(amountInYuan / 10000000) * 1000 // 返回万元
  } else {
    // <1亿元，向下取整到百万
    return Math.floor(amountInYuan / 1000000) * 100 // 返回万元
  }
}

/**
 * "头大尾小"分年借款分配算法
 * 原理：
 * - 前n-1年：每年借款金额相同，为取整后的平均值
 * - 第n年：使用减法得出的尾数（贷款总额 - 前n-1年累计）
 */
export function distributeLoanByYear(
  loanTotal: number,
  years: number
): number[] {
  if (years <= 0) return []
  if (years === 1) return [loanTotal]
  
  // 第1年基础额度
  const baseAmount = loanTotal / years
  const firstYearAmount = roundLoanAmount(baseAmount)
  
  const distribution: number[] = []
  let accumulated = 0
  
  // 前n-1年使用相同的取整后金额
  for (let i = 0; i < years - 1; i++) {
    distribution.push(firstYearAmount)
    accumulated += firstYearAmount
  }
  
  // 最后一年使用减法得出的尾数
  const lastYearAmount = loanTotal - accumulated
  distribution.push(Math.max(0, lastYearAmount))
  
  return distribution
}

/**
 * 计算建设期利息
 * 根据建息算法.md实现：
 * 1. 贷款总额取整规则
 * 2. 头大尾小分年借款分配
 * 3. 单利计息：当期利息 = (期初本金累计 + 当期借款金额 ÷ 2) × 年利率
 */
export function calculateConstructionInterest(
  buildingInvestment: number,
  loanRatio: number | undefined,
  interestRate: number,
  constructionYears: number,
  customLoanAmount?: number
): LoanCalculationResult {
  let finalLoanAmount: number
  
  if (customLoanAmount !== undefined) {
    // 使用自定义贷款额
    finalLoanAmount = customLoanAmount
  } else if (loanRatio !== undefined) {
    // 使用贷款比例计算
    const rawLoanAmount = buildingInvestment * loanRatio
    finalLoanAmount = roundLoanAmount(rawLoanAmount)
  } else {
    // 默认为0
    finalLoanAmount = 0
  }

  // 使用"头大尾小"算法分配分年借款金额
  const yearlyLoans = distributeLoanByYear(finalLoanAmount, constructionYears)

  // 分年利息计算（单利计息）
  const yearlyInterests: YearlyInterest[] = []
  let cumulativePrincipal = 0

  for (let year = 1; year <= constructionYears; year++) {
    const currentYearLoan = yearlyLoans[year - 1]

    // 单利计息公式：当期利息 = (期初本金累计 + 当期借款金额 ÷ 2) × 年利率
    const interest = (cumulativePrincipal + currentYearLoan / 2) * interestRate

    yearlyInterests.push({
      年份: year,
      期初本金累计: cumulativePrincipal,
      当期借款金额: currentYearLoan,
      当期利息: interest
    })

    cumulativePrincipal += currentYearLoan
  }

  const totalInterest = yearlyInterests.reduce((sum, item) => sum + item.当期利息, 0)

  return {
    贷款总额: finalLoanAmount,
    年利率: interestRate,
    建设期年限: constructionYears,
    分年利息: yearlyInterests,
    合计: totalInterest,
    占总投资比例: 0 // 稍后计算
  }
}
