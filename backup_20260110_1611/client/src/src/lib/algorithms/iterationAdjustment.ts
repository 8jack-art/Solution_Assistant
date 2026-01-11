/**
 * 迭代调整算法模块
 * 实现投资估算的迭代调整逻辑，使总投资收敛到目标值
 */

import { InvestmentItem } from './partCalculation.js'

// 迭代参数常量
export const MAX_ITERATIONS = 50
export const GAP_THRESHOLD = 0.015 // 1.5%
export const ADJUSTMENT_STEP_RATE = 0.0075 // 0.75%
export const MAX_ITEM_ADJUSTMENT = 0.2 // 20%
export const MIN_ITEM_SHARE = 0.01 // 1%

/**
 * 缩放子项的各项数值
 */
export function scaleItemValues(item: InvestmentItem, ratio: number): void {
  if (!isFinite(ratio) || ratio <= 0) {
    return
  }

  if (typeof item.建设工程费 === 'number') {
    item.建设工程费 *= ratio
  }
  if (typeof item.设备购置费 === 'number') {
    item.设备购置费 *= ratio
  }
  if (typeof item.安装工程费 === 'number') {
    item.安装工程费 *= ratio
  }
  if (typeof item.其它费用 === 'number') {
    item.其它费用 *= ratio
  }
  item.合计 *= ratio
}

/**
 * 强制执行最小占比规则
 * 确保每个子项至少占总投资的1%
 */
export function enforceMinimumShare(items: InvestmentItem[]): void {
  const total = items.reduce((sum, item) => sum + (item.合计 || 0), 0)
  if (total <= 0) {
    return
  }

  const minAmount = total * MIN_ITEM_SHARE
  let adjusted = false

  items.forEach(item => {
    const currentTotal = item.合计 || 0
    if (currentTotal <= 0) {
      item.建设工程费 = minAmount
      item.设备购置费 = 0
      item.安装工程费 = 0
      item.其它费用 = 0
      item.合计 = minAmount
      adjusted = true
      return
    }

    if (currentTotal < minAmount) {
      const ratio = minAmount / currentTotal
      scaleItemValues(item, ratio)
      adjusted = true
    }
  })

  if (adjusted) {
    const newTotal = items.reduce((sum, item) => sum + (item.合计 || 0), 0)
    if (newTotal > 0) {
      const normalizationRatio = total / newTotal
      items.forEach(item => scaleItemValues(item, normalizationRatio))
    }
  }
}

/**
 * 全局调整算法
 * 根据差距率，同步调整所有子项的投资额
 * @param items 子项数组
 * @param adjustmentTrackers 调整追踪器，记录每个子项的累计调整幅度
 * @param direction 调整方向：'increase' 增加 | 'decrease' 减少
 * @returns 是否成功应用了调整
 */
export function applyGlobalAdjustment(
  items: InvestmentItem[],
  adjustmentTrackers: number[],
  direction: 'increase' | 'decrease'
): boolean {
  const baseRate = direction === 'increase' ? ADJUSTMENT_STEP_RATE : -ADJUSTMENT_STEP_RATE
  let adjusted = false

  items.forEach((item, index) => {
    let rate = baseRate
    const projected = adjustmentTrackers[index] + rate

    if (projected > MAX_ITEM_ADJUSTMENT) {
      rate = MAX_ITEM_ADJUSTMENT - adjustmentTrackers[index]
    } else if (projected < -MAX_ITEM_ADJUSTMENT) {
      rate = -MAX_ITEM_ADJUSTMENT - adjustmentTrackers[index]
    }

    if (Math.abs(rate) < 1e-6) {
      return
    }

    const multiplier = 1 + rate
    if (multiplier <= 0) {
      return
    }

    scaleItemValues(item, multiplier)
    adjustmentTrackers[index] += rate
    adjusted = true
  })

  return adjusted
}
