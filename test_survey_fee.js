/**
 * 勘察设计费计算测试
 * 用于验证分档内插算法是否正确
 */

// 分档数据
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

/**
 * 分档内插计算函数
 */
function calculateByBracketInterpolation(value, brackets) {
  if (value <= 0) return 0

  // 找到value所在的区间
  let lowerIndex = -1
  let upperIndex = -1

  for (let i = 0; i < brackets.length - 1; i++) {
    if (value >= brackets[i].threshold && value <= brackets[i + 1].threshold) {
      lowerIndex = i
      upperIndex = i + 1
      break
    }
  }

  // 如果找不到区间
  if (lowerIndex === -1) {
    if (value < brackets[0].threshold) {
      return brackets[0].base * (value / brackets[0].threshold)
    } else {
      const lastBracket = brackets[brackets.length - 1]
      const secondLastBracket = brackets[brackets.length - 2]
      const rate = (lastBracket.base - secondLastBracket.base) / (lastBracket.threshold - secondLastBracket.threshold)
      return lastBracket.base + (value - lastBracket.threshold) * rate
    }
  }

  const lowerBracket = brackets[lowerIndex]
  const upperBracket = brackets[upperIndex]

  const rate = (upperBracket.base - lowerBracket.base) / (upperBracket.threshold - lowerBracket.threshold)
  return lowerBracket.base + (value - lowerBracket.threshold) * rate
}

/**
 * 勘察设计费计算
 */
function calculateSurveyDesignFee(engineeringCost) {
  if (engineeringCost <= 0) return 0

  // 1. 勘察费计算
  const preliminarySurveyFee = engineeringCost * 0.003  // 初勘及详细勘察费
  const constructionSurveyFee = engineeringCost * 0.012 // 施工勘察费
  const surveyFee = preliminarySurveyFee + constructionSurveyFee

  // 2. 设计费计算
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

// 测试
console.log('=== 勘察设计费计算测试 ===\n')

// 测试用例1: 18775.01万（用户报告的问题值）
const testValue1 = 18775.01
const result1 = calculateSurveyDesignFee(testValue1)
console.log('工程费: ' + testValue1 + '万元')
console.log('勘察设计费: ' + result1.toFixed(2) + '万元')
console.log('预期: ~853万元')
console.log('结果是否异常: ' + (result1 > 1000 ? '是（一千多万）' : '否') + '\n')

// 测试用例2: 1000万
const testValue2 = 1000
const result2 = calculateSurveyDesignFee(testValue2)
console.log('工程费: ' + testValue2 + '万元')
console.log('勘察设计费: ' + result2.toFixed(2) + '万元\n')

// 测试用例3: 5000万
const testValue3 = 5000
const result3 = calculateSurveyDesignFee(testValue3)
console.log('工程费: ' + testValue3 + '万元')
console.log('勘察设计费: ' + result3.toFixed(2) + '万元\n')

// 测试用例4: 10000万
const testValue4 = 10000
const result4 = calculateSurveyDesignFee(testValue4)
console.log('工程费: ' + testValue4 + '万元')
console.log('勘察设计费: ' + result4.toFixed(2) + '万元\n')

// 调试：查看分档内插过程
console.log('=== 分档内插调试 ===')
function debugBracketInterpolation(value, brackets) {
  console.log('\n计算工程费 ' + value + ' 的基本设计费:')

  let lowerIndex = -1
  let upperIndex = -1

  for (let i = 0; i < brackets.length - 1; i++) {
    if (value >= brackets[i].threshold && value <= brackets[i + 1].threshold) {
      lowerIndex = i
      upperIndex = i + 1
      break
    }
  }

  if (lowerIndex !== -1) {
    const lowerBracket = brackets[lowerIndex]
    const upperBracket = brackets[upperIndex]
    console.log('落在区间 [' + lowerBracket.threshold + ', ' + upperBracket.threshold + ']')
    console.log('区间基价: [' + lowerBracket.base + ', ' + upperBracket.base + ']')

    const rate = (upperBracket.base - lowerBracket.base) / (upperBracket.threshold - lowerBracket.threshold)
    console.log('增长率: ' + rate.toFixed(6))

    const result = lowerBracket.base + (value - lowerBracket.threshold) * rate
    console.log('计算结果: ' + lowerBracket.base + ' + (' + value + ' - ' + lowerBracket.threshold + ') * ' + rate.toFixed(6) + ' = ' + result.toFixed(2))

    return result
  } else {
    console.log('未找到区间')
    return null
  }
}

debugBracketInterpolation(18775.01, SURVEY_DESIGN_BRACKETS)

// 简单公式对比
console.log('\n=== 简单公式对比 ===')
console.log('简单公式 (2.5%): ' + (18775.01 * 0.025).toFixed(2) + '万元')
console.log('分档算法结果: ' + result1.toFixed(2) + '万元')

// 如果分档算法结果约853万，但用户看到一千多万，问题可能是：
// 1. 缓存了旧数据
// 2. 后端运行的是旧版本代码（使用简单公式2.5%）
console.log('\n=== 问题分析 ===')
console.log('如果用户看到一千多万:')
console.log('可能原因1: 前端使用了localStorage缓存的旧数据')
console.log('可能原因2: 后端运行的是旧版本代码（2.5%简单公式: ' + (18775.01 * 0.025).toFixed(2) + '万，接近预期但略高)')
console.log('可能原因3: 传递的参数不是18775.01，而是更大的值')
