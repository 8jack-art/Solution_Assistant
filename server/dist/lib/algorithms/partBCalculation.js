/**
 * B部分工程其它费用计算算法模块
 * 实现工程其它费用各子项的详细计算逻辑
 */
/**
 * 计算建设单位管理费
 * 根据分段费率表计算，采用累进制
 *
 * @param totalFunding 项目总资金（万元）
 * @param landCost 土地费用（万元）
 * @returns 建设单位管理费（万元）
 *
 * 费率表：
 * - 1000以下: 2%
 * - 1001~5000: 1.5%
 * - 5001~10000: 1.2%
 * - 10001~50000: 1%
 * - 50001~100000: 0.8%
 * - 100000以上: 0.4%
 *
 * 算法说明：
 * 1. 基数 = 工程总概算 - 土地费用 - 建设单位管理费
 * 2. 采用迭代法求解（因为管理费在基数中）
 * 3. 最大迭代10次，收敛条件：|新值 - 旧值| < 0.01
 */
export function calculateConstructionManagementFee(totalFunding, landCost) {
    const MAX_ITERATIONS = 10;
    const CONVERGENCE_THRESHOLD = 0.01;
    let managementFee = 0;
    let previousFee = 0;
    // 迭代计算
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        // 计算基数 = 工程总概算 - 土地费用 - 建设单位管理费
        const base = totalFunding - landCost - managementFee;
        // 根据基数计算新的管理费
        managementFee = calculateFeeBySegments(base);
        // 检查收敛
        if (Math.abs(managementFee - previousFee) < CONVERGENCE_THRESHOLD) {
            break;
        }
        previousFee = managementFee;
    }
    return managementFee;
}
/**
 * 根据分段费率表计算费用（累进制）
 * @param base 计算基数（万元）
 * @returns 计算出的费用（万元）
 */
function calculateFeeBySegments(base) {
    if (base <= 0)
        return 0;
    let fee = 0;
    if (base <= 1000) {
        // 1000以下: 2%
        fee = base * 0.02;
    }
    else if (base <= 5000) {
        // 1001~5000: 1.5%
        fee = 1000 * 0.02 + (base - 1000) * 0.015;
    }
    else if (base <= 10000) {
        // 5001~10000: 1.2%
        fee = 1000 * 0.02 + 4000 * 0.015 + (base - 5000) * 0.012;
    }
    else if (base <= 50000) {
        // 10001~50000: 1%
        fee = 1000 * 0.02 + 4000 * 0.015 + 5000 * 0.012 + (base - 10000) * 0.01;
    }
    else if (base <= 100000) {
        // 50001~100000: 0.8%
        fee = 1000 * 0.02 + 4000 * 0.015 + 5000 * 0.012 + 40000 * 0.01 + (base - 50000) * 0.008;
    }
    else {
        // 100000以上: 0.4%
        fee = 1000 * 0.02 + 4000 * 0.015 + 5000 * 0.012 + 40000 * 0.01 + 50000 * 0.008 + (base - 100000) * 0.004;
    }
    return fee;
}
/**
 * 计算土地费用
 * 直接使用传入的土地费用值
 * @param landCost 土地费用（万元）
 * @returns 土地费用（万元）
 */
export function calculateLandCost(landCost) {
    return landCost;
}
/**
 * 计算招标代理费
 * 由工程招标、货物招标、服务招标三部分组成，采用分档累进费率
 *
 * @param constructionCost 建筑安装工程费用（万元）= 第一部分合计 - 设备购置费
 * @param equipmentCost 货物(设备)费用（万元）
 * @param serviceCost 服务费用（万元）= 勘察设计费 + 监理费
 * @returns 招标代理费（万元）
 *
 * 费率表：
 * - 工程招标费率(‰): 100以下6.3, 100-500为4.41, 500-1000为3.465, 1000-5000为2.205,
 *   5000-10000为1.26, 10000-50000为0.315, 50000-100000为0.221, 100000-500000为0.05,
 *   500000-1000000为0.038, 1000000以上为0.025
 * - 货物招标费率(‰): 100以下9.45, 100-500为6.93, 500-1000为5.04, 1000-5000为3.15,
 *   5000-10000为1.575, 10000-50000为0.315, 50000-100000为0.221, 100000-500000为0.05,
 *   500000-1000000为0.038, 1000000以上为0.025
 * - 服务招标费率(‰): 100以下9.45, 100-500为5.04, 500-1000为2.853, 1000-5000为1.575,
 *   5000-10000为0.63, 10000-50000为0.315, 50000-100000为0.221, 100000-500000为0.05,
 *   500000-1000000为0.038, 1000000以上为0.025
 */
