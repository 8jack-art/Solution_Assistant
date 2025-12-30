/**
 * 投资估算各部分计算算法模块
 * 实现A、B、C、D、E、G各部分的计算逻辑
 */
import { calculateConstructionManagementFee, calculateLandCost, calculateBiddingAgencyFee, calculateSupervisionFee, calculatePreliminaryConsultingFee, calculateSurveyDesignFee, calculateResearchTestFee, calculateEnvironmentalReportFee, calculateSitePreparationFee, calculateInsuranceFee, calculateInspectionTestFee, calculateMunicipalFacilityFee, calculateOtherFee } from './partBCalculation.js';
/**
 * 计算B部分：工程其它费用
 * @param partATotal 第一部分工程费用总额
 * @param landCost 土地费用
 * @param totalFunding 项目总资金（可选，用于建设单位管理费计算）
 * @param engineeringCost 工程费用 = 建设工程费 + 安装工程费（用于勘察设计费、监理费等计算）
 * @param equipmentCost 设备购置费（用于货物招标费计算）
 */
export function calculatePartB(partATotal, landCost, totalFunding, engineeringCost, equipmentCost, projectType) {
    // 确保landCost是数字
    const numericLandCost = Number(landCost) || 0;
    // 如果传入了项目总资金，使用新的分段费率算法计算建设单位管理费
    const managementFee = totalFunding
        ? calculateConstructionManagementFee(totalFunding, numericLandCost)
        : partATotal * 0.015; // 兼容旧算法（简化计算）
    // 计算监理费、勘察设计费（需要用于后续计算）
    const supervisionFee = calculateSupervisionFee(engineeringCost ?? partATotal);
    const surveyDesignFee = calculateSurveyDesignFee(engineeringCost ?? partATotal);
    // 勘察费约为勘察设计费的15%（初勘3% + 施工勘察12%）
    const surveyFee = surveyDesignFee * 0.15;
    // 设计费约为勘察设计费的85%（基本设计费+竣工图编制费）
    const designFee = surveyDesignFee * 0.85;
    // 计算招标代理费（3个子项之和）
    const biddingAgencyFee = calculateBiddingAgencyFee(engineeringCost ?? partATotal, // 工程费用
    equipmentCost ?? 0, // 设备购置费
    supervisionFee, // 监理费
    surveyFee, // 勘察费
    designFee // 设计费
    );
    const children = [
        {
            序号: '1',
            工程或费用名称: '建设单位管理费',
            合计: managementFee,
            备注: totalFunding
                ? '按分段费率表计算（详见算法文档）'
                : '按第一部分工程费的1.5%计取'
        },
        {
            序号: '2',
            工程或费用名称: '土地费用',
            合计: calculateLandCost(numericLandCost),
            备注: '根据用地模式计算'
        },
        {
            序号: '3',
            工程或费用名称: '招标代理费',
            合计: biddingAgencyFee,
            备注: '差额定率分档累进（工程+货物+服务招标费）'
        },
        {
            序号: '4',
            工程或费用名称: '建设工程监理费',
            合计: calculateSupervisionFee(engineeringCost ?? partATotal),
            备注: '按工程费用分档内插计算'
        },
        {
            序号: '5',
            工程或费用名称: '项目前期工作咨询费',
            合计: calculatePreliminaryConsultingFee(totalFunding ?? partATotal),
            备注: '按总投资额分档内插计算（5个子项之和）'
        },
        {
            序号: '6',
            工程或费用名称: '勘察设计费',
            合计: calculateSurveyDesignFee(engineeringCost ?? partATotal),
            备注: '按工程费的2.5%计取'
        },
        {
            序号: '7',
            工程或费用名称: '研究试验费',
            合计: calculateResearchTestFee(partATotal),
            备注: '按第一部分工程费的1%计取'
        },
        {
            序号: '8',
            工程或费用名称: '编制环境影响报告书',
            合计: calculateEnvironmentalReportFee(totalFunding ?? partATotal),
            备注: '按总投资额分档内插计算×敏感系数0.8'
        },
        {
            序号: '9',
            工程或费用名称: '场地准备及临时设施费',
            合计: calculateSitePreparationFee(partATotal),
            备注: '按第一部分工程费的2%计取'
        },
        {
            序号: '10',
            工程或费用名称: '工程保险费',
            合计: calculateInsuranceFee(partATotal),
            备注: '按第一部分工程费的0.5%计取'
        },
        {
            序号: '11',
            工程或费用名称: '工程检验试验费',
            合计: calculateInspectionTestFee(partATotal),
            备注: '按第一部分工程费的0.6%计取'
        },
        {
            序号: '12',
            工程或费用名称: '市政公用设施费',
            合计: calculateMunicipalFacilityFee(partATotal, projectType),
            备注: projectType === 'agriculture' ? '农业项目免收' : '按第一部分工程费的1.5%计取'
        },
        {
            序号: '13',
            工程或费用名称: '其它',
            合计: calculateOtherFee(partATotal),
            备注: '按第一部分工程费的0.5%计取'
        }
    ];
    // 确保累加时都是数字
    const total = children.reduce((sum, item) => sum + (Number(item.合计) || 0), 0);
    return {
        序号: 'B',
        工程或费用名称: '第二部分 工程其它费用',
        合计: total,
        备注: '管理性、咨询性和专项费用合计',
        children
    };
}
/**
 * 生成A部分的初始子项（使用AI生成的数据或默认数据）
 */
export function generatePartAItems(projectName, targetInvestment, aiGeneratedItems) {
    // 如果有AI生成的子项，使用AI数据
    if (aiGeneratedItems && aiGeneratedItems.length > 0) {
        const chineseNumbers = ['一', '二', '三', '四', '五'];
        return aiGeneratedItems.map((item, index) => {
            const total = item.construction_cost + item.equipment_cost + item.installation_cost + item.other_cost;
            return {
                序号: chineseNumbers[index] || `${index + 1}`,
                工程或费用名称: item.name,
                建设工程费: item.construction_cost,
                设备购置费: item.equipment_cost,
                安装工程费: item.installation_cost,
                其它费用: item.other_cost,
                合计: total,
                备注: item.remark || ''
            };
        });
    }
    // 否则使用默认的简化版本
    // 初始分配比例
    const baseRatio = 0.5; // A部分大约占总投资的50%
    const items = [
        {
            序号: '一',
            工程或费用名称: '主体工程',
            建设工程费: targetInvestment * baseRatio * 0.4,
            设备购置费: targetInvestment * baseRatio * 0.3,
            安装工程费: targetInvestment * baseRatio * 0.15,
            其它费用: targetInvestment * baseRatio * 0.05,
            合计: targetInvestment * baseRatio * 0.9,
            备注: ''
        },
        {
            序号: '二',
            工程或费用名称: '辅助工程',
            建设工程费: targetInvestment * baseRatio * 0.05,
            设备购置费: targetInvestment * baseRatio * 0.02,
            安装工程费: targetInvestment * baseRatio * 0.01,
            其它费用: targetInvestment * baseRatio * 0.01,
            合计: targetInvestment * baseRatio * 0.09,
            备注: ''
        },
        {
            序号: '三',
            工程或费用名称: '其它工程',
            建设工程费: targetInvestment * baseRatio * 0.005,
            设备购置费: 0,
            安装工程费: 0,
            其它费用: targetInvestment * baseRatio * 0.005,
            合计: targetInvestment * baseRatio * 0.01,
            备注: ''
        }
    ];
    return items;
}
//# sourceMappingURL=partCalculation.js.map