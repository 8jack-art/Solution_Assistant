/**
 * 投资估算计算器
 * 实现统一循环迭代算法，生成符合工程经济学标准的投资估算简表
 */
import { type LoanCalculationResult } from './algorithms/loanCalculation.js';
import { type InvestmentItem } from './algorithms/partCalculation.js';
interface ProjectParams {
    projectName: string;
    targetInvestment: number;
    constructionYears: number;
    operationYears: number;
    loanRatio?: number;
    loanInterestRate: number;
    landCost: number;
    aiGeneratedItems?: Array<{
        name: string;
        construction_cost: number;
        equipment_cost: number;
        installation_cost: number;
        other_cost: number;
        remark?: string;
    }>;
    customLoanAmount?: number;
    projectType?: 'agriculture' | 'construction';
}
type PartF = LoanCalculationResult;
interface InvestmentEstimateResult {
    partA: InvestmentItem;
    partB: InvestmentItem;
    partC: InvestmentItem;
    partD: InvestmentItem;
    partE: InvestmentItem;
    partF: PartF;
    partG: InvestmentItem;
    iterationCount: number;
    gapRate: number;
    thirdLevelItems?: Record<number, any[]>;
}
/**
 * 统一循环迭代算法
 * 根据建息算法.md实现迭代收敛机制：
 * - 初始值：项目总资金 = 建设投资
 * - 迭代计算：贷款金额 → 利息 → 新项目总资金
 * - 收敛条件：|新项目总资金 - 旧项目总资金| < 0.01万元
 * - 最大迭代次数：10次（熔断保护）
 */
export declare function calculateInvestmentEstimate(params: ProjectParams): InvestmentEstimateResult;
export {};
//# sourceMappingURL=investmentCalculator.d.ts.map