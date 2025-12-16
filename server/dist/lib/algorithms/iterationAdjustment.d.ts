/**
 * 迭代调整算法模块
 * 实现投资估算的迭代调整逻辑，使总投资收敛到目标值
 */
import { InvestmentItem } from './partCalculation.js';
export declare const MAX_ITERATIONS = 50;
export declare const GAP_THRESHOLD = 0.015;
export declare const ADJUSTMENT_STEP_RATE = 0.0075;
export declare const MAX_ITEM_ADJUSTMENT = 0.2;
export declare const MIN_ITEM_SHARE = 0.01;
/**
 * 缩放子项的各项数值
 */
export declare function scaleItemValues(item: InvestmentItem, ratio: number): void;
/**
 * 强制执行最小占比规则
 * 确保每个子项至少占总投资的1%
 */
export declare function enforceMinimumShare(items: InvestmentItem[]): void;
/**
 * 全局调整算法
 * 根据差距率，同步调整所有子项的投资额
 * @param items 子项数组
 * @param adjustmentTrackers 调整追踪器，记录每个子项的累计调整幅度
 * @param direction 调整方向：'increase' 增加 | 'decrease' 减少
 * @returns 是否成功应用了调整
 */
export declare function applyGlobalAdjustment(items: InvestmentItem[], adjustmentTrackers: number[], direction: 'increase' | 'decrease'): boolean;
//# sourceMappingURL=iterationAdjustment.d.ts.map