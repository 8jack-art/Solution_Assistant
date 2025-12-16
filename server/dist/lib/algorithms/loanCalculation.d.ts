/**
 * 贷款计算算法模块
 * 实现建设期利息的计算逻辑
 */
export interface YearlyInterest {
    年份: number;
    期初本金累计: number;
    当期借款金额: number;
    当期利息: number;
}
export interface LoanCalculationResult {
    贷款总额: number;
    年利率: number;
    建设期年限: number;
    分年利息: YearlyInterest[];
    合计: number;
    占总投资比例: number;
}
/**
 * 贷款分级取整（金融规范）
 * 根据建息算法.md：
 * - ≥1亿元：向下取整到1000万元
 * - <1亿元：向下取整到100万元
 */
export declare function roundLoanAmount(amount: number): number;
/**
 * "头大尾小"分年借款分配算法
 * 原理：
 * - 前n-1年：每年借款金额相同，为取整后的平均值
 * - 第n年：使用减法得出的尾数（贷款总额 - 前n-1年累计）
 */
export declare function distributeLoanByYear(loanTotal: number, years: number): number[];
/**
 * 计算建设期利息
 * 根据建息算法.md实现：
 * 1. 贷款总额取整规则
 * 2. 头大尾小分年借款分配
 * 3. 单利计息：当期利息 = (期初本金累计 + 当期借款金额 ÷ 2) × 年利率
 */
export declare function calculateConstructionInterest(buildingInvestment: number, loanRatio: number | undefined, interestRate: number, constructionYears: number, customLoanAmount?: number): LoanCalculationResult;
//# sourceMappingURL=loanCalculation.d.ts.map