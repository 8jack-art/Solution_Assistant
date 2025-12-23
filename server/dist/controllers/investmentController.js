import { z } from 'zod';
import { InvestmentProjectModel } from '../models/InvestmentProject.js';
import { InvestmentEstimateModel } from '../models/InvestmentEstimate.js';
import { estimateInvestment } from '../lib/investmentEstimator.js';
import { calculateInvestmentEstimate } from '../lib/investmentCalculator.js';
const saveEstimateSchema = z.object({
    project_id: z.string(),
    estimate_data: z.any().optional(), // 允许直接保存estimate_data
    construction_cost: z.number().min(0).optional(),
    equipment_cost: z.number().min(0).optional(),
    installation_cost: z.number().min(0).optional(),
    other_cost: z.number().min(0).optional(),
    land_cost: z.number().min(0).optional(),
    basic_reserve_rate: z.number().min(0).max(1).default(0.05),
    price_reserve_rate: z.number().min(0).max(1).default(0.03),
    construction_period: z.number().int().min(1).max(10).default(3),
    loan_rate: z.number().min(0).max(1).default(0.049),
    custom_loan_amount: z.number().optional(),
});
const calculateEstimateSchema = saveEstimateSchema.omit({ project_id: true });
export class InvestmentController {
    static async calculate(req, res) {
        try {
            const params = calculateEstimateSchema.parse(req.body);
            const estimateParams = {
                constructionCost: params.construction_cost || 0,
                equipmentCost: params.equipment_cost || 0,
                installationCost: params.installation_cost || 0,
                otherCost: params.other_cost || 0,
                landCost: params.land_cost || 0,
                basicReserveRate: params.basic_reserve_rate,
                priceReserveRate: params.price_reserve_rate,
                constructionPeriod: params.construction_period,
                loanRate: params.loan_rate,
                customLoanAmount: params.custom_loan_amount
            };
            const result = estimateInvestment(estimateParams);
            res.json({
                success: true,
                data: { estimate: result }
            });
        }
        catch (error) {
            console.error('计算投资估算失败:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: '输入验证失败',
                    message: error.errors[0].message
                });
            }
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async save(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const parsedBody = saveEstimateSchema.parse(req.body);
            const { project_id, estimate_data, construction_cost, equipment_cost, installation_cost, other_cost, land_cost, basic_reserve_rate, price_reserve_rate, construction_period, loan_rate, custom_loan_amount } = parsedBody;
            const project = await InvestmentProjectModel.findById(project_id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: '项目不存在'
                });
            }
            if (!isAdmin && project.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权操作此项目'
                });
            }
            if (project.is_locked) {
                return res.status(403).json({
                    success: false,
                    error: '项目已锁定，无法保存估算'
                });
            }
            // 检查是否存在现有估算
            const existingEstimate = await InvestmentEstimateModel.findByProjectId(project_id);
            // 模式1：如果直接传入estimate_data，则直接更新
            if (estimate_data) {
                console.log('直接保存estimate_data模式');
                console.log('传入的estimate_data:', estimate_data);
                console.log('是否包含thirdLevelItems:', !!estimate_data.thirdLevelItems);
                if (!existingEstimate) {
                    return res.status(404).json({
                        success: false,
                        error: '请先生成投资估算'
                    });
                }
                // 直接更新estimate_data字段
                const savedEstimate = await InvestmentEstimateModel.update(existingEstimate.id, {
                    estimate_data: estimate_data
                });
                if (!savedEstimate) {
                    return res.status(500).json({
                        success: false,
                        error: '保存投资估算失败'
                    });
                }
                console.log('✅ estimate_data已更新');
                return res.json({
                    success: true,
                    data: { estimate: savedEstimate }
                });
            }
            // 模式2：传统模式，根据费用参数计算
            if (!construction_cost && !equipment_cost && !installation_cost && !other_cost && !land_cost) {
                return res.status(400).json({
                    success: false,
                    error: '请传入estimate_data或费用参数'
                });
            }
            const estimateParams = {
                constructionCost: construction_cost || 0,
                equipmentCost: equipment_cost || 0,
                installationCost: installation_cost || 0,
                otherCost: other_cost || 0,
                landCost: land_cost || 0,
                basicReserveRate: basic_reserve_rate,
                priceReserveRate: price_reserve_rate,
                constructionPeriod: construction_period,
                loanRate: loan_rate,
                customLoanAmount: custom_loan_amount
            };
            const estimateResult = estimateInvestment(estimateParams);
            // 保留原有的三级子项数据
            let existingThirdLevelItems = {};
            if (existingEstimate && existingEstimate.estimate_data && existingEstimate.estimate_data.thirdLevelItems) {
                existingThirdLevelItems = existingEstimate.estimate_data.thirdLevelItems;
                console.log('保存时保留原有三级子项数据:', existingThirdLevelItems);
            }
            const estimateDataToSave = {
                project_id,
                construction_cost: construction_cost || 0,
                equipment_cost: equipment_cost || 0,
                installation_cost: installation_cost || 0,
                other_cost: other_cost || 0,
                land_cost: land_cost || 0,
                basic_reserve: estimateResult.basicReserve,
                price_reserve: estimateResult.priceReserve,
                construction_period,
                iteration_count: estimateResult.iterationCount,
                final_total: estimateResult.totalInvestment,
                loan_amount: estimateResult.loanAmount,
                loan_rate: loan_rate,
                custom_loan_amount: custom_loan_amount || undefined,
                estimate_data: {
                    ...estimateResult,
                    thirdLevelItems: existingThirdLevelItems
                },
                total_investment: estimateResult.totalInvestment,
                building_investment: estimateResult.buildingInvestment,
                construction_interest: estimateResult.constructionInterest,
                gap_rate: estimateResult.gapRate
            };
            let savedEstimate;
            if (existingEstimate) {
                savedEstimate = await InvestmentEstimateModel.update(existingEstimate.id, estimateDataToSave);
            }
            else {
                savedEstimate = await InvestmentEstimateModel.create(estimateDataToSave);
            }
            if (!savedEstimate) {
                return res.status(500).json({
                    success: false,
                    error: '保存投资估算失败'
                });
            }
            res.json({
                success: true,
                data: { estimate: savedEstimate }
            });
        }
        catch (error) {
            console.error('保存投资估算失败:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: '输入验证失败',
                    message: error.errors[0].message
                });
            }
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async getByProjectId(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: '项目不存在'
                });
            }
            if (!isAdmin && project.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权访问此项目'
                });
            }
            const estimate = await InvestmentEstimateModel.findByProjectId(projectId);
            res.json({
                success: true,
                data: { estimate }
            });
        }
        catch (error) {
            console.error('获取投资估算失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async generateSummary(req, res) {
        try {
            const { projectId } = req.params;
            const { ai_items, custom_loan_amount, custom_land_cost } = req.body; // 接收AI生成的子项、自定义贷款额、自定义土地费用
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: '项目不存在'
                });
            }
            if (!isAdmin && project.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权访问此项目'
                });
            }
            // 使用自定义贷款额或项目配置的贷款比例
            // 如果没有传入custom_loan_amount，尝试从数据库读取
            let finalCustomLoanAmount = custom_loan_amount;
            let finalCustomLandCost = custom_land_cost;
            let existingThirdLevelItems = {};
            const existingEstimate = await InvestmentEstimateModel.findByProjectId(projectId);
            // 保留原有的三级子项数据
            if (existingEstimate && existingEstimate.estimate_data && existingEstimate.estimate_data.thirdLevelItems) {
                existingThirdLevelItems = existingEstimate.estimate_data.thirdLevelItems;
                console.log('保留原有三级子项数据:', existingThirdLevelItems);
            }
            if (finalCustomLoanAmount === undefined || finalCustomLandCost === undefined) {
                if (existingEstimate) {
                    if (finalCustomLoanAmount === undefined && existingEstimate.custom_loan_amount !== null) {
                        finalCustomLoanAmount = existingEstimate.custom_loan_amount;
                        console.log('从数据库读取自定义贷款额:', finalCustomLoanAmount);
                    }
                    if (finalCustomLandCost === undefined && existingEstimate.custom_land_cost !== null) {
                        finalCustomLandCost = existingEstimate.custom_land_cost;
                        console.log('从数据库读取自定义土地费用:', finalCustomLandCost);
                    }
                }
            }
            const customLoanRatio = finalCustomLoanAmount ? undefined : project.loan_ratio;
            const landCost = finalCustomLandCost !== undefined ? finalCustomLandCost : (project.land_cost || 0);
            console.log('计算参数:', {
                customLoanRatio,
                landCost,
                finalCustomLoanAmount,
                finalCustomLandCost
            });
            // 使用统一循环迭代算法生成投资估算简表
            const result = calculateInvestmentEstimate({
                projectName: project.project_name,
                targetInvestment: project.total_investment,
                constructionYears: project.construction_years,
                operationYears: project.operation_years,
                loanRatio: customLoanRatio,
                loanInterestRate: project.loan_interest_rate,
                landCost: landCost,
                aiGeneratedItems: ai_items, // 传递AI生成的子项
                customLoanAmount: finalCustomLoanAmount // 传递自定义贷款额
            });
            // 辅助函数：确保数值有效并格式化
            const toDecimal = (val) => {
                const num = Number(val);
                if (isNaN(num) || !isFinite(num))
                    return 0;
                return Math.round(num * 100) / 100; // 保留两位小数
            };
            // 保存到数据库
            const estimateData = {
                project_id: projectId,
                estimate_data: {
                    ...result,
                    thirdLevelItems: existingThirdLevelItems // 保留原有的三级子项数据
                },
                total_investment: toDecimal(result.partG.合计),
                building_investment: toDecimal(result.partE.合计),
                construction_interest: toDecimal(result.partF.合计),
                gap_rate: toDecimal(result.gapRate / 100), // 数据库存储小数形式
                // 从 partA.children 汇总提取各项费用
                construction_cost: toDecimal(result.partA.children?.reduce((sum, item) => sum + (item.建设工程费 || 0), 0) || 0),
                equipment_cost: toDecimal(result.partA.children?.reduce((sum, item) => sum + (item.设备购置费 || 0), 0) || 0),
                installation_cost: toDecimal(result.partA.children?.reduce((sum, item) => sum + (item.安装工程费 || 0), 0) || 0),
                other_cost: toDecimal(result.partA.children?.reduce((sum, item) => sum + (item.其它费用 || 0), 0) || 0),
                land_cost: toDecimal(landCost),
                basic_reserve: toDecimal(result.partD.合计),
                price_reserve: 0,
                construction_period: project.construction_years,
                iteration_count: result.iterationCount,
                final_total: toDecimal(result.partG.合计),
                loan_amount: toDecimal(result.partF.贷款总额),
                loan_rate: toDecimal(project.loan_interest_rate),
                custom_loan_amount: finalCustomLoanAmount !== undefined ? toDecimal(finalCustomLoanAmount) : null,
                custom_land_cost: finalCustomLandCost !== undefined ? toDecimal(finalCustomLandCost) : null
            };
            let savedEstimate;
            if (existingEstimate) {
                console.log('更新现有投资估算，ID:', existingEstimate.id);
                savedEstimate = await InvestmentEstimateModel.update(existingEstimate.id, estimateData);
            }
            else {
                console.log('创建新投资估算');
                savedEstimate = await InvestmentEstimateModel.create(estimateData);
            }
            if (!savedEstimate) {
                return res.status(500).json({
                    success: false,
                    error: '保存投资估算失败'
                });
            }
            res.json({
                success: true,
                data: {
                    estimate: savedEstimate,
                    summary: result
                }
            });
        }
        catch (error) {
            console.error('生成投资估算简表失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
}
//# sourceMappingURL=investmentController.js.map