export function calculateBiddingAgencyFee(constructionCost, equipmentCost = 0, serviceCost = 0) {
    // 工程招标费率表(‰)
    const engineeringRates = [
        { limit: 100, rate: 6.3 },
        { limit: 500, rate: 4.41 },
        { limit: 1000, rate: 3.465 },
        { limit: 5000, rate: 2.205 },
        { limit: 10000, rate: 1.26 },
        { limit: 50000, rate: 0.315 },
        { limit: 100000, rate: 0.221 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.038 },
        { limit: Infinity, rate: 0.025 }
    ];
    // 货物招标费率表(‰)
    const goodsRates = [
        { limit: 100, rate: 9.45 },
        { limit: 500, rate: 6.93 },
        { limit: 1000, rate: 5.04 },
        { limit: 5000, rate: 3.15 },
        { limit: 10000, rate: 1.575 },
        { limit: 50000, rate: 0.315 },
        { limit: 100000, rate: 0.221 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.038 },
        { limit: Infinity, rate: 0.025 }
    ];
    // 服务招标费率表(‰)
    const serviceRates = [
        { limit: 100, rate: 9.45 },
        { limit: 500, rate: 5.04 },
        { limit: 1000, rate: 2.853 },
        { limit: 5000, rate: 1.575 },
        { limit: 10000, rate: 0.63 },
        { limit: 50000, rate: 0.315 },
        { limit: 100000, rate: 0.221 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.038 },
        { limit: Infinity, rate: 0.025 }
    ];
    const engineeringFee = calculateProgressiveFee(constructionCost, engineeringRates);
    const goodsFee = calculateProgressiveFee(equipmentCost, goodsRates);
    const serviceFee = calculateProgressiveFee(serviceCost, serviceRates);
    return engineeringFee + goodsFee + serviceFee;
}
/**
 * 累进法计算费用的通用函数
 * @param base 计费基数（万元）
 * @param rates 费率表
 * @returns 计算出的费用（万元）
 */
function calculateProgressiveFee(base, rates) {
    if (base <= 0)
        return 0;
    let fee = 0;
    let previousLimit = 0;
    for (const { limit, rate } of rates) {
        if (base <= previousLimit)
            break;
        const currentBase = Math.min(base, limit) - previousLimit;
        fee += currentBase * rate / 1000; // 费率是‰，需除以1000
        if (base <= limit)
            break;
        previousLimit = limit;
    }
    return fee;
}
/**
 * 计算建设工程监理费
 * 按工程费用分档计算，采用直线内插法
 *
 * @param engineeringCost 工程费用（万元）= 第一部分合计 - 设备购置费
 * @returns 建设工程监理费（万元）
 *
 * 收费基价表：
 * 500万->13.20, 1000万->24.08, 3000万->62.48, 5000万->96.64,
 * 8000万->144.80, 10000万->174.88, 20000万->314.72, 40000万->566.56,
 * 60000万->793.12, 80000万->1004.64, 100000万->1205.60, 200000万->2170.00,
 * 400000万->3906.08, 600000万->5468.48, 800000万->6926.72, 1000000万->8312.08
 */
