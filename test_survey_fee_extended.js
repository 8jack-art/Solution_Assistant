/**
 * 勘察设计费扩展测试
 * 用于查找可能导致"一千多万"的原因
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

console.log('=== 勘察设计费扩展测试 ===\n')

// 测试不同 partATotal 值
console.log('--- 不同 partATotal 值的勘察设计费 ---\n')
console.log('partATotal\t勘察设计费\t区间')
console.log('--------\t--------\t----')

const testValues = [1000, 5000, 10000, 15000, 18775.01, 20000, 30000, 40000, 50000, 100000]
for (const val of testValues) {
  const result = calculateSurveyDesignFee(val)
  let bracket = '未知'
  for (let i = 0; i < SURVEY_DESIGN_BRACKETS.length - 1; i++) {
    if (val >= SURVEY_DESIGN_BRACKETS[i].threshold && val <= SURVEY_DESIGN_BRACKETS[i + 1].threshold) {
      bracket = `[${SURVEY_DESIGN_BRACKETS[i].threshold}, ${SURVEY_DESIGN_BRACKETS[i + 1].threshold}]`
      break
    }
  }
  if (val > SURVEY_DESIGN_BRACKETS[SURVEY_DESIGN_BRACKETS.length - 1].threshold) {
    bracket = `>${SURVEY_DESIGN_BRACKETS[SURVEY_DESIGN_BRACKETS.length - 1].threshold}`
  }
  console.log(`${val}\t\t${result.toFixed(2)}\t\t${bracket}`)
}

// 查找会导致"一千多万"的partATotal值
console.log('\n--- 查找会导致勘察设计费超过1000万的partATotal值 ---\n')
let found = false
for (let val = 10000; val <= 100000; val += 1000) {
  const result = calculateSurveyDesignFee(val)
  if (result > 1000 && result < 2000) {
    console.log(`partATotal = ${val}万 -> 勘察设计费 = ${result.toFixed(2)}万`)
    found = true
    break
  }
}
if (!found) {
  // 扩大搜索范围
  for (let val = 100000; val <= 500000; val += 10000) {
    const result = calculateSurveyDesignFee(val)
    if (result > 1000 && result < 2000) {
      console.log(`partATotal = ${val}万 -> 勘察设计费 = ${result.toFixed(2)}万`)
      found = true
      break
    }
  }
}

// 更精确地查找
console.log('\n--- 更精确搜索 ---\n')
for (let val = 40000; val <= 50000; val += 100) {
  const result = calculateSurveyDesignFee(val)
  if (result >= 1000 && result <= 1100) {
    console.log(`partATotal = ${val}万 -> 勘察设计费 = ${result.toFixed(2)}万`)
  }
}

// 如果 partATotal = partA 合计（包括设备购置费等），可能是什么情况？
console.log('\n--- 假设：用户看到的"工程费用"其实是 partA 合计 ---\n')
console.log('如果 partATotal = 40000万:')
console.log('勘察设计费 = ' + calculateSurveyDesignFee(40000).toFixed(2) + '万')
console.log('（这可能接近用户看到的"一千多万"）\n')

// 验证区间判断逻辑
console.log('--- 验证区间判断逻辑 ---\n')
function debugBracketLogic(value, brackets) {
  console.log(`计算值 ${value}:`)
  for (let i = 0; i < brackets.length - 1; i++) {
    const inBracket = value >= brackets[i].threshold && value <= brackets[i + 1].threshold
    console.log(`  [${brackets[i].threshold}, ${brackets[i + 1].threshold}]: ${inBracket ? '✓' : '✗'}`)
  }
}

debugBracketLogic(18775.01, SURVEY_DESIGN_BRACKETS)
