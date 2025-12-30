/**
 * 测试修复后的勘察设计费计算
 * 验证：工程费用 = 建设工程费 + 安装工程费
 * 预期：工程费用=18775.01万时，勘察设计费约为853万
 */

import { calculateSurveyDesignFee } from './server/src/lib/algorithms/partBCalculation.js'

// 测试用例
const engineeringCost = 18775.01
const surveyDesignFee = calculateSurveyDesignFee(engineeringCost)

console.log('=== 修复验证测试 ===')
console.log(`工程费用（建设工程费+安装工程费）: ${engineeringCost.toFixed(2)} 万`)
console.log(`勘察设计费计算结果: ${surveyDesignFee.toFixed(2)} 万`)
console.log(`预期结果: 约 853 万`)
console.log(`差异: ${Math.abs(surveyDesignFee - 853).toFixed(2)} 万`)

// 验证是否在预期范围内（±10万）
const isValid = surveyDesignFee >= 843 && surveyDesignFee <= 863
console.log(`\n验证结果: ${isValid ? '✓ 通过' : '✗ 失败'}`)

// 额外测试：验证不同基数的计算结果
console.log('\n=== 不同工程费用下的勘察设计费 ===')
const testCases = [
  { cost: 10000, expected: '约460万' },
  { cost: 20000, expected: '约910万' },
  { cost: 30000, expected: '约1350万' }
]

for (const test of testCases) {
  const fee = calculateSurveyDesignFee(test.cost)
  console.log(`工程费用 ${test.cost.toLocaleString()} 万 → 勘察设计费 ${fee.toFixed(2)} 万 (预期: ${test.expected})`)
}