export function calculateSupervisionFee(engineeringCost) {
    const feeTable = [
        { cost: 500, fee: 13.20 },
        { cost: 1000, fee: 24.08 },
        { cost: 3000, fee: 62.48 },
        { cost: 5000, fee: 96.64 },
        { cost: 8000, fee: 144.80 },
        { cost: 10000, fee: 174.88 },
        { cost: 20000, fee: 314.72 },
        { cost: 40000, fee: 566.56 },
        { cost: 60000, fee: 793.12 },
        { cost: 80000, fee: 1004.64 },
        { cost: 100000, fee: 1205.60 },
        { cost: 200000, fee: 2170.00 },
        { cost: 400000, fee: 3906.08 },
        { cost: 600000, fee: 5468.48 },
        { cost: 800000, fee: 6926.72 },
        { cost: 1000000, fee: 8312.08 }
    ];
    return interpolateFromTable(engineeringCost, feeTable);
}
/**
 * 计算项目前期工作咨询费
 * 包含4项：编制项目建议书、编制可行性研究报告、评估项目建议书、
 * 评估可行性研究报告、初步设计文件评估咨询
 *
 * @param totalInvestment 项目总资金（万元）
 * @returns 项目前期工作咨询费（万元）
 *
 * 费用区间表（取中位数）：
 * - 编制项目建议书: 500以下1.0, 500-1000为1.6, 1000-3000为3.4, 3000-10000为8.0,
 *   10000-50000为20.4, 50000-100000为36.8, 100000-500000为62.0, 500000以上为90.0
 * - 编制可行性研究报告: 500以下2.4, 500-1000为4.0, 1000-3000为7.2, 3000-10000为16.0,
 *   10000-50000为41.2, 50000-100000为74.0, 100000-500000为124.0, 500000以上为180.0
 * - 评估项目建议书: 500以下0.6, 500-1000为1.0, 1000-3000为2.2, 3000-10000为4.8,
 *   10000-50000为8.0, 50000-100000为10.8, 100000-500000为12.8, 500000以上为14.8
 * - 评估可行性研究报告: 500以下1.0, 500-1000为1.6, 1000-3000为3.0, 3000-10000为6.0,
 *   10000-50000为10.0, 50000-100000为14.0, 100000-500000为18.0, 500000以上为24.0
 * - 初步设计文件评估咨询: 500以下1.0, 500-1000为1.6, 1000-3000为3.0, 3000-10000为6.0,
 *   10000-50000为10.0, 50000-100000为14.0, 100000-500000为18.0, 500000以上为24.0
 */
export function calculatePreliminaryConsultingFee(totalInvestment) {
    // 编制项目建议书费用表（取区间中位数）
    const proposal = [
        { limit: 500, fee: 1.0 },
        { limit: 1000, fee: 1.6 },
        { limit: 3000, fee: 3.4 },
        { limit: 10000, fee: 8.0 },
        { limit: 50000, fee: 20.4 },
        { limit: 100000, fee: 36.8 },
        { limit: 500000, fee: 62.0 },
        { limit: Infinity, fee: 90.0 }
    ];
    // 编制可行性研究报告费用表
    const feasibility = [
        { limit: 500, fee: 2.4 },
        { limit: 1000, fee: 4.0 },
        { limit: 3000, fee: 7.2 },
        { limit: 10000, fee: 16.0 },
        { limit: 50000, fee: 41.2 },
        { limit: 100000, fee: 74.0 },
        { limit: 500000, fee: 124.0 },
        { limit: Infinity, fee: 180.0 }
    ];
    // 评估项目建议书费用表
    const proposalEval = [
        { limit: 500, fee: 0.6 },
        { limit: 1000, fee: 1.0 },
        { limit: 3000, fee: 2.2 },
        { limit: 10000, fee: 4.8 },
        { limit: 50000, fee: 8.0 },
        { limit: 100000, fee: 10.8 },
        { limit: 500000, fee: 12.8 },
        { limit: Infinity, fee: 14.8 }
    ];
    // 评估可行性研究报告费用表
    const feasibilityEval = [
        { limit: 500, fee: 1.0 },
        { limit: 1000, fee: 1.6 },
        { limit: 3000, fee: 3.0 },
        { limit: 10000, fee: 6.0 },
        { limit: 50000, fee: 10.0 },
        { limit: 100000, fee: 14.0 },
        { limit: 500000, fee: 18.0 },
        { limit: Infinity, fee: 24.0 }
    ];
    // 初步设计文件评估咨询费用表（与评估可研相同）
    const designEval = feasibilityEval;
    const fee1 = interpolateFromTable(totalInvestment, proposal);
    const fee2 = interpolateFromTable(totalInvestment, feasibility);
    const fee3 = interpolateFromTable(totalInvestment, proposalEval);
    const fee4 = interpolateFromTable(totalInvestment, feasibilityEval);
    const fee5 = interpolateFromTable(totalInvestment, designEval);
    return fee1 + fee2 + fee3 + fee4 + fee5;
}
/**
 * 计算勘察设计费
 * 由初步及详细勘察费(0.3%)、施工勘察费(1.2%)、工程设计费(查表插值)组成
 *
 * @param engineeringCost 工程费用（万元）= 第一部分合计 - 设备购置费
 * @returns 勘察设计费（万元）
 *
 * 工程设计费收费基价表：
 * 200万->8.10, 500万->18.81, 1000万->34.92, 3000万->93.42, 5000万->147.51,
 * 8000万->224.64, 10000万->274.32, 20000万->510.12, 40000万->948.60,
 * 60000万->1363.68, 80000万->1764.09, 100000万->2154.06, 200000万->4005.72,
 * 400000万->7449.03, 600000万->10707.75, 800000万->13852.26, 1000000万->16914.42,
 * 2000000万->31454.01
 */
