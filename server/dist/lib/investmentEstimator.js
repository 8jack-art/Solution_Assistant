export function estimateInvestment(params) {
    const { constructionCost, equipmentCost, installationCost, otherCost, landCost, basicReserveRate, priceReserveRate, constructionPeriod, loanRate, customLoanAmount } = params;
    const baseInvestment = constructionCost + equipmentCost + installationCost + otherCost + landCost;
    const basicReserve = baseInvestment * basicReserveRate;
    const priceReserve = baseInvestment * priceReserveRate;
    let buildingInvestment = baseInvestment + basicReserve + priceReserve;
    const maxIterations = 100;
    const tolerance = 0.0001;
    let iterationCount = 0;
    let loanAmount = customLoanAmount || 0;
    let constructionInterest = 0;
    let totalInvestment = buildingInvestment;
    if (!customLoanAmount) {
        let prevLoanAmount = 0;
        while (iterationCount < maxIterations) {
            const prevConstructionInterest = constructionInterest;
            constructionInterest = (loanAmount * loanRate * (constructionPeriod + 1)) / 2;
            totalInvestment = buildingInvestment + constructionInterest;
            loanAmount = totalInvestment * 0.7;
            if (Math.abs(loanAmount - prevLoanAmount) < tolerance &&
                Math.abs(constructionInterest - prevConstructionInterest) < tolerance) {
                break;
            }
            prevLoanAmount = loanAmount;
            iterationCount++;
        }
    }
    else {
        constructionInterest = (customLoanAmount * loanRate * (constructionPeriod + 1)) / 2;
        totalInvestment = buildingInvestment + constructionInterest;
    }
    const gapRate = buildingInvestment > 0 ? Math.abs(totalInvestment - buildingInvestment) / buildingInvestment : 0;
    return {
        constructionCost,
        equipmentCost,
        installationCost,
        otherCost,
        landCost,
        basicReserve,
        priceReserve,
        buildingInvestment,
        constructionInterest,
        totalInvestment,
        loanAmount,
        iterationCount,
        gapRate
    };
}
//# sourceMappingURL=investmentEstimator.js.map