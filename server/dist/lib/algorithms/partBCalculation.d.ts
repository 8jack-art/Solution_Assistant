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
export declare function calculateBiddingAgencyFee(constructionCost: number, equipmentCost?: number, serviceCost?: number): number;
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
export declare function calculateSupervisionFee(engineeringCost: number): number;
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
export declare function calculatePreliminaryConsultingFee(totalInvestment: number): number;
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
 * 按第一部分工程费用的0.3%计取
 * @param partATotal 第一部分工程费用总额（万元）
 * @returns 编制环境影响报告书费用（万元）
 */
export declare function calculateEnvironmentalReportFee(partATotal: number): number;
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