export function calculateSurveyDesignFee(engineeringCost) {
    // 初步及详细勘察费
    const preliminarySurvey = engineeringCost * 0.003;
    // 施工勘察费
    const constructionSurvey = engineeringCost * 0.012;
    // 工程设计费收费基价表
    const designFeeTable = [
        { cost: 200, fee: 8.10 },
        { cost: 500, fee: 18.81 },
        { cost: 1000, fee: 34.92 },
        { cost: 3000, fee: 93.42 },
        { cost: 5000, fee: 147.51 },
        { cost: 8000, fee: 224.64 },
        { cost: 10000, fee: 274.32 },
        { cost: 20000, fee: 510.12 },
        { cost: 40000, fee: 948.60 },
        { cost: 60000, fee: 1363.68 },
        { cost: 80000, fee: 1764.09 },
        { cost: 100000, fee: 2154.06 },
        { cost: 200000, fee: 4005.72 },
        { cost: 400000, fee: 7449.03 },
        { cost: 600000, fee: 10707.75 },
        { cost: 800000, fee: 13852.26 },
        { cost: 1000000, fee: 16914.42 },
        { cost: 2000000, fee: 31454.01 }
    ];
    const designFee = interpolateFromTable(engineeringCost, designFeeTable);
    return preliminarySurvey + constructionSurvey + designFee;
}
/**
 * 计算研究试验费
 * 按第一部分工程费用的1%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 研究试验费（万元）
 */
export function calculateResearchTestFee(partATotal) {
    return partATotal * 0.01;
}
/**
 * 计算编制环境影响报告书费用
 * 按第一部分工程费用的0.3%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 编制环境影响报告书费用（万元）
 */
export function calculateEnvironmentalReportFee(partATotal) {
    return partATotal * 0.003;
}
/**
 * 计算场地准备及临时设施费
 * 按第一部分工程费用的2%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 场地准备及临时设施费（万元）
 */
export function calculateSitePreparationFee(partATotal) {
    return partATotal * 0.02;
}
/**
 * 计算工程保险费
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 工程保险费（万元）
 */
export function calculateInsuranceFee(partATotal) {
    return partATotal * 0.005;
}
/**
 * 计算工程检验试验费
 * 按第一部分工程费用的0.6%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 工程检验试验费（万元）
 */
export function calculateInspectionTestFee(partATotal) {
    return partATotal * 0.006;
}
/**
 * 计算市政公用设施费
 * 按第一部分工程费用的1.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 市政公用设施费（万元）
 */
export function calculateMunicipalFacilityFee(partATotal) {
    return partATotal * 0.015;
}
/**
 * 计算其它费用
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 其它费用（万元）
 */
export function calculateOtherFee(partATotal) {
    return partATotal * 0.005;
}
/**
 * 通用的线性插值函数
 * @param value 待查询的值
 * @param table 查询表 {cost/limit: 数值, fee: 费用}
 * @returns 插值计算的结果
 */
function interpolateFromTable(value, table) {
    if (value <= 0)
        return 0;
    // 处理小于最小值的情况
    const firstEntry = table[0];
    const firstKey = firstEntry.cost ?? firstEntry.limit ?? 0;
    if (value <= firstKey) {
        return firstEntry.fee;
    }
    // 处理大于最大值的情况
    const lastEntry = table[table.length - 1];
    const lastKey = lastEntry.cost ?? lastEntry.limit ?? Infinity;
    if (value >= lastKey) {
        return lastEntry.fee;
    }
    // 查找所在区间并插值
    for (let i = 0; i < table.length - 1; i++) {
        const current = table[i];
        const next = table[i + 1];
        const currentKey = current.cost ?? current.limit ?? 0;
        const nextKey = next.cost ?? next.limit ?? 0;
        if (value >= currentKey && value <= nextKey) {
            // 线性插值公式: y = y1 + (y2 - y1) * (x - x1) / (x2 - x1)
            return current.fee + (next.fee - current.fee) * (value - currentKey) / (nextKey - currentKey);
        }
    }
    return 0;
}
//# sourceMappingURL=partBCalculation.js.map