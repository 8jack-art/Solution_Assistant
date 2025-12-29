import { z } from 'zod';
import { pool } from '../db/config.js';
import { InvestmentProjectModel } from '../models/InvestmentProject.js';
import { LLMService, analyzeRevenueStructurePrompt, analyzePricingPrompt, generateRevenueItemsPrompt, estimateSingleRevenueItemPrompt } from '../lib/llm.js';
import { LLMConfigModel } from '../models/LLMConfig.js';
/**
 * 保存请求的验证Schema
 */
const saveRevenueCostSchema = z.object({
    project_id: z.string(),
    calculation_period: z.number().int().min(1).optional(),
    operation_period: z.number().int().min(1).optional(),
    workflow_step: z.enum(['period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done']).optional(),
    model_data: z.any().optional(), // 完整的建模数据
    ai_analysis_result: z.any().optional(), // AI分析结果
    is_completed: z.boolean().optional()
});
/**
 * AI推荐请求Schema
 */
const aiRecommendSchema = z.object({
    projectInfo: z.string().optional(),
    engineeringItems: z.array(z.object({
        name: z.string(),
        amount: z.number()
    })).optional()
});
/**
 * 收入成本建模控制器
 */
export class RevenueCostController {
    /**
     * 保存收入成本建模数据
     */
    static async save(req, res) {
        try {
            console.log('🔹 [save] 请求开始');
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            // 先提取原始数据，避免Zod验证失败
            const { project_id, calculation_period, operation_period, workflow_step, model_data, ai_analysis_result, is_completed } = req.body;
            console.log('🔹 [save] project_id:', project_id);
            console.log('🔹 [save] workflow_step:', workflow_step);
            console.log('🔹 [save] ai_analysis_result 存在:', !!ai_analysis_result);
            // 验证必填字段
            if (!project_id) {
                return res.status(400).json({
                    success: false,
                    error: 'project_id 为必填字段'
                });
            }
            // 验证项目存在且有权限
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
            // 检查是否已存在记录
            const [existing] = await pool.execute('SELECT id FROM revenue_cost_estimates WHERE project_id = ?', [project_id]);
            let result;
            if (existing && existing.length > 0) {
                // 更新现有记录
                const updateFields = [];
                const updateValues = [];
                if (calculation_period !== undefined) {
                    updateFields.push('calculation_period = ?');
                    updateValues.push(calculation_period);
                }
                if (operation_period !== undefined) {
                    updateFields.push('operation_period = ?');
                    updateValues.push(operation_period);
                }
                if (workflow_step !== undefined) {
                    updateFields.push('workflow_step = ?');
                    updateValues.push(workflow_step);
                }
                if (model_data !== undefined) {
                    updateFields.push('model_data = ?');
                    updateValues.push(JSON.stringify(model_data));
                }
                if (ai_analysis_result !== undefined) {
                    try {
                        // 尝试更新ai_analysis_result，如果字段不存在则跳过
                        updateFields.push('ai_analysis_result = ?');
                        updateValues.push(JSON.stringify(ai_analysis_result));
                    }
                    catch (err) {
                        console.warn('⚠️ ai_analysis_result字段可能不存在，跳过保存');
                    }
                }
                if (is_completed !== undefined) {
                    updateFields.push('is_completed = ?');
                    updateValues.push(is_completed);
                }
                if (updateFields.length === 0) {
                    // 没有需要更新的字段
                    return res.json({
                        success: true,
                        data: { estimate: existing[0] }
                    });
                }
                updateFields.push('updated_at = NOW()');
                updateValues.push(existing[0].id);
                try {
                    await pool.execute(`UPDATE revenue_cost_estimates SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
                    console.log('✅ 数据更新成功');
                }
                catch (updateError) {
                    console.error('❌ UPDATE失败:', updateError.message);
                    // 如果是ai_analysis_result字段不存在，移除它后重试
                    if (updateError.code === 'ER_BAD_FIELD_ERROR' && ai_analysis_result !== undefined) {
                        console.log('🔄 移除ai_analysis_result后重试...');
                        const retryFields = updateFields.filter(f => !f.includes('ai_analysis_result'));
                        const retryValues = updateValues.slice();
                        const aiIndex = updateFields.findIndex(f => f.includes('ai_analysis_result'));
                        if (aiIndex >= 0)
                            retryValues.splice(aiIndex, 1);
                        await pool.execute(`UPDATE revenue_cost_estimates SET ${retryFields.join(', ')} WHERE id = ?`, retryValues);
                        console.log('✅ 重试成功（跳过ai_analysis_result）');
                    }
                    else {
                        throw updateError;
                    }
                }
                result = existing[0];
            }
            else {
                // 创建新记录
                try {
                    const [insertResult] = await pool.execute(`INSERT INTO revenue_cost_estimates 
             (project_id, calculation_period, operation_period, workflow_step, model_data, ai_analysis_result, is_completed) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                        project_id,
                        calculation_period || project.construction_years + project.operation_years,
                        operation_period || project.operation_years,
                        workflow_step || 'period',
                        model_data ? JSON.stringify(model_data) : null,
                        ai_analysis_result ? JSON.stringify(ai_analysis_result) : null,
                        is_completed || false
                    ]);
                    result = { id: insertResult.insertId };
                    console.log('✅ 创建新记录成功');
                }
                catch (insertError) {
                    console.error('❌ INSERT失败:', insertError.message);
                    // 如果是ai_analysis_result字段不存在，不包含该字段后重试
                    if (insertError.code === 'ER_BAD_FIELD_ERROR') {
                        console.log('🔄 不包含ai_analysis_result字段后重试...');
                        const [retryResult] = await pool.execute(`INSERT INTO revenue_cost_estimates 
               (project_id, calculation_period, operation_period, workflow_step, model_data, is_completed) 
               VALUES (?, ?, ?, ?, ?, ?)`, [
                            project_id,
                            calculation_period || project.construction_years + project.operation_years,
                            operation_period || project.operation_years,
                            workflow_step || 'period',
                            model_data ? JSON.stringify(model_data) : null,
                            is_completed || false
                        ]);
                        result = { id: retryResult.insertId };
                        console.log('✅ 重试成功（跳过ai_analysis_result）');
                    }
                    else {
                        throw insertError;
                    }
                }
            }
            res.json({
                success: true,
                data: { estimate: result }
            });
        }
        catch (error) {
            console.error('❌ 保存收入成本建模数据失败:', error);
            console.error('❌ 错误详情:', error.message);
            console.error('❌ 错误堆栈:', error.stack);
            if (error instanceof z.ZodError) {
                console.error('❌ Zod验证错误:', error.errors);
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
    /**
     * 根据项目ID获取收入成本建模数据
     */
    static async getByProjectId(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            const { projectId } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            // 验证项目存在且有权限
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
                    error: '无权查看此项目'
                });
            }
            // 查询收入成本估算数据
            const [estimates] = await pool.execute('SELECT * FROM revenue_cost_estimates WHERE project_id = ?', [projectId]);
            if (!estimates || estimates.length === 0) {
                return res.json({
                    success: true,
                    data: { estimate: null }
                });
            }
            const estimate = estimates[0];
            // 解析JSON字段
            if (estimate.model_data && typeof estimate.model_data === 'string') {
                estimate.model_data = JSON.parse(estimate.model_data);
            }
            if (estimate.ai_analysis_result && typeof estimate.ai_analysis_result === 'string') {
                estimate.ai_analysis_result = JSON.parse(estimate.ai_analysis_result);
            }
            if (estimate.validation_errors && typeof estimate.validation_errors === 'string') {
                estimate.validation_errors = JSON.parse(estimate.validation_errors);
            }
            res.json({
                success: true,
                data: { estimate }
            });
        }
        catch (error) {
            console.error('获取收入成本建模数据失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    /**
     * AI推荐营收结构
     */
    static async aiRecommend(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            const { projectId } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const params = aiRecommendSchema.parse(req.body);
            // 验证项目存在且有权限
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
                    error: '无权操作此项目'
                });
            }
            // 获取默认LLM配置
            const llmConfig = await LLMConfigModel.findDefaultByUserId(userId);
            if (!llmConfig) {
                return res.status(400).json({
                    success: false,
                    error: '未找到可用的LLM配置，请先配置LLM服务'
                });
            }
            // 准备工程项数据（如果有）
            const engineeringItems = (params.engineeringItems || [])
                .filter(item => item.name !== undefined && item.amount !== undefined)
                .map(item => ({
                name: item.name,
                amount: item.amount
            }));
            // 构建LLM提示
            const messages = analyzeRevenueStructurePrompt(project.project_name, params.projectInfo || project.project_info || '', project.total_investment, engineeringItems);
            console.log('🤖 调用LLM分析营收结构...');
            console.log('配置:', llmConfig.name);
            console.log('项目:', project.project_name);
            // 调用LLM服务
            const llmResponse = await LLMService.generateContent(llmConfig, messages, {
                maxTokens: 4000, // 增加到4000，避免JSON被截断
                temperature: 0.7
            });
            if (!llmResponse.success || !llmResponse.content) {
                console.error('❌ LLM调用失败:', llmResponse.error);
                return res.status(500).json({
                    success: false,
                    error: `AI分析失败: ${llmResponse.error || '未知错误'}`
                });
            }
            // 解析LLM返回的JSON
            let analysisResult;
            try {
                // 提取JSON内容（移除可能的markdown标记）
                let jsonContent = llmResponse.content.trim();
                if (jsonContent.startsWith('```json')) {
                    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
                }
                else if (jsonContent.startsWith('```')) {
                    jsonContent = jsonContent.replace(/```\n?/g, '');
                }
                // 尝试修复不完整的JSON（只修复简单的情况）
                jsonContent = jsonContent.trim();
                // 如果缺少右大括号，尝试添加
                if (!jsonContent.endsWith('}')) {
                    console.warn('⚠️ JSON可能不完整，尝试修复...');
                    // 找到最后一个完整的对象
                    const lastCompleteIndex = jsonContent.lastIndexOf('}]');
                    if (lastCompleteIndex > 0) {
                        jsonContent = jsonContent.substring(0, lastCompleteIndex + 2) + '}';
                        console.log('✅ 修复JSON成功');
                    }
                }
                analysisResult = JSON.parse(jsonContent);
                console.log('✅ LLM分析成功，返回', analysisResult.total_categories, '个类别');
            }
            catch (parseError) {
                console.error('❌ 解析LLM响应失败:', parseError.message);
                console.error('解析错误详情:', parseError);
                console.error('原始LLM响应前500字符:', llmResponse.content.substring(0, 500));
                console.error('原始LLM响应后500字符:', llmResponse.content.substring(llmResponse.content.length - 500));
                console.error('完整响应长度:', llmResponse.content.length);
                return res.status(500).json({
                    success: false,
                    error: `AI返回格式错误: ${parseError.message}，响应长度${llmResponse.content.length}字符，请重试`
                });
            }
            // 返回分析结果
            res.json({
                success: true,
                data: {
                    analysis: analysisResult,
                    config_name: llmConfig.name
                }
            });
        }
        catch (error) {
            console.error('AI推荐失败:', error);
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
    /**
     * AI分析税率和计费模式
     */
    static async analyzePricing(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const { type_name } = req.body;
            if (!type_name) {
                return res.status(400).json({
                    success: false,
                    error: '缺少营业收入类型名称'
                });
            }
            // 获取默认LLM配置
            const llmConfig = await LLMConfigModel.findDefaultByUserId(userId);
            if (!llmConfig) {
                return res.status(400).json({
                    success: false,
                    error: '未找到可用的LLM配置，请先配置LLM服务'
                });
            }
            // 构建LLM提示
            const messages = analyzePricingPrompt(type_name);
            console.log('🤖 调用LLM分析税率和计费模式...');
            console.log('收入类型:', type_name);
            // 调用LLM服务
            const llmResponse = await LLMService.generateContent(llmConfig, messages, {
                maxTokens: 500,
                temperature: 0.5
            });
            if (!llmResponse.success || !llmResponse.content) {
                console.error('❌ LLM调用失败:', llmResponse.error);
                return res.status(500).json({
                    success: false,
                    error: `AI分析失败: ${llmResponse.error || '未知错误'}`
                });
            }
            // 解析LLM返回的JSON
            let pricingResult;
            try {
                let jsonContent = llmResponse.content.trim();
                if (jsonContent.startsWith('```json')) {
                    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
                }
                else if (jsonContent.startsWith('```')) {
                    jsonContent = jsonContent.replace(/```\n?/g, '');
                }
                pricingResult = JSON.parse(jsonContent);
                console.log('✅ LLM分析成功:', pricingResult);
            }
            catch (parseError) {
                console.error('❌ 解析LLM响应失败:', parseError.message);
                return res.status(500).json({
                    success: false,
                    error: `AI返回格式错误: ${parseError.message}`
                });
            }
            // 返回分析结果
            res.json({
                success: true,
                data: pricingResult
            });
        }
        catch (error) {
            console.error('AI分析税率计费模式失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    /**
     * AI生成收入项目表
     */
    static async generateItems(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            const { projectId } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const { revenueStructure, investmentData } = req.body;
            if (!revenueStructure || !investmentData) {
                return res.status(400).json({
                    success: false,
                    error: '缺少必要参数'
                });
            }
            // 验证项目存在且有权限
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
                    error: '无权操作此项目'
                });
            }
            // 获取默认LLM配置
            const llmConfig = await LLMConfigModel.findDefaultByUserId(userId);
            if (!llmConfig) {
                return res.status(400).json({
                    success: false,
                    error: '未找到可用的LLM配置，请先配置LLM服务'
                });
            }
            // 构建营收结构摘要
            const revenueSummary = revenueStructure.selected_categories
                .map((cat) => {
                const types = cat.recommended_revenue_types
                    .map((t) => t.type_name)
                    .join('、');
                return `${cat.category_name}：${types}`;
            })
                .join('\n');
            // 构建项目信息
            const projectInfo = {
                name: project.project_name,
                description: project.project_info || '',
                totalInvestment: investmentData.total_investment || project.total_investment,
                constructionYears: investmentData.construction_years || project.construction_years,
                operationYears: investmentData.operation_years || project.operation_years,
                constructionCost: investmentData.construction_cost,
                equipmentCost: investmentData.equipment_cost
            };
            // 构建LLM提示
            const messages = generateRevenueItemsPrompt(projectInfo, revenueSummary);
            console.log('🤖 调用LLM生成收入项目表...');
            console.log('项目:', project.project_name);
            // 调用LLM服务
            const llmResponse = await LLMService.generateContent(llmConfig, messages, {
                maxTokens: 2000,
                temperature: 0.7
            });
            if (!llmResponse.success || !llmResponse.content) {
                console.error('❌ LLM调用失败:', llmResponse.error);
                return res.status(500).json({
                    success: false,
                    error: `AI生成失败: ${llmResponse.error || '未知错误'}`
                });
            }
            // 解析LLM返回的JSON
            let itemsResult;
            try {
                let jsonContent = llmResponse.content.trim();
                // 移除markdown代码块标记
                if (jsonContent.startsWith('```json')) {
                    jsonContent = jsonContent.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
                }
                else if (jsonContent.startsWith('```')) {
                    jsonContent = jsonContent.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
                }
                // 移除可能的前后空白和注释
                jsonContent = jsonContent.trim();
                // 尝试解析JSON
                itemsResult = JSON.parse(jsonContent);
                // 验证返回格式
                if (!itemsResult.revenue_items || !Array.isArray(itemsResult.revenue_items)) {
                    throw new Error('返回格式错误：缺少 revenue_items 数组');
                }
                console.log('✅ LLM生成成功，返回', itemsResult.revenue_items.length, '个收入项');
            }
            catch (parseError) {
                console.error('❌ 解析LLM响应失败:', parseError.message);
                console.error('原LLM输出:', llmResponse.content);
                return res.status(500).json({
                    success: false,
                    error: `AI返回格式错误: ${parseError.message}`
                });
            }
            // 返回生成结果
            res.json({
                success: true,
                data: itemsResult
            });
        }
        catch (error) {
            console.error('AI生成收入项目失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    /**
     * 估算单个收入项
     */
    static async estimateItem(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            const { projectId } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const { itemName } = req.body;
            if (!itemName) {
                return res.status(400).json({
                    success: false,
                    error: '缺少收入项名称'
                });
            }
            // 验证项目存在且有权限
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
                    error: '无权操作此项目'
                });
            }
            // 获取默认LLM配置
            const llmConfig = await LLMConfigModel.findDefaultByUserId(userId);
            if (!llmConfig) {
                return res.status(400).json({
                    success: false,
                    error: '未找到可用的LLM配置，请先配置LLM服务'
                });
            }
            // 构建项目信息
            const projectInfo = {
                name: project.project_name,
                description: project.project_info || '',
                totalInvestment: project.total_investment,
                constructionYears: project.construction_years,
                operationYears: project.operation_years,
            };
            // 构建LLM提示
            const messages = estimateSingleRevenueItemPrompt(projectInfo, itemName);
            console.log('🤖 调用LLM估算收入项...');
            console.log('项目:', project.project_name, ', 收入项:', itemName);
            // 调用LLM服务
            const llmResponse = await LLMService.generateContent(llmConfig, messages, {
                maxTokens: 500,
                temperature: 0.7
            });
            if (!llmResponse.success || !llmResponse.content) {
                console.error('❌ LLM调用失败:', llmResponse.error);
                return res.status(500).json({
                    success: false,
                    error: `AI估算失败: ${llmResponse.error || '未知错误'}`
                });
            }
            // 解析LLM返回的JSON
            let estimateResult;
            try {
                let jsonContent = llmResponse.content.trim();
                // 移除markdown代码块标记
                if (jsonContent.startsWith('```json')) {
                    jsonContent = jsonContent.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
                }
                else if (jsonContent.startsWith('```')) {
                    jsonContent = jsonContent.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
                }
                jsonContent = jsonContent.trim();
                estimateResult = JSON.parse(jsonContent);
                console.log('✅ LLM估算成功');
            }
            catch (parseError) {
                console.error('❌ 解析LLM响应失败:', parseError.message);
                console.error('原LLM输出:', llmResponse.content);
                return res.status(500).json({
                    success: false,
                    error: `AI返回格式错误: ${parseError.message}`
                });
            }
            // 返回估算结果
            res.json({
                success: true,
                data: estimateResult
            });
        }
        catch (error) {
            console.error('AI估算收入项失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    /**
     * 更新工作流步骤
     */
    static async updateWorkflowStep(req, res) {
        try {
            const userId = req.user?.userId;
            const { projectId } = req.params;
            const { step } = req.body;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const validSteps = ['period', 'suggest', 'revenue', 'cost', 'profit', 'validate', 'done'];
            if (!validSteps.includes(step)) {
                return res.status(400).json({
                    success: false,
                    error: '无效的工作流步骤'
                });
            }
            await pool.execute('UPDATE revenue_cost_estimates SET workflow_step = ?, updated_at = NOW() WHERE project_id = ?', [step, projectId]);
            res.json({
                success: true,
                data: { step }
            });
        }
        catch (error) {
            console.error('更新工作流步骤失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    /**
     * 删除收入成本建模数据
     */
    static async delete(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            const { id } = req.params;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            // 查询估算记录
            const [estimates] = await pool.execute('SELECT project_id FROM revenue_cost_estimates WHERE id = ?', [id]);
            if (!estimates || estimates.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: '记录不存在'
                });
            }
            const projectId = estimates[0].project_id;
            // 验证权限
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
                    error: '无权删除此记录'
                });
            }
            // 删除记录（会级联删除相关的revenue_items, cost_items, production_rates）
            await pool.execute('DELETE FROM revenue_cost_estimates WHERE id = ?', [id]);
            res.json({
                success: true,
                data: { id }
            });
        }
        catch (error) {
            console.error('删除收入成本建模数据失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
}
//# sourceMappingURL=revenueCostController.js.map