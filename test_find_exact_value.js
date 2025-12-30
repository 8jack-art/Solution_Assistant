/**
 * 精确查找导致 1338.86万 的 partATotal 值
 */

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

function calculateByBracketInterpolation(value, brackets) {
  if (value <= 0) return 0

  let lowerIndex = -1
  let upperIndex = -1

  for (let i = 0; i < brackets.length - 1; i++) {
    if (value >= brackets[i].threshold && value <= brackets[i + 1].threshold) {
      lowerIndex = i
      upperIndex = i + 1
      break
    }
  }

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

function calculateSurveyDesignFee(engineeringCost) {
  if (engineeringCost <= 0) return 0

  const preliminarySurveyFee = engineeringCost * 0.003
  const constructionSurveyFee = engineeringCost * 0.012
  const surveyFee = preliminarySurveyFee + constructionSurveyFee

  const baseDesignFee = calculateByBracketInterpolation(engineeringCost, SURVEY_DESIGN_BRACKETS)
  const complexityCoefficient = 1.0
  const additionalCoefficient = 1.10
  const adjustedBaseDesignFee = baseDesignFee * complexityCoefficient * additionalCoefficient
  const asBuiltDrawingFee = adjustedBaseDesignFee * 0.08
  const designFee = adjustedBaseDesignFee + asBuiltDrawingFee

  return surveyFee + designFee
}

// 目标值
const target = 1338.86

console.log(`=== 精确查找导致 ${target}万 的 partATotal 值 ===\n`)

// 在 [20000, 40000] 区间搜索
console.log('在 [20000, 40000] 区间搜索:')
for (let val = 20000; val <= 40000; val += 10) {
  const result = calculateSurveyDesignFee(val)
  if (Math.abs(result - target) < 1) {
    console.log(`partATotal = ${val}万 -> 勘察设计费 = ${result.toFixed(2)}万`)
  }
}

// 打印几个关键点的值
console.log('\n关键点测试:')
const keyPoints = [25000, 27000, 28000, 29000, 29500, 30000, 30500, 31000, 32000]
for (const val of keyPoints) {
  const result = calculateSurveyDesignFee(val)
  console.log(`partATotal = ${val}万 -> 勘察设计费 = ${result.toFixed(2)}万`)
}

// 反向计算：给定勘察设计费，反推 partATotal
console.log('\n=== 区间分析 ===')
// 30000万落在 [20000, 40000] 区间
// 计算这个区间的增长率
const bracket20000 = SURVEY_DESIGN_BRACKETS.find(b => b.threshold === 20000)
const bracket40000 = SURVEY_DESIGN_BRACKETS.find(b => b.threshold === 40000)
console.log(`[20000, 40000] 区间: base从 ${bracket20000.base} 到 ${bracket40000.base}`)
console.log(`增长率: ${((bracket40000.base - bracket20000.base) / 20000).toFixed(6)}`)
