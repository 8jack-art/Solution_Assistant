/**
 * 投资估算各部分计算算法模块
 * 实现A、B、C、D、E、G各部分的计算逻辑
 */
export interface InvestmentItem {
    序号: string;
    工程或费用名称: string;
    建设工程费?: number;
    设备购置费?: number;
    安装工程费?: number;
    其它费用?: number;
    合计: number;
    占总投资比例?: number;
    备注?: string;
    children?: InvestmentItem[];
}
/**
 * 计算B部分：工程其它费用
 * @param partATotal 第一部分工程费用总额
 * @param landCost 土地费用
 * @param totalFunding 项目总资金（可选，用于建设单位管理费计算）
 * @param engineeringCost 工程费用 = 建设工程费 + 安装工程费（用于勘察设计费、监理费等计算）
 * @param equipmentCost 设备购置费（用于货物招标费计算）
 */
export declare function calculatePartB(partATotal: number, landCost: number, totalFunding?: number, engineeringCost?: number, equipmentCost?: number, projectType?: 'agriculture' | 'construction'): InvestmentItem;
/**
 * 生成A部分的初始子项（使用AI生成的数据或默认数据）
 */
export declare function generatePartAItems(projectName: string, targetInvestment: number, aiGeneratedItems?: Array<{
    name: string;
    construction_cost: number;
    equipment_cost: number;
    installation_cost: number;
    other_cost: number;
    remark?: string;
}>): InvestmentItem[];
//# sourceMappingURL=partCalculation.d.ts.map