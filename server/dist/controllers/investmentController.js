import { z } from 'zod';
import { InvestmentProjectModel } from '../models/InvestmentProject.js';
import { InvestmentEstimateModel } from '../models/InvestmentEstimate.js';
import { estimateInvestment } from '../lib/investmentEstimator.js';
import { calculateInvestmentEstimate } from '../lib/investmentCalculator.js';
const saveEstimateSchema = z.object({
    project_id: z.string(),
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
    estimate_data: z.any().optional(), // 支持完整的estimate_data格式
    // 新增贷款相关数据字段
    construction_interest_details: z.any().optional(), // 建设期利息详情JSON
    loan_repayment_schedule_simple: z.any().optional(), // 还本付息计划简表JSON（等额本金）
    loan_repayment_schedule_detailed: z.any().optional(), // 还本付息计划表JSON（等额本息）
});
const calculateEstimateSchema = saveEstimateSchema.omit({ project_id: true });
export class InvestmentController {
    static async calculate(req, res) {
        try {
            const params = calculateEstimateSchema.parse(req.body);
            const estimateParams = {
                constructionCost: params.construction_cost,
                equipmentCost: params.equipment_cost,
                installationCost: params.installation_cost,
                otherCost: params.other_cost,
                landCost: params.land_cost,
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
            const parsedData = saveEstimateSchema.parse(req.body);
            const { project_id, estimate_data, construction_cost, equipment_cost, installation_cost, other_cost, land_cost, basic_reserve_rate, price_reserve_rate, construction_period, loan_rate, custom_loan_amount, construction_interest_details, loan_repayment_schedule_simple, loan_repayment_schedule_detailed } = parsedData;
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
            let estimateData;
            if (estimate_data) {
                // 如果提供了完整的estimate_data，直接使用它
                estimateData = {
                    project_id,
                    estimate_data,
                    // 从estimate_data中提取关键字段用于兼容性
                    total_investment: estimate_data.partG?.合计 || 0,
                    building_investment: estimate_data.partE?.合计 || 0,
                    construction_interest: estimate_data.partF?.合计 || 0,
                    gap_rate: (estimate_data.gapRate || 0) / 100, // 转换为小数形式
                    construction_cost: estimate_data.partA?.children?.find((i) => i.序号 === '一')?.建设工程费 || 0,
                    equipment_cost: estimate_data.partA?.children?.find((i) => i.序号 === '一')?.设备购置费 || 0,
                    installation_cost: estimate_data.partA?.children?.find((i) => i.序号 === '一')?.安装工程费 || 0,
                    other_cost: estimate_data.partA?.children?.find((i) => i.序号 === '一')?.其它费用 || 0,
                    land_cost: estimate_data.partA?.children?.find((i) => i.序号 === '一')?.土地费用 || 0,
                    basic_reserve: estimate_data.partD?.合计 || 0,
                    price_reserve: 0,
                    construction_period: construction_period,
                    iteration_count: estimate_data.iterationCount || 1,
                    final_total: estimate_data.partG?.合计 || 0,
                    loan_amount: estimate_data.partF?.贷款总额 || 0,
                    loan_rate: loan_rate,
                    custom_loan_amount: custom_loan_amount || undefined,
                    custom_land_cost: undefined,
                    // 新增贷款相关数据字段
                    construction_interest_details,
                    loan_repayment_schedule_simple,
                    loan_repayment_schedule_detailed
                };
            }
            else {
                // 传统模式：使用分离的字段计算
                const estimateParams = {
                    constructionCost: construction_cost,
                    equipmentCost: equipment_cost,
                    installationCost: installation_cost,
                    otherCost: other_cost,
                    landCost: land_cost,
                    basicReserveRate: basic_reserve_rate,
                    priceReserveRate: price_reserve_rate,
                    constructionPeriod: construction_period,
                    loanRate: loan_rate,
                    customLoanAmount: custom_loan_amount
                };
                const estimateResult = estimateInvestment(estimateParams);
                estimateData = {
                    project_id,
                    construction_cost,
                    equipment_cost,
                    installation_cost,
                    other_cost,
                    land_cost,
                    basic_reserve: estimateResult.basicReserve,
                    price_reserve: estimateResult.priceReserve,
                    construction_period,
                    iteration_count: estimateResult.iterationCount,
                    final_total: estimateResult.totalInvestment,
                    loan_amount: estimateResult.loanAmount,
                    loan_rate: loan_rate,
                    custom_loan_amount: custom_loan_amount || undefined,
                    estimate_data: estimateResult,
                    total_investment: estimateResult.totalInvestment,
                    building_investment: estimateResult.buildingInvestment,
                    construction_interest: estimateResult.constructionInterest,
                    gap_rate: estimateResult.gapRate,
                    // 新增贷款相关数据字段
                    construction_interest_details,
                    loan_repayment_schedule_simple,
                    loan_repayment_schedule_detailed
                };
            }
            const existingEstimate = await InvestmentEstimateModel.findByProjectId(project_id);
            let savedEstimate;
            if (existingEstimate) {
                savedEstimate = await InvestmentEstimateModel.update(existingEstimate.id, estimateData);
            }
            else {
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
            // 区分不同类型的错误
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
                return res.status(503).json({
                    success: false,
                    error: '数据库连接失败，请稍后重试'
                });
            }
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async generateSummary(req, res) {
        try {
            const { projectId } = req.params;
            const { ai_items, custom_loan_amount, custom_land_cost, project_type, // 项目类型：agriculture-农业，construction-建筑
            save_after_complete = true // 默认保存
             } = req.body;
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
                finalCustomLandCost,
                saveAfterComplete: save_after_complete
            });
            // 使用统一循环迭代算法生成投资估算简表
            // 注意：整个迭代过程在内存中执行，不会写入数据库
            const result = calculateInvestmentEstimate({
                projectName: project.project_name,
                targetInvestment: project.total_investment,
                constructionYears: project.construction_years,
                operationYears: project.operation_years,
                loanRatio: customLoanRatio,
                loanInterestRate: project.loan_interest_rate,
                landCost: landCost,
                aiGeneratedItems: ai_items, // 传递AI生成的子项
                customLoanAmount: finalCustomLoanAmount, // 传递自定义贷款额
                projectType: project_type // 传递项目类型
            });
            // 合并三级子项数据（如果有）
            if (Object.keys(existingThirdLevelItems).length > 0 && !result.thirdLevelItems) {
                result.thirdLevelItems = existingThirdLevelItems;
            }
            // 生成建设期利息详情
            const constructionInterestDetails = {
                基本信息: {
                    贷款总额: result.partF.贷款总额 || 0,
                    年利率: result.partF.年利率 || 0,
                    建设期年限: project.construction_years,
                    贷款期限: project.operation_years
                },
                分年数据: result.partF.分年利息.map((data, index) => ({
                    年份: index + 1,
                    期初借款余额: index === 0 ? 0 : result.partF.分年利息.slice(0, index).reduce((sum, item) => sum + (item?.当期借款金额 || 0), 0),
                    当期借款金额: data?.当期借款金额 || 0,
                    当期利息: data?.当期利息 || 0,
                    期末借款余额: result.partF.分年利息.slice(0, index + 1).reduce((sum, item) => sum + (item?.当期借款金额 || 0), 0)
                })),
                汇总信息: {
                    总借款金额: result.partF.分年利息.reduce((sum, data) => sum + (data?.当期借款金额 || 0), 0),
                    总利息: result.partF.分年利息.reduce((sum, data) => sum + (data?.当期利息 || 0), 0),
                    期末借款余额: result.partF.分年利息.reduce((sum, data) => sum + (data?.当期借款金额 || 0), 0)
                }
            };
            // 生成还本付息计划简表（等额本金）
            const generateLoanRepaymentScheduleSimple = (constructionInterestDetails, operationYears) => {
                const loanAmount = constructionInterestDetails.基本信息.贷款总额 || 0;
                const annualRate = constructionInterestDetails.基本信息.年利率 || 0;
                const totalInterest = constructionInterestDetails.汇总信息.总利息 || 0;
                // 计算运营期还款计划（等额本金）
                const yearlyPrincipal = operationYears > 0 ? loanAmount / operationYears : 0;
                const repaymentSchedule = [];
                let remainingPrincipal = loanAmount;
                for (let year = 1; year <= operationYears; year++) {
                    const beginningBalance = remainingPrincipal;
                    const principalPayment = Math.min(yearlyPrincipal, remainingPrincipal); // 确保最后一年还清
                    const interestPayment = remainingPrincipal * annualRate;
                    const totalPayment = principalPayment + interestPayment;
                    remainingPrincipal -= principalPayment;
                    const endingBalance = Math.max(0, remainingPrincipal);
                    repaymentSchedule.push({
                        年份: year,
                        期初借款余额: beginningBalance,
                        当期还本: principalPayment,
                        当期付息: interestPayment,
                        当期还本付息: totalPayment,
                        期末借款余额: endingBalance
                    });
                }
                return {
                    基本信息: {
                        贷款总额: loanAmount,
                        年利率: annualRate,
                        贷款期限: operationYears,
                        还款方式: '等额本金'
                    },
                    还款计划: repaymentSchedule
                };
            };
            const loanRepaymentScheduleSimple = generateLoanRepaymentScheduleSimple(constructionInterestDetails, project.operation_years);
            // 辅助函数：确保数值有效并格式化
            const toDecimal = (val) => {
                const num = Number(val);
                if (isNaN(num) || !isFinite(num))
                    return 0;
                return Math.round(num * 100) / 100; // 保留两位小数
            };
            // 只有在迭代完成后且需要保存时，才写入数据库
            let savedEstimate = null;
            if (save_after_complete) {
                console.log('[投资估算] 迭代完成，开始保存最终结果（仅一次）');
                const estimateData = {
                    project_id: projectId,
                    estimate_data: result,
                    total_investment: toDecimal(result.partG.合计),
                    building_investment: toDecimal(result.partE.合计),
                    construction_interest: toDecimal(result.partF.合计),
                    gap_rate: toDecimal(result.gapRate / 100), // 数据库存储小数形式
                    construction_cost: toDecimal(result.partA.children?.find((i) => i.序号 === '一')?.建设工程费 || 0),
                    equipment_cost: toDecimal(result.partA.children?.find((i) => i.序号 === '一')?.设备购置费 || 0),
                    installation_cost: toDecimal(result.partA.children?.find((i) => i.序号 === '一')?.安装工程费 || 0),
                    other_cost: toDecimal(result.partA.children?.find((i) => i.序号 === '一')?.其它费用 || 0),
                    land_cost: toDecimal(landCost),
                    basic_reserve: toDecimal(result.partD.合计),
                    price_reserve: 0,
                    construction_period: project.construction_years,
                    iteration_count: result.iterationCount,
                    final_total: toDecimal(result.partG.合计),
                    loan_amount: toDecimal(result.partF.贷款总额),
                    loan_rate: toDecimal(project.loan_interest_rate),
                    custom_loan_amount: finalCustomLoanAmount !== undefined ? toDecimal(finalCustomLoanAmount) : null,
                    custom_land_cost: finalCustomLandCost !== undefined ? toDecimal(finalCustomLandCost) : null,
                    construction_interest_details: constructionInterestDetails,
                    loan_repayment_schedule_simple: loanRepaymentScheduleSimple,
                    loan_repayment_schedule_detailed: req.body.loan_repayment_schedule_detailed || null
                };
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
                console.log('[投资估算] 最终结果已保存到数据库');
            }
            else {
                console.log('[投资估算] 迭代完成，未保存（仅计算模式）');
            }
            res.json({
                success: true,
                data: {
                    estimate: savedEstimate,
                    summary: result,
                    saved: save_after_complete // 告知前端是否已保存
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