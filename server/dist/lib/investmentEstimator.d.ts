export interface EstimateParams {
    constructionCost: number;
    equipmentCost: number;
    installationCost: number;
    otherCost: number;
    landCost: number;
    basicReserveRate: number;
    priceReserveRate: number;
    constructionPeriod: number;
    loanRate: number;
    customLoanAmount?: number;
}
export interface EstimateResult {
    constructionCost: number;
    equipmentCost: number;
    installationCost: number;
    otherCost: number;
    landCost: number;
    basicReserve: number;
    priceReserve: number;
    buildingInvestment: number;
    constructionInterest: number;
    totalInvestment: number;
    loanAmount: number;
    iterationCount: number;
    gapRate?: number;
}
export declare function estimateInvestment(params: EstimateParams): EstimateResult;
//# sourceMappingURL=investmentEstimator.d.ts.map