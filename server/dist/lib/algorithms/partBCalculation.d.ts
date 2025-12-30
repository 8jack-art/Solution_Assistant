/**
 * B部分工程其它费用计算算法模块
 * 实现工程其它费用各子项的详细计算逻辑
 * 包含分档内插计算算法
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
export declare function calculateConstructionManagementFee(totalFunding: number, landCost: number): number;
/**
 * 计算土地费用
 * 直接使用传入的土地费用值
 * @param landCost 土地费用（万元）
 * @returns 土地费用（万元）
 */
export declare function calculateLandCost(landCost: number): number;
/**
 * 计算招标代理费
 * 按第一部分工程费用的0.8%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 招标代理费（万元）
 */
export declare function calculateBiddingAgencyFee(partATotal: number): number;
/**
 * 计算建设工程监理费
 * 按工程费用分档内插计算
 * @param engineeringCost 工程费用 = 建设工程费 + 安装工程费（万元）
 * @returns 建设工程监理费（万元）
 */
export declare function calculateSupervisionFee(engineeringCost: number): number;
/**
 * 计算项目前期工作咨询费
 * 按总投资额分档内插计算（5个子项之和）
 * @param totalFunding 项目总资金（万元）
 * @returns 项目前期工作咨询费（万元）
 */
export declare function calculatePreliminaryConsultingFee(totalFunding: number): number;
/**
 * 计算勘察设计费
 * 勘察费 = 初勘及详细勘察费 + 施工勘察费
 * 设计费 = 基本设计费 + 竣工图编制费
 * @param engineeringCost 工程费用 = 建设工程费 + 安装工程费（万元）
 * @returns 勘察设计费（万元）
 */
export declare function calculateSurveyDesignFee(engineeringCost: number): number;
/**
 * 计算研究试验费
 * 按第一部分工程费用的1%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 研究试验费（万元）
 */
export declare function calculateResearchTestFee(partATotal: number): number;
/**
 * 计算编制环境影响报告书费用
 * 按投资额分档内插计算
 * 编制环评报告书编制费 = 基本编制费 × 敏感系数(0.8)
 * @param totalFunding 项目总资金（万元）
 * @returns 编制环境影响报告书费用（万元）
 */
export declare function calculateEnvironmentalReportFee(totalFunding: number): number;
/**
 * 计算场地准备及临时设施费
 * 按第一部分工程费用的2%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 场地准备及临时设施费（万元）
 */
export declare function calculateSitePreparationFee(partATotal: number): number;
/**
 * 计算工程保险费
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 工程保险费（万元）
 */
export declare function calculateInsuranceFee(partATotal: number): number;
/**
 * 计算工程检验试验费
 * 按第一部分工程费用的0.6%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 工程检验试验费（万元）
 */
export declare function calculateInspectionTestFee(partATotal: number): number;
/**
 * 计算市政公用设施费
 * 按第一部分工程费用的1.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 市政公用设施费（万元）
 */
export declare function calculateMunicipalFacilityFee(partATotal: number): number;
/**
 * 计算其它费用
 * 按第一部分工程费用的0.5%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 其它费用（万元）
 */
export declare function calculateOtherFee(partATotal: number): number;
//# sourceMappingURL=partBCalculation.d.ts.map