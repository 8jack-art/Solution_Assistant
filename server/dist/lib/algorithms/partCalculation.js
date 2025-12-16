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
 * @param partAItems 第一部分的子项数据（可选，用于精确计算各项费用）
 * @param isAgricultureWaterProject 是否为农田、水利项目（默认true，开启后市政公用设施费为0）
 */
export function calculatePartB(partATotal, landCost, totalFunding, partAItems, isAgricultureWaterProject = true) {
    // 确保landCost是数字
    const numericLandCost = Number(landCost) || 0;
    // 计算工程费用 = 第一部分合计 - 设备购置费
    let equipmentCost = 0;
    if (partAItems && partAItems.length > 0) {
        equipmentCost = partAItems.reduce((sum, item) => sum + (item.设备购置费 || 0), 0);
    }
    const engineeringCost = partATotal - equipmentCost;
    // DEBUG: 输出建安费原值、设备原值的计算过程
    console.log('\n========== 工程其它费用计算DEBUG信息 ==========\n');
    console.log(`第一部分工程费用总额 (partATotal): ${partATotal.toFixed(2)} 万元`);
    console.log(`设备购置费 (equipmentCost): ${equipmentCost.toFixed(2)} 万元`);
    console.log(`建安费原值 (engineeringCost = partATotal - equipmentCost): ${engineeringCost.toFixed(2)} 万元`);
    console.log(`土地费用 (landCost): ${numericLandCost.toFixed(2)} 万元`);
    console.log(`项目总资金 (totalFunding): ${totalFunding ? totalFunding.toFixed(2) : '未传入'} 万元`);
    // 计算待抵扣进销项税（设备购置费的1.13倍的进项税）
    const inputTaxRate = 0.13; // 13%的进项税率
    const deductibleInputTax = equipmentCost / (1 + inputTaxRate) * inputTaxRate;
    console.log(`\n待抵扣进销项税计算:`);
    console.log(`  进项税率: ${(inputTaxRate * 100).toFixed(0)}%`);
    console.log(`  不含税设备费 = ${equipmentCost.toFixed(2)} / 1.13 = ${(equipmentCost / (1 + inputTaxRate)).toFixed(2)} 万元`);
    console.log(`  待抵扣进销项税 = 不含税设备费 × 13% = ${deductibleInputTax.toFixed(2)} 万元`);
    console.log(`\n==========================================\n`);
    // 如果传入了项目总资金，使用新的分段费率算法计算建设单位管理费
    const managementFee = totalFunding
        ? calculateConstructionManagementFee(totalFunding, numericLandCost)
        : partATotal * 0.015; // 兼容旧算法（简化计算）
    // 计算勘察设计费（用于服务招标费计算）
    const surveyDesignFee = calculateSurveyDesignFee(engineeringCost);
    // 计算监理费（用于服务招标费计算）
    const supervisionFee = calculateSupervisionFee(engineeringCost);
    // 服务费用 = 勘察设计费 + 监理费
    const serviceCost = surveyDesignFee + supervisionFee;
    // 计算招标代理费（工程招标 + 货物招标 + 服务招标）
    const biddingAgencyFee = calculateBiddingAgencyFee(engineeringCost, equipmentCost, serviceCost);
    // 计算前期工作咨询费（需要项目总资金）
    const preliminaryConsultingFee = totalFunding
        ? calculatePreliminaryConsultingFee(totalFunding)
        : partATotal * 0.005; // 兼容旧算法
    const children = [
        {
            序号: '1',
            工程或费用名称: '建设单位管理费',
            合计: managementFee,
            备注: totalFunding
                ? '按分段费率表计算'
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
            备注: '按工程、货物、服务分段费率计算'
        },
        {
            序号: '4',
            工程或费用名称: '建设工程监理费',
            合计: supervisionFee,
            备注: '按工程费用查表插值计算'
        },
        {
            序号: '5',
            工程或费用名称: '项目前期工作咨询费',
            合计: preliminaryConsultingFee,
            备注: totalFunding ? '按总投资分段费率计算' : '按第一部分工程费的0.5%计取'
        },
        {
            序号: '6',
            工程或费用名称: '勘察设计费',
            合计: surveyDesignFee,
            备注: '含勘察费(1.5%)和设计费(查表插值)'
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
            合计: calculateEnvironmentalReportFee(partATotal),
            备注: '按第一部分工程费的0.3%计取'
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
            合计: isAgricultureWaterProject ? 0 : calculateMunicipalFacilityFee(partATotal),
            备注: isAgricultureWaterProject ? '' : '按第一部分工程费的1.5%计取'
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