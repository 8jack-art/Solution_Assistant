import { z } from 'zod';
import { InvestmentProjectModel } from '../models/InvestmentProject.js';
import { InvestmentEstimateModel } from '../models/InvestmentEstimate.js';
const createProjectSchema = z.object({
    project_name: z.string().min(1, '项目名称不能为空'),
    total_investment: z.coerce.number().positive('总投资必须大于0'),
    project_info: z.string().optional(),
    construction_years: z.coerce.number().int().min(1).max(10).default(3),
    operation_years: z.coerce.number().int().min(1).max(50).default(20),
    loan_ratio: z.coerce.number().min(0).max(1).default(0.7),
    loan_interest_rate: z.coerce.number().min(0).max(1).default(0.049),
    construction_unit: z.string().optional(),
    location: z.string().optional(), // 项目地点
    project_type: z.string().optional(), // 项目类型（曾用名：所属行业）
    // 用地信息字段 - 与前端字段名匹配
    land_mode: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
    land_area: z.coerce.number().optional(),
    land_unit_price: z.coerce.number().optional(),
    land_lease_area: z.coerce.number().optional(),
    land_lease_unit_price: z.coerce.number().optional(),
    land_purchase_area: z.coerce.number().optional(),
    land_purchase_unit_price: z.coerce.number().optional(),
    land_cost: z.coerce.number().optional(),
    land_remark: z.string().optional(),
    seedling_compensation: z.coerce.number().optional(),
    lease_seedling_compensation: z.coerce.number().optional(),
});
const updateProjectSchema = createProjectSchema.partial();
const updateStatusSchema = z.object({
    status: z.enum(['draft', 'completed']),
});
export class ProjectController {
    static async create(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const projectData = createProjectSchema.parse(req.body);
            // 确保所有必需字段都正确传递给模型
            const project = await InvestmentProjectModel.create({
                project_name: projectData.project_name,
                total_investment: projectData.total_investment,
                project_info: projectData.project_info || null,
                construction_years: projectData.construction_years,
                operation_years: projectData.operation_years,
                loan_ratio: projectData.loan_ratio,
                loan_interest_rate: projectData.loan_interest_rate,
                construction_unit: projectData.construction_unit || '',
                location: projectData.location || '', // 项目地点
                project_type: projectData.project_type || '', // 项目类型
                user_id: userId,
                status: 'draft',
                is_locked: false,
                // 设置默认值以满足类型要求
                land_mode: projectData.land_mode || 'A',
                land_area: projectData.land_area || 0,
                land_unit_price: projectData.land_unit_price || 0,
                land_lease_area: projectData.land_lease_area || 0,
                land_lease_unit_price: projectData.land_lease_unit_price || 0,
                land_purchase_area: projectData.land_purchase_area || 0,
                land_purchase_unit_price: projectData.land_purchase_unit_price || 0,
                land_cost: projectData.land_cost || 0,
                land_remark: projectData.land_remark || null,
                seedling_compensation: projectData.seedling_compensation || 0,
                lease_seedling_compensation: projectData.lease_seedling_compensation || 0,
                locked_at: null
            });
            if (!project) {
                return res.status(500).json({
                    success: false,
                    error: '创建项目失败'
                });
            }
            res.status(201).json({
                success: true,
                data: { project }
            });
        }
        catch (error) {
            console.error('创建项目失败:', error);
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
    static async getByUserId(req, res) {
        try {
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId && !isAdmin) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const targetUserId = isAdmin ? undefined : userId;
            const projects = await InvestmentProjectModel.findByUserId(targetUserId || '', isAdmin || false);
            res.json({
                success: true,
                data: { projects }
            });
        }
        catch (error) {
            console.error('获取项目列表失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(id);
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
            const estimate = await InvestmentEstimateModel.findByProjectId(id);
            res.json({
                success: true,
                data: {
                    project,
                    estimate
                }
            });
        }
        catch (error) {
            console.error('获取项目详情失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: '项目不存在'
                });
            }
            if (!isAdmin && project.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权修改此项目'
                });
            }
            if (project.is_locked) {
                return res.status(403).json({
                    success: false,
                    error: '项目已锁定，无法修改'
                });
            }
            const updates = createProjectSchema.partial().parse(req.body);
            const updatedProject = await InvestmentProjectModel.update(id, updates);
            if (!updatedProject) {
                return res.status(500).json({
                    success: false,
                    error: '更新项目失败'
                });
            }
            res.json({
                success: true,
                data: { project: updatedProject }
            });
        }
        catch (error) {
            console.error('更新项目失败:', error);
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
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: '项目不存在'
                });
            }
            if (!isAdmin && project.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权修改此项目'
                });
            }
            const { status } = updateStatusSchema.parse(req.body);
            const updatedProject = await InvestmentProjectModel.updateStatus(id, status);
            if (!updatedProject) {
                return res.status(500).json({
                    success: false,
                    error: '更新项目状态失败'
                });
            }
            res.json({
                success: true,
                data: { project: updatedProject }
            });
        }
        catch (error) {
            console.error('更新项目状态失败:', error);
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
    static async lock(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(id);
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
            const lockedProject = await InvestmentProjectModel.lock(id);
            if (!lockedProject) {
                return res.status(500).json({
                    success: false,
                    error: '锁定项目失败'
                });
            }
            res.json({
                success: true,
                data: { project: lockedProject }
            });
        }
        catch (error) {
            console.error('锁定项目失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async unlock(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(id);
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
            const unlockedProject = await InvestmentProjectModel.unlock(id);
            if (!unlockedProject) {
                return res.status(500).json({
                    success: false,
                    error: '解锁项目失败'
                });
            }
            res.json({
                success: true,
                data: { project: unlockedProject }
            });
        }
        catch (error) {
            console.error('解锁项目失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const isAdmin = req.user?.isAdmin;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: '用户未认证'
                });
            }
            const project = await InvestmentProjectModel.findById(id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: '项目不存在'
                });
            }
            if (!isAdmin && project.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权删除此项目'
                });
            }
            if (project.is_locked) {
                return res.status(403).json({
                    success: false,
                    error: '项目已锁定，无法删除'
                });
            }
            const deleted = await InvestmentProjectModel.delete(id);
            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    error: '删除项目失败'
                });
            }
            res.json({
                success: true,
                message: '项目删除成功'
            });
        }
        catch (error) {
            console.error('删除项目失败:', error);
            res.status(500).json({
                success: false,
                error: '服务器内部错误'
            });
        }
    }
}
//# sourceMappingURL=projectController.js.map